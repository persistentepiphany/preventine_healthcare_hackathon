import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dispatch, type RouterOptions } from "./router.js";

/**
 * Tiny dep-free HTTP wrapper around the router. Reads the request body as
 * JSON for POST, dispatches to the router, and serialises the response.
 */

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function createApp(options: RouterOptions = {}) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const body = req.method === "POST" ? await readBody(req) : undefined;
      const r = await dispatch(req.method ?? "GET", url.pathname, url.searchParams, body, options);
      res.statusCode = r.status;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify(r.body));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "internal", detail: msg }));
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => {
    process.stdout.write(`nhs context server listening on :${port}\n`);
  });
}
