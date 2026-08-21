const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const MAX_BODY_BYTES = 160_000;
const DEFAULT_MODEL = "gemini-3.5-flash";
const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];
const USE_GOOGLE_SEARCH = process.env.GEMINI_DISABLE_SEARCH !== "1";
const STATUS_TTL_MS = 60_000;

let courseDataCache;
let statusCache;

module.exports = async function aiHandler(req, res) {
  if (req.method === "GET") {
    sendJson(res, 200, await aiStatus());
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const payload = await readJson(req);
    const result = await generateAiReply(payload);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 200, {
      ok: false,
      provider: "AI connection failed",
      error: safeError(error),
      errorType: classifyAiError(error)
    });
  }
};

async function generateAiReply(payload = {}) {
  const apiKey = configuredApiKey();
  if (!apiKey) {
    return {
      ok: false,
      provider: "AI not connected",
      error: "GEMINI_API_KEY is not configured",
      errorType: "missing_key"
    };
  }

  const connection = await getConnectionCheck(apiKey);
  if (!connection.ok && isHardSetupError(connection.error)) {
    throw new Error(connection.error || "Gemini connection check failed");
  }

  const attempts = modelCandidates(connection.ok ? connection.model : primaryModel());
  let lastError;
  for (const model of attempts) {
    try {
      const response = await callGemini({
        apiKey,
        model,
        payload,
        useSearch: USE_GOOGLE_SEARCH
      });
      return await finaliseGeminiReply({ apiKey, model, payload, response, useSearch: response.searchUsed });
    } catch (error) {
      lastError = error;
      if (shouldRetryWithoutSearch(error) && USE_GOOGLE_SEARCH) {
        try {
          const response = await callGemini({ apiKey, model, payload, useSearch: false });
          return await finaliseGeminiReply({ apiKey, model, payload, response, useSearch: false });
        } catch (retryError) {
          lastError = retryError;
        }
      }
      if (!isModelUnavailable(error)) break;
    }
  }
  throw lastError || new Error("Gemini request failed");
}

async function finaliseGeminiReply({ apiKey, model, payload, response, useSearch }) {
  let text = cleanModelText(extractGeminiText(response.data));
  if (!text) throw new Error("Gemini returned an empty response");

  if (looksLikeNonAnswer(text, payload.message)) {
    const retryPayload = {
      ...payload,
      repairInstruction: [
        "Your previous draft dodged the student's question.",
        `Previous draft: ${truncate(text, 800)}`,
        "Rewrite it now. Answer the latest student message directly first, then explain. Do not say what you can help with."
      ].join("\n")
    };
    const retry = await callGemini({ apiKey, model, payload: retryPayload, useSearch });
    const retryText = cleanModelText(extractGeminiText(retry.data));
    if (retryText && !looksLikeNonAnswer(retryText, payload.message)) {
      response = retry;
      text = retryText;
    }
  }

  const sources = extractGroundingSources(response.data);
  return {
    ok: true,
    provider: providerLabel(model, useSearch),
    model,
    searchGrounding: Boolean(useSearch),
    text: appendSourceLine(text, sources),
    sources
  };
}

async function callGemini({ apiKey, model, payload, useSearch }) {
  const body = buildGeminiBody(payload, useSearch);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(body)
  }, 18_000);

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Gemini request failed (${response.status}): ${truncate(text, 600)}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }

  return {
    data: await response.json(),
    searchUsed: Boolean(useSearch)
  };
}

function buildGeminiBody(payload = {}, useSearch) {
  const type = payload.type === "advisor" ? "advisor" : "ask";
  const latestMessage = truncate(String(payload.message || ""), 2200);
  const history = historyWithoutLatest(normaliseHistory(payload.history), latestMessage);
  const contents = [
    {
      role: "user",
      parts: [{ text: buildReferencePack(payload, latestMessage, type) }]
    },
    {
      role: "model",
      parts: [{ text: "Reference pack received. I will answer the next student message directly and use official/source caution only where needed." }]
    },
    ...historyToContents(history),
    {
      role: "user",
      parts: [{
        text: [
          payload.repairInstruction ? `Repair instruction:\n${payload.repairInstruction}\n` : "",
          `Latest student message:\n${latestMessage || "(empty)"}`,
          "",
          "Answer this exact message as a real chat reply. If the student asks 'how', explain the mechanism. If they ask 'why', give the reason. If they ask 'yes/no', start with Yes, No, or Not enough info."
        ].join("\n")
      }]
    }
  ];

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction(type) }]
    },
    contents: mergeConsecutiveRoles(contents),
    generationConfig: {
      temperature: type === "advisor" ? 0.52 : 0.48,
      topP: 0.95,
      maxOutputTokens: type === "advisor" ? 1100 : 950
    }
  };

  if (useSearch) body.tools = [{ google_search: {} }];
  return body;
}

function buildReferencePack(payload, latestMessage, type) {
  const data = loadCourseData();
  const context = payload.context && typeof payload.context === "object" ? payload.context : {};
  const profile = context.profile || {};
  const answers = context.answers || {};
  const historyText = normaliseHistory(payload.history).map((item) => `${item.role}: ${item.text}`).join("\n");
  const clientCourses = normaliseClientCourses(context.courses || context.rankedCourses || []);
  const serverCourses = findRelevantCourses([latestMessage, historyText].join("\n"), type, profile, answers, clientCourses);
  const courses = dedupeCourses([...clientCourses, ...serverCourses]).slice(0, 12);

  return [
    "Sydney Course Finder reference pack. Use this as grounding, not as a script.",
    `Task type: ${type}.`,
    `Dataset: ${data.courses.length} imported Sydney-area UAC course records. Import date: ${data.meta.importedAt || "not listed"}.`,
    "",
    "Core HSC/UAC knowledge:",
    "- ATAR is the student's statewide rank. Adjustment factors do not change the ATAR.",
    "- Selection rank is what a university may use for a specific course: ATAR plus any eligible adjustments, subject points, access scheme consideration, portfolio/audition/interview effects or other criteria.",
    "- Subject adjustment factors, EAS, SRS, location/school schemes and elite athlete/performer schemes are provider-specific and course-specific. Exact numbers need the exact university, course, year and eligibility rule.",
    "- A disadvantaged school, school acronym or location can matter only if an official provider/UAC scheme recognises it. Ask for the full school name when initials are ambiguous.",
    "- Prerequisites can block entry. Assumed knowledge is usually not a hard entry block, but missing it can make first year harder.",
    "- ATAR profiles in the course data are historical selection-rank/offer profiles, not guaranteed future cut-offs.",
    "- UAC preferences should usually put dream courses above safe backups because offers are assessed in preference order.",
    "- Useful pathways include diplomas, foundation studies, TAFE-to-uni, internal transfer, related lower-entry degrees, EAS, SRS/early offer schemes and provider-specific access programs.",
    "",
    "Provider aliases:",
    "WSU = Western Sydney University; UTS = University of Technology Sydney; UNSW = University of New South Wales; USYD = University of Sydney; MQ/Macquarie = Macquarie University; ACU = Australian Catholic University; SCU = Southern Cross University; CQU = CQUniversity.",
    "",
    "Student questionnaire/profile:",
    formatObject({ profile, answers }),
    "",
    "Relevant imported course records:",
    formatCourses(courses),
    "",
    "Official pages commonly useful for verification:",
    "UAC adjustment factors: https://www.uac.edu.au/future-applicants/admission-criteria/university-selection-rank-adjustments/",
    "UAC EAS: https://www.uac.edu.au/future-applicants/scholarships-and-schemes/educational-access-schemes",
    "UAC preferences: https://www.uac.edu.au/future-applicants/how-to-apply-for-uni/selecting-your-course-preferences/"
  ].join("\n");
}

function systemInstruction(type) {
  const helperName = type === "advisor" ? "course direction helper" : "Ask sidebar helper";
  return [
    `You are the Sydney Course Finder ${helperName}. You help NSW HSC students understand ATAR, selection ranks, UAC, Sydney universities, subjects, course choice, pathways, prerequisites, careers and applications.`,
    "Be a real conversational helper: answer the student's latest question first, then give the reasoning and practical next steps.",
    "Never reply with a generic capability blurb like 'I can help with ATAR adjustments'. If the question is vague, infer from the recent chat and still answer usefully.",
    "For yes/no questions, begin with 'Yes', 'No', or 'Not enough info', then explain in plain language.",
    "For adjustment marks/bonus points: clearly separate ATAR from selection rank. ATAR does not increase; a university may increase the selection rank for a specific course if the student qualifies.",
    "For 'how does it work' follow-ups, explain the mechanism step by step using the last topic in the chat.",
    "For 'is there a chance' follow-ups, say what could create a chance, what information is missing, and what to check next.",
    "For school acronyms like BBHS, say the acronym is ambiguous and ask for the full school name while still explaining the general rule.",
    "For prerequisites and subjects, state whether the subject is likely a hard requirement, assumed knowledge, recommended preparation, or only useful background. Do not invent a hard prerequisite.",
    "For course and university recommendations, use the imported course records first, then explain why using fit, ATAR risk, campus/commute, mode, prerequisites, accreditation/placements, careers, provider profile and backup pathways.",
    "For questions outside course choice, answer briefly if safe, then connect it back to study/applications only if useful.",
    "Use Google Search grounding when current official rules may matter, but avoid pretending exact official numbers are known if they are not in the data or search result.",
    "Do not hallucinate exact ATAR cut-offs, adjustment amounts, deadlines, fees, prerequisites or eligibility. Say what is likely, then identify the official page or detail needed for certainty.",
    "Keep replies natural and specific. Prefer 2-5 short paragraphs or bullets. Avoid repeating previous answers unless the student asks for a recap."
  ].join(" ");
}

async function aiStatus() {
  const data = loadCourseData();
  const apiKey = configuredApiKey();
  const base = {
    ok: true,
    configured: Boolean(apiKey),
    connected: false,
    provider: apiKey ? providerLabel(primaryModel(), USE_GOOGLE_SEARCH) : "AI not connected",
    model: primaryModel(),
    searchGrounding: USE_GOOGLE_SEARCH,
    coursesAvailable: data.courses.length,
    status: apiKey ? "checking" : "missing_key",
    requires: "Set GEMINI_API_KEY on the server to enable Gemini replies."
  };

  if (!apiKey) return base;
  const check = await getConnectionCheck(apiKey);
  return {
    ...base,
    connected: check.ok,
    provider: check.ok ? providerLabel(check.model || primaryModel(), USE_GOOGLE_SEARCH) : "AI connection failed",
    model: check.model || primaryModel(),
    status: check.ok ? "ready" : "error",
    error: check.error || ""
  };
}

async function getConnectionCheck(apiKey) {
  if (statusCache && statusCache.key === apiKey && Date.now() - statusCache.checkedAt < STATUS_TTL_MS) {
    return statusCache.result;
  }

  let lastError;
  for (const model of modelCandidates()) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with OK only." }] }],
          generationConfig: { maxOutputTokens: 8, temperature: 0 }
        })
      }, 14_000);
      if (response.ok) {
        const result = { ok: true, model };
        statusCache = { key: apiKey, checkedAt: Date.now(), result };
        return result;
      }
      const text = await response.text();
      lastError = new Error(`Gemini connection check failed (${response.status}): ${truncate(text, 450)}`);
      lastError.status = response.status;
      lastError.body = text;
      if (!isModelUnavailable(lastError)) break;
    } catch (error) {
      lastError = error;
      if (!isModelUnavailable(error)) break;
    }
  }

  const result = {
    ok: false,
    error: safeError(lastError || new Error("Gemini connection check failed"))
  };
  if (isHardSetupError(result.error)) {
    statusCache = { key: apiKey, checkedAt: Date.now(), result };
  }
  return result;
}

function configuredApiKey() {
  return process.env.GEMINI_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || process.env.GOOGLE_API_KEY
    || "";
}

function primaryModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

function modelCandidates(preferred = primaryModel()) {
  return [...new Set([preferred, primaryModel(), ...FALLBACK_MODELS].filter(Boolean))];
}

function providerLabel(model, searchEnabled) {
  const custom = process.env.AI_PROVIDER_LABEL;
  if (custom) return custom;
  return `Gemini ${model}${searchEnabled ? " + Search" : ""}`;
}

function findRelevantCourses(querySource, type, profile, answers, clientCourses) {
  const data = loadCourseData();
  const query = cleanSearchText([
    querySource,
    profile.topic?.label || profile.topic || "",
    profile.text || "",
    profile.passions || "",
    profile.subjects || "",
    answers.interests || answers.passions || "",
    answers.subjects || "",
    answers.workStyle || "",
    answers.avoid || ""
  ].join(" "));
  const words = tokenise(query).filter((word) => word.length > 2 && !stopWords.has(word));
  const atar = numericAtar(querySource) ?? numericAtar(profile.atar) ?? numericAtar(answers.atar);
  const clientKeys = new Set(clientCourses.map(courseKey));

  const scored = data.courses.map((course) => {
    const title = cleanSearchText(course.name);
    const text = cleanSearchText([
      course.name,
      course.university,
      course.campus,
      course.area,
      course.summary,
      course.careers,
      course.prerequisites,
      course.assumed
    ].join(" "));
    let score = 0;
    if (query && title === query) score += 300;
    if (query && title.includes(query)) score += 180;
    if (query && text.includes(query)) score += 60;
    score += words.filter((word) => title.includes(word)).length * 28;
    score += words.filter((word) => text.includes(word)).length * 6;
    if (type === "advisor" && profile.topic?.keywords) {
      score += profile.topic.keywords.filter((keyword) => text.includes(cleanSearchText(keyword))).length * 18;
    }
    const rank = numericAtar(course.atar);
    if (atar !== null && rank !== null) score += Math.max(0, 42 - Math.abs(atar - rank) * 2);
    if (rank !== null) score += 4;
    if (clientKeys.has(courseKey(course))) score -= 20;
    return { course, score };
  }).filter((entry) => entry.score > 18);

  const seen = new Set(clientKeys);
  return scored
    .sort((a, b) => b.score - a.score || String(a.course.name).localeCompare(String(b.course.name)))
    .filter(({ course }) => {
      const key = courseKey(course);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10)
    .map(({ course, score }) => compactCourse(course, score));
}

function loadCourseData() {
  if (courseDataCache) return courseDataCache;
  const filePath = path.join(__dirname, "..", "uac-courses.js");
  const source = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: filePath, timeout: 3000 });
  courseDataCache = {
    courses: Array.isArray(sandbox.window.uacCourses) ? sandbox.window.uacCourses : [],
    meta: sandbox.window.uacImportMeta || {}
  };
  return courseDataCache;
}

function compactCourse(course, score) {
  return {
    name: course.name || course.title || "",
    provider: course.university || course.provider || "",
    campus: course.campus || "",
    code: course.courseCode || course.code || "",
    atar: displayRank(course.atar),
    prerequisites: shortField(course.prerequisites),
    assumedKnowledge: shortField(course.assumed || course.assumedKnowledge),
    careers: shortField(course.careers),
    duration: shortField(course.duration),
    modes: Array.isArray(course.modes) ? course.modes.join(", ") : shortField(course.modes),
    uacUrl: course.uacUrl || "",
    officialUrl: course.officialUrl || course.url || "",
    score: typeof score === "number" ? Math.round(score) : undefined
  };
}

function normaliseClientCourses(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((item) => {
    const course = item.course || item;
    return compactCourse({
      ...course,
      university: course.university || course.provider,
      assumed: course.assumed || course.assumedKnowledge,
      courseCode: course.courseCode || course.code
    }, item.score);
  });
}

function dedupeCourses(courses) {
  const seen = new Set();
  return courses.filter((course) => {
    const key = courseKey(course);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatCourses(courses) {
  const unique = dedupeCourses(courses);
  if (!unique.length) return "No directly relevant course records were found for this message.";
  return unique.map((course, index) => {
    return [
      `${index + 1}. ${course.name}`,
      `provider: ${course.provider}`,
      `campus: ${course.campus || "not listed"}`,
      `code: ${course.code || "not listed"}`,
      `ATAR/profile: ${course.atar || "not listed"}`,
      `prerequisites: ${course.prerequisites || "not listed"}`,
      `assumed knowledge: ${course.assumedKnowledge || "not listed"}`,
      `careers: ${course.careers || "not listed"}`,
      `duration/mode: ${course.duration || "not listed"}; ${course.modes || "not listed"}`,
      `links: ${[course.uacUrl, course.officialUrl].filter(Boolean).join(" | ") || "not listed"}`
    ].join(" | ");
  }).join("\n");
}

function formatObject(value) {
  const cleaned = Object.fromEntries(Object.entries(value || {}).filter(([, entry]) => {
    if (entry === null || entry === undefined) return false;
    if (typeof entry === "string" && !entry.trim()) return false;
    if (typeof entry === "object" && !Object.keys(entry).length) return false;
    return true;
  }));
  return Object.keys(cleaned).length ? truncate(JSON.stringify(cleaned, null, 2), 2600) : "None.";
}

function normaliseHistory(value) {
  if (typeof value === "string") {
    return value.split(/\n+/).map((line) => ({ role: "context", text: truncate(line, 500) })).filter((line) => line.text);
  }
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const role = item.role === "assistant" || item.role === "model" ? "assistant" : item.role === "user" ? "user" : "context";
    const text = truncate(String(item.text || item.content || ""), 800);
    return { role, text };
  }).filter((item) => item.text && !isBoilerplateAssistantText(item));
}

function historyWithoutLatest(history, latestMessage) {
  const cleanLatest = cleanSearchText(latestMessage);
  return history.filter((item, index) => {
    if (index !== history.length - 1) return true;
    return !(item.role === "user" && cleanSearchText(item.text) === cleanLatest);
  }).slice(-10);
}

function historyToContents(history) {
  return history.map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.text }]
  }));
}

function mergeConsecutiveRoles(contents) {
  return contents.reduce((items, item) => {
    const last = items[items.length - 1];
    const text = item.parts?.map((part) => part.text || "").join("\n").trim();
    if (!text) return items;
    if (last && last.role === item.role) {
      last.parts[0].text = `${last.parts[0].text}\n\n${text}`;
    } else {
      items.push({ role: item.role, parts: [{ text }] });
    }
    return items;
  }, []);
}

function isBoilerplateAssistantText(item) {
  if (item.role !== "assistant") return false;
  return /checking whether gemini|gemini .*connected|real ai is not connected|i can use the imported sydney uac course data|asking gemini/i.test(item.text);
}

function extractGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim() || "";
}

function extractGroundingSources(data) {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  return chunks.map((chunk) => chunk.web).filter((web) => web?.uri).filter((web) => {
    if (seen.has(web.uri)) return false;
    seen.add(web.uri);
    return true;
  }).slice(0, 4).map((web) => ({
    title: truncate(web.title || "source", 80),
    uri: web.uri
  }));
}

function appendSourceLine(text, sources) {
  if (!sources.length) return text;
  const labels = sources.map((source) => source.title).filter(Boolean).slice(0, 3).join(", ");
  if (!labels || /source/i.test(text.slice(-120))) return text;
  return `${text}\n\nSources checked: ${labels}.`;
}

function cleanModelText(value) {
  return truncate(String(value || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^helper:\s*/i, "")
    .trim(), 3200);
}

function looksLikeNonAnswer(answer, question) {
  const text = cleanSearchText(answer);
  const prompt = cleanSearchText(question);
  if (!prompt) return false;
  if (/^i can help with|^i can use|^ask me about|^for exact entry numbers/.test(text)) return true;
  if (/i can help with atar adjustments pathways subjects prerequisites saved courses comparing courses or finding sydney options/.test(text)) return true;
  if (/\b(how|why|chance|so i can|ok but how|yeah but why)\b/.test(prompt)) {
    return !/\b(because|works|means|depends|step|selection rank|atar|adjustment|eligible|check|apply|course|provider|university)\b/.test(text);
  }
  return false;
}

function displayRank(value) {
  const rank = numericAtar(value);
  if (rank !== null) return rank.toFixed(rank % 1 ? 2 : 0);
  const code = String(value || "").trim();
  if (!code || code === "0") return "Not listed by UAC";
  const meanings = {
    NC: "New course; no published selection-rank profile yet",
    NO: "No offers were made on ATAR alone",
    NR: "No reportable selection-rank profile",
    NP: "Not provided by the institution",
    NS: "No semester 1 offers",
    NN: "Selection-rank profile unavailable",
    "<5": "Fewer than five ATAR-based offers were made"
  };
  return meanings[code] || code;
}

function shortField(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return truncate(text, 300);
}

function courseKey(course) {
  return cleanSearchText([course.name, course.provider || course.university, course.campus].join("|"));
}

function numericAtar(value) {
  const match = String(value ?? "").match(/\d{2}(?:\.\d{1,2})?/);
  if (!match) return null;
  const numberValue = Number(match[0]);
  return Number.isFinite(numberValue) && numberValue >= 0 && numberValue <= 99.95 ? numberValue : null;
}

function cleanSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.< ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenise(value) {
  return cleanSearchText(value).split(/\s+/).filter(Boolean);
}

function truncate(value, length) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

function safeError(error) {
  return truncate(error?.message || "AI request failed", 700);
}

function isModelUnavailable(error) {
  return /404|not found|not supported|model/i.test(String(error?.message || "")) && /model|not found|not supported/i.test(String(error?.message || ""));
}

function shouldRetryWithoutSearch(error) {
  return /google_search|search grounding|grounding|billing|billable|tool|unsupported tool/i.test(String(error?.message || ""));
}

function isHardSetupError(error) {
  return /PERMISSION_DENIED|permission|denied|forbidden|invalid api key|api key not valid|API key|401|403/i.test(String(error || ""));
}

function classifyAiError(error) {
  const message = String(error?.message || "");
  if (/GEMINI_API_KEY|not configured/i.test(message)) return "missing_key";
  if (/PERMISSION_DENIED|403|denied|forbidden|API key/i.test(message)) return "permission";
  if (/quota|rate limit|429/i.test(message)) return "quota";
  if (/not found|not supported|404|model/i.test(message)) return "model";
  return "connection";
}

async function readJson(req) {
  const body = await readBody(req);
  if (!body.trim()) return {};
  return JSON.parse(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

const stopWords = new Set([
  "the", "and", "for", "with", "that", "this", "what", "which", "why", "how", "can", "could", "should",
  "would", "does", "did", "from", "about", "into", "have", "has", "get", "got", "course", "degree",
  "uni", "university", "atar", "marks", "points", "please", "help"
]);
