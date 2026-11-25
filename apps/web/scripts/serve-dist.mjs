import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const host = "127.0.0.1";
const requestedPort = Number.parseInt(process.env.TEST_PORT ?? "4322", 10);
const port = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65535 ? requestedPort : 4322;
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

async function existingFile(pathname) {
  const relativePath = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, "");
  const candidates = relativePath
    ? extname(relativePath)
      ? [join(dist, relativePath)]
      : [join(dist, relativePath, "index.html")]
    : [join(dist, "index.html")];
  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    if (!resolved.startsWith(`${dist}${sep}`) && resolved !== dist) continue;
    try {
      if ((await stat(resolved)).isFile()) return resolved;
    } catch {
      // Continue to the reviewed 404 response.
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${host}:${port}`).pathname;
  const file = await existingFile(pathname);
  const responseFile = file ?? join(dist, "404.html");
  try {
    const body = await readFile(responseFile);
    response.writeHead(file ? 200 : 404, {
      "Content-Type": types[extname(responseFile)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(body);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Test server could not read the compiled site.");
  }
});

server.listen(port, host);
