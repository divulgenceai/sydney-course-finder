const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
loadLocalEnv(path.join(root, ".env"));

const port = Number(process.env.PORT || 4180);
const host = process.env.HOST || "127.0.0.1";
const aiHandler = require("./api/ai");

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

  if (url.pathname === "/api/ai") {
    aiHandler(req, res);
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
    : clean === "/advisor"
      ? "/advisor.html"
      : clean === "/atar-calculator" || clean === "/calculator"
        ? "/atar-calculator.html"
        : clean === "/my-plan" || clean === "/plan"
          ? "/my-plan.html"
        : clean === "/subject-helper" || clean === "/subjects"
          ? "/subject-helper.html"
        : clean;
  const candidate = path.resolve(root, `.${route}`);
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return "";
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) return "";
  return candidate;
}
