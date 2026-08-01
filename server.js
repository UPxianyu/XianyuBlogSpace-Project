"use strict";

/**
 * 本地静态预览服务器
 * 用法：先 node build.js 生成 dist/，再 node server.js
 * 访问 http://localhost:3000
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT) || 3000;

// 读取 base（子路径部署），本地预览时自动剥离前缀
const BASE_PATH = (() => {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "site.json"), "utf8"));
    return String(cfg.base || "/").replace(/\/?$/, "/");
  } catch {
    return "/";
  }
})();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("dist/ 尚未生成，请先运行：node build.js");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400);
    return res.end("Bad Request");
  }
  if (BASE_PATH !== "/" && pathname.startsWith(BASE_PATH)) {
    pathname = pathname.slice(BASE_PATH.length - 1);
    if (pathname === "") pathname = "/";
  }
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.join(DIST, pathname);
  if (!filePath.startsWith(DIST + path.sep)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      fs.readFile(path.join(DIST, "404.html"), (e2, html) => {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(e2 ? "404 Not Found" : html);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log("------------------------------------------");
  console.log("  P1-Blog static preview");
  console.log(`  http://localhost:${PORT}`);
  console.log("  (build 后请刷新页面)");
  console.log("------------------------------------------");
});
