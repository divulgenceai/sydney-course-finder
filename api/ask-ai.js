const MAX_PROMPT_LENGTH = 12000;
const DEFAULT_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const SYSTEM_INSTRUCTION = [
  "You are a grounded Sydney UAC course helper.",
  "Use the supplied site/UAC data and local answer as the source of truth.",
  "When Google Search grounding is enabled, use it for school-specific, provider-specific, adjustment-factor, deadline or current-rule questions.",
  "Start with a direct yes/no or recommendation when the question asks for one.",
  "Do not invent exact adjustment points, eligibility, fees, prerequisites, ATARs, campus availability, legal advice or guarantees.",
  "If a fact is missing or not verified, say exactly that and point to UAC or the official university course page.",
  "Plain text only."
].join(" ");

module.exports = async function askAiHandler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJson(req);
    const prompt = String(body.prompt || "").slice(0, MAX_PROMPT_LENGTH);
    const useSearch = Boolean(body.useSearch) && process.env.GEMINI_SEARCH_GROUNDING !== "false";
    if (!prompt.trim()) return sendJson(res, 400, { error: "Missing prompt" });

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return sendFallback(res, "Gemini API key missing");
    }

    let result = null;
    try {
      result = await askGemini(prompt, apiKey, { useSearch });
    } catch {
      return sendFallback(res, "Gemini unavailable");
    }
    if (!result?.text) return sendFallback(res, "Gemini unavailable");

    const text = cleanText(result.text);
    if (!text || isProviderNotice(text)) {
      return sendFallback(res, "Gemini returned notice");
    }

    const provider = result.sources?.length
      ? `Gemini (${result.model}) + Google Search + site data`
      : `Gemini (${result.model}) + site data`;

    return sendJson(res, 200, { text, provider, sources: result.sources || [] });
  } catch (error) {
    return sendJson(res, 500, { error: "AI request failed" });
  }
};

async function askGemini(prompt, apiKey, options = {}) {
  const customModels = String(process.env.GEMINI_MODEL || "")
    .split(",")
    .map((model) => normalizeModel(model))
    .filter(Boolean);
  const models = customModels.length ? customModels : DEFAULT_MODELS;
  let lastError = null;

  for (const model of models) {
    try {
      const result = await askGeminiModel(prompt, apiKey, model, options);
      if (result?.text) return { ...result, model };
    } catch (error) {
      lastError = error;
      if (!error.modelMayBeUnavailable) break;
    }
  }

  throw lastError || new Error("Gemini unavailable");
}

async function askGeminiModel(prompt, apiKey, model, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9800);
  const useSearch = Boolean(options.useSearch) && supportsGoogleSearch(model);
  const body = {
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: useSearch ? 0.18 : 0.15,
      topP: 0.8,
      maxOutputTokens: 750
    }
  };
  if (useSearch) {
    body.tools = [{ google_search: {} }];
  }

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = new Error(`Gemini failed with ${response.status}`);
      error.modelMayBeUnavailable = response.status === 400 || response.status === 404;
      throw error;
    }

    const data = await response.json();
    return {
      text: extractGeminiText(data),
      sources: extractGroundingSources(data)
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractGeminiText(data) {
  return (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || "")
    .filter(Boolean)
    .join(" ");
}

function extractGroundingSources(data) {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  return chunks
    .map((chunk) => chunk?.web)
    .filter((web) => web?.uri)
    .map((web) => ({
      title: cleanSourceTitle(web.title || web.uri),
      url: String(web.uri)
    }))
    .filter((source) => {
      const key = source.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function cleanSourceTitle(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function supportsGoogleSearch(model) {
  return /gemini-(?:2|3|3\.1|3\.5)/i.test(model) && !/1\.5/i.test(model);
}

function normalizeModel(model) {
  return String(model || "").trim().replace(/^models\//, "");
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendFallback(res, reason) {
  return sendJson(res, 200, {
    text: "",
    provider: "Site data fallback",
    fallback: true,
    reason
  });
}

function cleanText(value) {
  return String(value || "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_`#>]/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1400);
}

function isProviderNotice(value) {
  return /rate limit|quota|api key|captcha|cloudflare|model unavailable|permission denied|error/i.test(value || "");
}
