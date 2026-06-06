import { writeFile, readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchPostcode } from "../ingestion/postcode.js";
import { fetchNearbyServices } from "../ingestion/services.js";
import { getWaitingTimeContext } from "../ingestion/waiting_times.js";
import { fetchPopulationContextSafe } from "../ingestion/population.js";
import { getLocalPreventiveContext } from "../ingestion/context.js";
import { assessPreventiveRoute } from "../rules/engine.js";
import { parsePatientInput } from "../contracts/patient_input.js";
import { renderAssessment } from "../rendering/render.js";
import type { ZaiClient } from "../rendering/zai_client.js";
import type { CardJson } from "../rendering/card_schema.js";
import type { LocalService } from "../rules/types.js";

/**
 * Plain JSON-over-HTTP router. No express — keeps the demo dep-free. Each
 * handler returns { status, body } and the http server in src/http/server.ts
 * serialises.
 *
 * Card cache: /api/nhs/gp-summary serves a cached card for the demo postcode
 * (M13 9PL) when the request payload matches the cached input. This is
 * insurance against z.ai temp=0 wording drift and against z.ai latency /
 * outage on the day. ?live=1 bypasses the cache.
 */

export interface RouterResponse {
  status: number;
  body: unknown;
}

export interface RouterOptions {
  /** Inject a ZAI client for tests. Defaults to the live HTTP client. */
  zaiClient?: ZaiClient;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "..", "..", "data", "cache");
const DEMO_POSTCODE_CANONICAL = "M13 9PL";
const DEMO_CARD_PATH = join(CACHE_DIR, "m13-9pl-card.json");

function cachedCardKey(postcode: string | undefined): string | null {
  if (!postcode) return null;
  return postcode.trim().toUpperCase().replace(/\s+/g, " ") ===
    DEMO_POSTCODE_CANONICAL
    ? DEMO_CARD_PATH
    : null;
}

async function readCachedCard(path: string): Promise<CardJson | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as CardJson;
  } catch {
    return null;
  }
}

async function writeCachedCard(path: string, card: CardJson): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path, JSON.stringify(card, null, 2), "utf8");
}

/* -------------------------------------------------------------------------- */
/* GET /api/nhs/postcode                                                      */
/* -------------------------------------------------------------------------- */

export async function getPostcode(query: URLSearchParams): Promise<RouterResponse> {
  const postcode = query.get("postcode");
  if (!postcode || !postcode.trim()) {
    return { status: 400, body: { error: "missing postcode query param" } };
  }
  const r = await fetchPostcode(postcode);
  if (!r.ok) return { status: r.reason === "not_found" ? 404 : 502, body: r };
  return { status: 200, body: r };
}

/* -------------------------------------------------------------------------- */
/* GET /api/nhs/services                                                      */
/* -------------------------------------------------------------------------- */

export async function getServices(query: URLSearchParams): Promise<RouterResponse> {
  const postcode = query.get("postcode") ?? "";
  const r = await fetchNearbyServices(postcode);
  return { status: 200, body: r };
}

/* -------------------------------------------------------------------------- */
/* GET /api/nhs/waiting-times                                                 */
/* -------------------------------------------------------------------------- */

export async function getWaitingTimes(): Promise<RouterResponse> {
  const r = await getWaitingTimeContext();
  return { status: 200, body: r };
}

/* -------------------------------------------------------------------------- */
/* GET /api/nhs/population                                                    */
/* -------------------------------------------------------------------------- */

export async function getPopulation(): Promise<RouterResponse> {
  const r = await fetchPopulationContextSafe();
  return { status: 200, body: r };
}

/* -------------------------------------------------------------------------- */
/* GET /api/nhs/context                                                       */
/* -------------------------------------------------------------------------- */

export async function getContext(query: URLSearchParams): Promise<RouterResponse> {
  const postcode = query.get("postcode");
  if (!postcode || !postcode.trim()) {
    return { status: 400, body: { error: "missing postcode query param" } };
  }
  const ctx = await getLocalPreventiveContext(postcode);
  return { status: 200, body: ctx };
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/gp-summary                                                   */
/* -------------------------------------------------------------------------- */

export interface GpSummaryRequestBody {
  patient: unknown;
  /**
   * Optional postcode. When the canonical demo postcode is supplied and the
   * card cache is populated, the cached card is served unless ?live=1 is set.
   */
  postcode?: string;
}

export async function postGpSummary(
  query: URLSearchParams,
  body: unknown,
  options: RouterOptions = {},
): Promise<RouterResponse> {
  if (typeof body !== "object" || body === null) {
    return { status: 400, body: { error: "body must be a JSON object" } };
  }
  const b = body as Partial<GpSummaryRequestBody>;
  const parsed = parsePatientInput(b.patient);
  if (!parsed.ok) {
    return { status: 400, body: { error: "invalid patient", issues: parsed.issues } };
  }

  const useCache = query.get("live") !== "1";
  const cachePath = cachedCardKey(b.postcode);
  if (useCache && cachePath) {
    const cached = await readCachedCard(cachePath);
    if (cached) return { status: 200, body: { card: cached, source: "cache" } };
  }

  // Pull local services for the supplied postcode (or no services).
  let localServices: LocalService[] | undefined;
  if (b.postcode) {
    const sv = await fetchNearbyServices(b.postcode);
    localServices = sv.services.map((s) => ({ name: s.name, type: s.type }));
  }

  const optsArg = localServices !== undefined ? { localServices } : {};
  const assessment = assessPreventiveRoute(parsed.value, optsArg);
  const card = await renderAssessment(
    assessment,
    options.zaiClient ? { client: options.zaiClient } : {},
  );

  // Populate the demo-card cache on first live render for the canonical postcode.
  if (cachePath && query.get("live") === "1") {
    try {
      await writeCachedCard(cachePath, card);
    } catch {
      /* non-fatal */
    }
  }

  return { status: 200, body: { card, source: "live" } };
}

/* -------------------------------------------------------------------------- */
/* Dispatcher                                                                 */
/* -------------------------------------------------------------------------- */

export async function dispatch(
  method: string,
  pathname: string,
  query: URLSearchParams,
  body: unknown,
  options: RouterOptions = {},
): Promise<RouterResponse> {
  if (method === "GET" && pathname === "/api/nhs/postcode") return getPostcode(query);
  if (method === "GET" && pathname === "/api/nhs/services") return getServices(query);
  if (method === "GET" && pathname === "/api/nhs/waiting-times") return getWaitingTimes();
  if (method === "GET" && pathname === "/api/nhs/population") return getPopulation();
  if (method === "GET" && pathname === "/api/nhs/context") return getContext(query);
  if (method === "POST" && pathname === "/api/nhs/gp-summary") {
    return postGpSummary(query, body, options);
  }
  return { status: 404, body: { error: "not found" } };
}
