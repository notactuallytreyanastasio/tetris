// Minimal static server for local play. Serves the repo root: the entry HTML
// and the built bundle. No dependencies; refuses path traversal.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve(".");
const PORT = Number(process.env["PORT"] ?? 8000);

const MIME: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname === "/" ? "/public/index.html" : url.pathname;
  const target = normalize(join(ROOT, path));

  if (!target.startsWith(ROOT + sep) && target !== ROOT) {
    res.writeHead(403).end("forbidden");
    return;
  }

  try {
    const body = await readFile(target);
    const type = MIME[extname(target)] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": type, "content-length": body.length });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`Tetris at http://localhost:${PORT}/`);
});
