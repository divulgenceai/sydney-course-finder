const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = __dirname;
loadLocalEnv(path.join(root, ".env"));

const port = Number(process.env.PORT || process.argv[2] || 4180);
const host = process.env.HOST || "127.0.0.1";
const aiHandler = require("./api/ai");
const formProxyHandler = require("./api/form-proxy");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf"
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);

  if (url.pathname === "/api/ai") {
    aiHandler(req, res);
    return;
  }

  if (url.pathname === "/api/form-proxy") {
    formProxyHandler(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, {
      "Content-Type": "text/plain; charset=utf-8",
      Allow: "GET, HEAD"
    });
    res.end("Method not allowed");
    return;
  }

  const filePath = resolveFile(url.pathname);
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const stat = fs.statSync(filePath);
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const versionedAsset = ext !== ".html" && url.searchParams.has("v");
  const cacheControl = versionedAsset
    ? "public, max-age=31536000, immutable"
    : ext === ".html"
      ? "no-cache"
      : path.basename(filePath) === "uac-courses-lite.js"
        ? "public, max-age=3600, stale-while-revalidate=86400"
        : "public, max-age=300";
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, {
      ETag: etag,
      "Cache-Control": cacheControl
    });
    res.end();
    return;
  }

  const encoding = preferredEncoding(req.headers["accept-encoding"], ext, stat.size);
  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": cacheControl,
    ETag: etag,
    ...(encoding ? { "Content-Encoding": encoding, Vary: "Accept-Encoding" } : {}),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const source = fs.createReadStream(filePath);
  if (encoding === "br") {
    source.pipe(zlib.createBrotliCompress({
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }
    })).pipe(res);
  } else if (encoding === "gzip") {
    source.pipe(zlib.createGzip({ level: 6 })).pipe(res);
  } else {
    source.pipe(res);
  }
}).listen(port, host, () => {
  console.log(`Sydney Course Finder running at http://${host}:${port}`);
});

function preferredEncoding(header, ext, size) {
  if (size < 1024 || ![".html", ".js", ".mjs", ".css", ".json", ".webmanifest", ".svg"].includes(ext)) return "";
  const accepted = String(header || "").toLowerCase();
  if (/\bbr\b/.test(accepted)) return "br";
  if (/\bgzip\b/.test(accepted)) return "gzip";
  return "";
}

function loadLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) return;
    process.env[match[1]] = parseEnvValue(match[2]);
  });
}

function parseEnvValue(value) {
  const trimmed = String(value || "").trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  return trimmed.replace(/\s+#.*$/, "");
}

function resolveFile(pathname) {
  const clean = decodeURIComponent(pathname).replace(/\\/g, "/");
  const route = clean === "/"
    ? "/index.html"
    : clean === "/guide"
      ? "/guide.html"
    : clean === "/advisor"
      ? "/advisor.html"
      : clean === "/calculator"
        ? "/calculator.html"
      : clean === "/atar-calculator"
        ? "/atar-calculator.html"
      : clean === "/atar-compass" || clean === "/atar-match"
        ? "/advisor.html"
      : clean === "/uac-planner" || clean === "/preference-planner" || clean === "/early-entry"
        ? "/uac-planner.html"
        : clean === "/my-plan" || clean === "/plan"
          ? "/my-plan.html"
          : clean === "/pathways"
            ? "/pathways.html"
            : clean === "/no-atar"
              ? "/no-atar.html"
            : clean === "/university-forms" || clean === "/forms"
              ? "/university-forms.html"
            : clean === "/subjects"
              ? "/subjects.html"
            : clean === "/subject-helper"
              ? "/subject-helper.html"
        : clean;
  const candidate = path.resolve(root, `.${route}`);
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return "";
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) return "";
  return candidate;
}
