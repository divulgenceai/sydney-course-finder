const MAX_PROMPT_LENGTH = 5000;
const DEFAULT_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const SYSTEM_INSTRUCTION = [
  "You are a grounded Sydney UAC course helper.",
  "Use the supplied site/UAC data and local answer as the source of truth.",
  "Do not invent exact adjustment points, eligibility, fees, prerequisites, ATARs, campus availability, legal advice or guarantees.",
  "If a fact is missing, say to check UAC or the official university course page.",
  "Plain text only."
].join(" ");

module.exports = async function askAiHandler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJson(req);
    const prompt = String(body.prompt || "").slice(0, MAX_PROMPT_LENGTH);
    if (!prompt.trim()) return sendJson(res, 400, { error: "Missing prompt" });

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return sendJson(res, 503, { error: "Gemini API key missing" });
    }

    let result = null;
    try {
      result = await askGemini(prompt, apiKey);
    } catch {
      return sendJson(res, 502, { error: "Gemini unavailable" });
    }
    if (!result?.text) return sendJson(res, 502, { error: "Gemini unavailable" });

    const text = cleanText(result.text);
    if (!text || isProviderNotice(text)) {
      return sendJson(res, 502, { error: "Gemini returned notice" });
    }

    return sendJson(res, 200, { text, provider: `Gemini (${result.model}) + site data` });
  } catch (error) {
    return sendJson(res, 500, { error: "AI request failed" });
  }
};

async function askGemini(prompt, apiKey) {
  const customModels = String(process.env.GEMINI_MODEL || "")
    .split(",")
    .map((model) => normalizeModel(model))
    .filter(Boolean);
  const models = customModels.length ? customModels : DEFAULT_MODELS;
  let lastError = null;

  for (const model of models) {
    try {
      const text = await askGeminiModel(prompt, apiKey, model);
      if (text) return { text, model };
    } catch (error) {
      lastError = error;
      if (!error.modelMayBeUnavailable) break;
    }
  }

  throw lastError || new Error("Gemini unavailable");
}

async function askGeminiModel(prompt, apiKey, model) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9800);
  try {
    const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
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
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 420
        }
      })
    });

    if (!response.ok) {
      const error = new Error(`Gemini failed with ${response.status}`);
      error.modelMayBeUnavailable = response.status === 400 || response.status === 404;
      throw error;
    }

    const data = await response.json();
    return extractGeminiText(data);
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
    .slice(0, 900);
}

function isProviderNotice(value) {
  return /rate limit|quota|api key|captcha|cloudflare|model unavailable|permission denied|error/i.test(value || "");
}
