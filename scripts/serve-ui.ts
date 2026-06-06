#!/usr/bin/env node
/* Tiny static file server for the PreventPath UI.
   Serves ui/Preventive Care/ on http://localhost:5173.
   No deps — node built-ins only. */

import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.UI_PORT || 5173);
const HOST = process.env.UI_HOST || "0.0.0.0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "ui", "Preventive Care");
const INDEX = "Preventive Care.html";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jsx": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function safeJoin(rootDir: string, urlPath: string): string | null {
  // Strip query string + decode.
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (p === "/" || p === "") p = "/" + INDEX;
  // Normalise + reject traversal.
  const joined = path.normalize(path.join(rootDir, p));
  if (!joined.startsWith(rootDir + path.sep) && joined !== rootDir) {
    return null;
  }
  return joined;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = req.url || "/";
    const target = safeJoin(ROOT, url);
    if (!target) {
      res.statusCode = 403;
      res.end("forbidden");
      return;
    }
    let stat;
    try {
      stat = await fs.stat(target);
    } catch {
      res.statusCode = 404;
      res.end("not found: " + url);
      return;
    }
    let filePath = target;
    if (stat.isDirectory()) {
      filePath = path.join(target, INDEX);
      try {
        await fs.stat(filePath);
      } catch {
        res.statusCode = 404;
        res.end("no index");
        return;
      }
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const data = await fs.readFile(filePath);
    res.statusCode = 200;
    res.setHeader("content-type", mime);
    res.setHeader("cache-control", "no-store");
    res.end(data);
  } catch (err) {
    res.statusCode = 500;
    res.end("server error: " + (err instanceof Error ? err.message : String(err)));
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[serve-ui] listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/`);
  console.log(`[serve-ui] serving from ${ROOT}`);
});
