// Minimal static server. ES modules need an http origin, so opening index.html from the
// filesystem will not work.
//
//   node serve.mjs [port]
//
// The port can also come from the PORT environment. Module URLs carry the boot stamp:
// no-store alone does not clear the browser's module map, so an edited file can still run
// the previous version. Changing the URL itself is what works.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 7400;
const BUILD = Date.now().toString(36);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const stamp = (specifier) => (specifier.includes("?") ? specifier : `${specifier}?v=${BUILD}`);

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ""));

  if (!file.startsWith(ROOT)) {
    response.writeHead(403).end("forbidden");
    return;
  }

  try {
    let body = await readFile(file);
    const type = TYPES[extname(file)] || "application/octet-stream";

    // Rewrite the entry points' own module URLs so a reload never runs a stale module.
    if (type.startsWith("text/html")) {
      body = Buffer.from(
        body
          .toString("utf8")
          .replace(/src="(\.\/src\/[^"]+)"/g, (_, specifier) => `src="${stamp(specifier)}"`)
          .replace(/href="(\.\/styles\.css)"/g, (_, specifier) => `href="${stamp(specifier)}"`)
      );
    }
    if (type.startsWith("text/javascript")) {
      body = Buffer.from(body.toString("utf8").replace(/from "(\.\/[^"]+)"/g, (_, specifier) => `from "${stamp(specifier)}"`));
    }

    response.writeHead(200, { "content-type": type, "cache-control": "no-store" }).end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("not found");
  }
});

server.listen(PORT, () => console.log(`riso-graphic — http://localhost:${PORT}`));
