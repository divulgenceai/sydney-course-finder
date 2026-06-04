const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const MAX_BODY_BYTES = 120_000;
const DEFAULT_MODEL = "gemini-3.5-flash";
const MODEL = process.env.GEMINI_MODEL || DEFAULT_MODEL;
const PROVIDER = process.env.AI_PROVIDER_LABEL || `Gemini ${MODEL}`;
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;

let courseDataCache;

module.exports = async function aiHandler(req, res) {
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
      fallback: true,
      provider: "Site data",
      error: safeError(error)
    });
  }
};

async function generateAiReply(payload = {}) {
  const apiKey = process.env.GEMINI_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      fallback: true,
      provider: "Site data",
      error: "GEMINI_API_KEY is not configured"
    };
  }

  const prompt = buildPrompt(payload);
  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction(payload.type) }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: payload.type === "advisor" ? 0.45 : 0.35,
      topP: 0.9,
      maxOutputTokens: payload.type === "advisor" ? 720 : 560
    }
  };

  const response = await fetchWithTimeout(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(body)
  }, 14_000);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${truncate(text, 300)}`);
  }

  const data = await response.json();
  const text = extractGeminiText(data);
  if (!text) throw new Error("Gemini returned an empty response");

  return {
    ok: true,
    provider: PROVIDER,
    model: MODEL,
    text: cleanModelText(text)
  };
}

function buildPrompt(payload = {}) {
  const message = truncate(String(payload.message || ""), 1600);
  const type = payload.type === "advisor" ? "advisor" : "ask";
  const history = normaliseHistory(payload.history).slice(-8);
  const context = payload.context && typeof payload.context === "object" ? payload.context : {};
  const profile = context.profile || {};
  const answers = context.answers || {};
  const clientCourses = normaliseClientCourses(context.courses || context.rankedCourses || []);
  const serverCourses = findRelevantCourses(message, type, profile, clientCourses);
  const localReply = truncate(String(payload.localReply || ""), 1000);
  const data = loadCourseData();

  const lines = [
    `Task type: ${type}.`,
    `Student question: ${message || "(empty)"}`,
    `Sydney Course Finder dataset: ${data.courses.length} imported UAC course records; import date ${data.meta.importedAt || "not listed"}.`,
    "",
    "Recent chat:",
    history.length ? history.map((item) => `${item.role}: ${item.text}`).join("\n") : "None.",
    "",
    "Student profile / questionnaire answers:",
    formatObject({ profile, answers }),
    "",
    "Local algorithm draft and/or rule fallback:",
    localReply || "None.",
    "",
    "Relevant course data to ground the answer:",
    formatCourses([...clientCourses, ...serverCourses].slice(0, 10)),
    "",
    "Answer the student's latest question directly. If the exact answer is provider-specific or not in the dataset, say that clearly and explain the safest official place to check."
  ];

  return lines.join("\n");
}

function systemInstruction(type) {
  const helperType = type === "advisor" ? "course-direction helper" : "Ask sidebar helper";
  return [
    `You are the Sydney Course Finder ${helperType} for NSW HSC students choosing Sydney-area university courses.`,
    "Use the provided UAC/course data and questionnaire context first. You may reason beyond it, but do not invent exact ATAR adjustment numbers, bonus points, prerequisites, fees, deadlines, guarantees, or official eligibility.",
    "If a user asks about adjustment factors, school schemes, EAS, SRS, bonus marks or special circumstances: make clear the ATAR itself does not change; universities may adjust the selection rank only when the student/course/provider is eligible.",
    "Prerequisites can block entry. Assumed knowledge normally does not block entry but can make first year harder.",
    "ATAR profiles are historical selection-rank/offer data, not guaranteed cut-offs.",
    "For course choice questions, compare realistic fit: ATAR risk, prerequisites, campus commute, workload, study mode, accreditation, placements, career path and backup pathways.",
    "Answer the actual question first. Keep it concise, specific and natural. Avoid repeating earlier answers. Use short paragraphs or bullets only when that helps."
  ].join(" ");
}

function findRelevantCourses(message, type, profile, clientCourses) {
  const data = loadCourseData();
  const query = cleanSearchText([
    message,
    profile.topic?.label || profile.topic || "",
    profile.text || "",
    profile.passions || "",
    profile.subjects || ""
  ].join(" "));
  const words = tokenise(query).filter((word) => word.length > 2 && !stopWords.has(word));
  const atar = numericAtar(message) ?? numericAtar(profile.atar);
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
      score += profile.topic.keywords.filter((keyword) => text.includes(cleanSearchText(keyword))).length * 16;
    }
    const rank = numericAtar(course.atar);
    if (atar !== null && rank !== null) score += Math.max(0, 40 - Math.abs(atar - rank) * 2);
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
    .slice(0, 8)
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
  return value.slice(0, 8).map((item) => {
    const course = item.course || item;
    return compactCourse({
      ...course,
      university: course.university || course.provider,
      assumed: course.assumed || course.assumedKnowledge,
      courseCode: course.courseCode || course.code
    }, item.score);
  });
}

function formatCourses(courses) {
  const seen = new Set();
  const unique = courses.filter((course) => {
    const key = courseKey(course);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!unique.length) return "No directly relevant course records were found.";
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
  return Object.keys(cleaned).length ? truncate(JSON.stringify(cleaned, null, 2), 2200) : "None.";
}

function normaliseHistory(value) {
  if (typeof value === "string") {
    return value.split(/\n+/).map((line) => ({ role: "context", text: truncate(line, 350) })).filter((line) => line.text);
  }
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    role: item.role === "assistant" || item.role === "model" ? "assistant" : item.role === "user" ? "student" : "context",
    text: truncate(String(item.text || item.content || ""), 500)
  })).filter((item) => item.text);
}

function extractGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim() || "";
}

function cleanModelText(value) {
  return truncate(String(value || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^helper:\s*/i, "")
    .trim(), 2600);
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
  return truncate(text, 260);
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
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function safeError(error) {
  return truncate(error?.message || "AI request failed", 500);
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
  "uni", "university", "atar", "marks", "points"
]);
