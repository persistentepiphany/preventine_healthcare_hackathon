import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dispatch, type RouterOptions } from "./router.js";
import { logRequest } from "./log.js";

/**
 * Tiny dep-free HTTP wrapper around the router. Reads the request body as
 * JSON for POST, dispatches to the router, and serialises the response.
 *
 * CORS
 * ----
 * The UI (a downloaded Claude Design artifact running locally as either a
 * file:// page or a localhost:<other-port> page) will be on a different
 * origin to this API. The default origin policy is fully permissive ("*"),
 * which is appropriate for a hackathon demo where the only data crossing
 * the wire is the patient form payload — nothing here uses cookies, basic
 * auth, or any other credential the browser would withhold under CORS.
 *
 * To tighten in production, set the CORS_ORIGINS env var to a
 * comma-separated allowlist. When set, only matching Origins receive
 * Access-Control-Allow-Origin; preflight from others gets 403.
 *
 * HOST
 * ----
 * Default bind is 0.0.0.0 so tunnels (ngrok, Cloudflare Tunnel) and LAN
 * clients can reach the API. Override with the HOST env var.
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

const CORS_ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const CORS_ALLOWED_HEADERS = "content-type";
const CORS_MAX_AGE = "600";

interface CorsPolicy {
  /** null = no allowlist (echo the request origin or "*" wildcard). */
  allowlist: string[] | null;
}

function readCorsPolicy(): CorsPolicy {
  const raw = (process.env.CORS_ORIGINS ?? "").trim();
  if (raw === "" || raw === "*") return { allowlist: null };
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return { allowlist: list.length === 0 ? null : list };
}

/**
 * Decide what to return as Access-Control-Allow-Origin.
 * - If no allowlist: echo the request Origin (preferred over "*" because the
 *   UI may later want to enable credentials, and "*" + credentials is illegal).
 *   If the request has no Origin (curl, server-to-server), fall back to "*".
 * - If an allowlist is set: only matching origins get a header; others get
 *   no ACAO and the preflight returns 403.
 */
function resolveAllowedOrigin(origin: string | undefined, policy: CorsPolicy): string | null {
  if (policy.allowlist === null) return origin && origin.length > 0 ? origin : "*";
  if (origin && policy.allowlist.includes(origin)) return origin;
  return null;
}

function applyCorsHeaders(res: ServerResponse, origin: string | null): void {
  if (origin === null) return;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", CORS_ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", CORS_ALLOWED_HEADERS);
  res.setHeader("Access-Control-Max-Age", CORS_MAX_AGE);
}

export function createApp(options: RouterOptions = {}) {
  const policy = readCorsPolicy();
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
      const allowedOrigin = resolveAllowedOrigin(origin, policy);

      // CORS preflight: respond before touching the router.
      if (req.method === "OPTIONS") {
        if (allowedOrigin === null) {
          res.statusCode = 403;
          res.end();
          return;
        }
        applyCorsHeaders(res, allowedOrigin);
        res.statusCode = 204;
        res.end();
        return;
      }

      applyCorsHeaders(res, allowedOrigin);

      const t0 = Date.now();
      const url = new URL(req.url ?? "/", "http://localhost");
      const method = req.method ?? "GET";
      const hasBody = method === "POST" || method === "PUT" || method === "PATCH";

      // For multipart file uploads, pass raw request without reading body
      const isMultipartUpload =
        url.pathname === "/api/upload/patient-input" &&
        req.headers["content-type"]?.startsWith("multipart/form-data");

      const body = hasBody && !isMultipartUpload ? await readBody(req) : undefined;
      const r = await dispatch(method, url.pathname, url.searchParams, body, { ...options, req });
      res.statusCode = r.status;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify(r.body));
      logRequest({
        method: req.method ?? "GET",
        pathname: url.pathname,
        status: r.status,
        totalMs: Date.now() - t0,
        ...(url.searchParams.get("mode")
          ? { mode: url.searchParams.get("mode") as string }
          : {}),
      });
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
  const host = process.env.HOST ?? "0.0.0.0";
  createApp().listen(port, host, () => {
    process.stdout.write(`nhs context server listening on ${host}:${port}\n`);
  });
}
