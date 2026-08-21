const catalogue = require("../university-forms-data");

const MAX_PDF_BYTES = 24 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;
const PDF_MAGIC = Buffer.from("%PDF-");
const pdfForms = catalogue.providers.flatMap((provider) =>
  provider.forms
    .filter((form) => form.format === "pdf")
    .map((form) => ({
      ...form,
      providerId: provider.id,
      providerName: provider.name,
      providerHubUrl: provider.hubUrl,
      providerWebsite: provider.website
    }))
);
const allowedHosts = new Set(
  catalogue.providers
    .flatMap((provider) => [
      provider.website,
      provider.hubUrl,
      ...provider.forms.map((form) => form.url)
    ])
    .filter(Boolean)
    .map((value) => safeHostname(value))
    .filter(Boolean)
);

module.exports = async function formProxyHandler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  const id = requestId(req);
  const form = pdfForms.find((item) => item.id === id);
  if (!form) {
    sendJson(res, 404, { ok: false, error: "Unknown official form" });
    return;
  }

  const source = new URL(form.url);
  if (!isAllowedHost(source.hostname)) {
    sendJson(res, 403, { ok: false, error: "Form host is not allowlisted" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(source, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.5",
        "Accept-Language": "en-AU,en;q=0.9",
        Referer: form.providerHubUrl || form.providerWebsite,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127.0 Safari/537.36 SydneyCourseFinder/1.0"
      }
    });
    if (!response.ok) throw new Error(`Official form returned ${response.status}`);

    const finalUrl = new URL(response.url || form.url);
    if (!isAllowedHost(finalUrl.hostname)) throw new Error("Official form redirected outside the allowlist");

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_PDF_BYTES) throw new Error("Official PDF is larger than the 24 MB editor limit");

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_PDF_BYTES) throw new Error("Official PDF is empty or too large");
    if (!buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) throw new Error("Official link did not return a PDF");

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Content-Disposition", `inline; filename="${safeFilename(form.title)}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Official-Form-Source", finalUrl.origin);
    res.end(buffer);
  } catch (error) {
    sendJson(res, 502, {
      ok: false,
      error: error?.name === "AbortError"
        ? "The official university server took too long to respond"
        : String(error?.message || "Could not load the official PDF")
    });
  } finally {
    clearTimeout(timeout);
  }
};

function requestId(req) {
  if (typeof req.query?.id === "string") return req.query.id.trim();
  try {
    return new URL(req.url || "", "http://localhost").searchParams.get("id")?.trim() || "";
  } catch {
    return "";
  }
}

function safeHostname(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isAllowedHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return [...allowedHosts].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function safeFilename(value) {
  return String(value || "university-form")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "university-form";
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

module.exports._private = {
  allowedHosts,
  isAllowedHost,
  pdfForms,
  requestId,
  safeFilename
};
