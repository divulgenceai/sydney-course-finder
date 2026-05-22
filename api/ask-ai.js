const MAX_PROMPT_LENGTH = 5000;

module.exports = async function askAiHandler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJson(req);
    const prompt = String(body.prompt || "").slice(0, MAX_PROMPT_LENGTH);
    if (!prompt.trim()) return sendJson(res, 400, { error: "Missing prompt" });

    const response = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        private: true,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You are a grounded Sydney UAC course helper. Preserve the supplied local answer. Do not invent exact adjustment points, eligibility, fees, prerequisites or guarantees. Plain text only."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      return sendJson(res, 502, { error: "AI provider unavailable" });
    }

    const data = await response.json();
    const text = cleanText(data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "");
    if (!text || isProviderNotice(text)) {
      return sendJson(res, 502, { error: "AI provider returned notice" });
    }

    return sendJson(res, 200, { text, provider: "Free AI + site data" });
  } catch (error) {
    return sendJson(res, 500, { error: "AI request failed" });
  }
};

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
  return /pollinations|rate limit|api key|captcha|cloudflare|model unavailable|error/i.test(value || "");
}
