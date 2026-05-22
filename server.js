const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
loadEnvFile(path.join(root, ".env"));
const askAiHandler = require("./api/ask-ai.js");

const port = Number(process.env.PORT || 4180);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
  if (url.pathname === "/api/ask-ai") {
    askAiHandler(req, res);
    return;
  }

  const filePath = resolveFile(url.pathname);
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  fs.createReadStream(filePath).pipe(res);
}).listen(port, host, () => {
  console.log(`Sydney Course Finder running at http://${host}:${port}`);
});

function resolveFile(pathname) {
  const clean = decodeURIComponent(pathname).replace(/\\/g, "/");
  const route = clean === "/" ? "/index.html" : clean === "/advisor" ? "/advisor.html" : clean;
  const candidate = path.resolve(root, `.${route}`);
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return "";
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) return "";
  return candidate;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}
