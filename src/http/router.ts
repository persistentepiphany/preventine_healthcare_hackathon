import { writeFile, readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchPostcode } from "../ingestion/postcode.js";
import {
  fetchNearbyServices,
  fetchNearbyServicesViaODS,
} from "../ingestion/services.js";
import { getWaitingTimeContext } from "../ingestion/waiting_times.js";
import { fetchPopulationContextSafe } from "../ingestion/population.js";
import {
  getLocalPreventiveContext,
  type Mode,
} from "../ingestion/context.js";
import { assessPreventiveRoute } from "../rules/engine.js";
import { parsePatientInput, type PatientInput } from "../contracts/patient_input.js";
import { renderAssessment } from "../rendering/render.js";
import { SAFE_FALLBACK_CARD } from "../rendering/safe_fallback.js";
import {
  projectFactors,
  summariseReadiness,
  type Factor,
  type FactorId,
} from "../rules/factor_projection.js";
import { assessViaSafetyEngine } from "../rules/safety_bridge.js";
import {
  renderAssessmentWithTone,
  isTone,
  type Tone,
} from "../rendering/tone.js";
import {
  renderFactorExplain,
  type FactorExplanation,
} from "../rendering/factor_explain.js";
import {
  renderQuestions,
  type QuestionsJson,
} from "../rendering/questions.js";
import {
  renderUnlockNarration,
  type NarrationJson,
} from "../rendering/unlock_narration.js";
import { derivePatientFactors, findFactor } from "../lib/factor_chips.js";
import {
  getDefaultStore,
  isValidSessionId,
  type SessionData,
} from "../storage/sessions.js";
import type { ZaiClient } from "../rendering/zai_client.js";
import type { CardJson } from "../rendering/card_schema.js";
import type { LocalService, PreventiveAssessment } from "../rules/types.js";

/**
 * Plain JSON-over-HTTP router. No express — keeps the demo dep-free. Each
 * handler returns { status, body } and the http server in src/http/server.ts
 * serialises.
 *
 * Card cache: every z.ai-backed endpoint serves a cached payload for the demo
 * postcode (M13 9PL) when the request payload matches the cached input. This
 * is insurance against z.ai temp=0 wording drift and against z.ai latency /
 * outage on the day. ?live=1 bypasses the cache and (for the demo postcode)
 * refreshes it.
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

function isDemoPostcode(postcode: string | undefined): boolean {
  if (!postcode) return false;
  return (
    postcode.trim().toUpperCase().replace(/\s+/g, " ") === DEMO_POSTCODE_CANONICAL
  );
}

/**
 * Parse the `?mode=` query param. Unknown / missing → "demo" (the safe
 * default). Only "demo", "light", "full" are accepted.
 */
function parseMode(query: URLSearchParams): Mode {
  const raw = query.get("mode");
  if (raw === "light" || raw === "full") return raw;
  return "demo";
}

async function readCachedJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeCachedJson<T>(path: string, value: T): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

function cachePath(filename: string): string {
  return join(CACHE_DIR, filename);
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
  const mode = parseMode(query);
  const ctx = await getLocalPreventiveContext(postcode, { mode });
  return { status: 200, body: { ...ctx, mode } };
}

/* -------------------------------------------------------------------------- */
/* Shared: build assessment + (optional) local services for a request         */
/* -------------------------------------------------------------------------- */

async function assessmentFor(
  patient: PatientInput,
  postcode: string | undefined,
  mode: Mode = "demo",
): Promise<PreventiveAssessment> {
  let localServices: LocalService[] | undefined;
  if (postcode) {
    // light + full both upgrade services to ODS-live (no key). full would
    // also try Service Search via fetchNearbyServicesLive, but the
    // gp-summary card only needs a name/type list — ODS gives that, and
    // fetchNearbyServicesLive's extra geo precision isn't required to
    // populate the card's local_services array.
    const sv =
      mode === "demo"
        ? await fetchNearbyServices(postcode)
        : await fetchNearbyServicesViaODS(postcode);
    localServices = sv.services.map((s) => ({ name: s.name, type: s.type }));
  }
  const optsArg = localServices !== undefined ? { localServices } : {};
  return assessPreventiveRoute(patient, optsArg);
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/gp-summary  (with optional tone)                             */
/* -------------------------------------------------------------------------- */

export interface GpSummaryRequestBody {
  patient: unknown;
  /**
   * Optional postcode. When the canonical demo postcode is supplied and the
   * card cache is populated, the cached card is served unless ?live=1 is set.
   */
  postcode?: string;
  /** Optional tone toggle: "simple" or "detailed". Omitted → default register. */
  tone?: Tone;
}

function gpSummaryCacheFilename(tone: Tone | undefined): string {
  if (tone === "simple") return "m13-9pl-card-simple.json";
  if (tone === "detailed") return "m13-9pl-card-detailed.json";
  return "m13-9pl-card.json";
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

  const tone: Tone | undefined = isTone(b.tone) ? b.tone : undefined;
  const mode = parseMode(query);
  const useCache = query.get("live") !== "1";
  const path =
    isDemoPostcode(b.postcode) && mode === "demo"
      ? cachePath(gpSummaryCacheFilename(tone))
      : null;
  if (useCache && path) {
    const cached = await readCachedJson<CardJson>(path);
    if (cached) return { status: 200, body: { card: cached, source: "cache" } };
  }

  const assessment = await assessmentFor(parsed.value, b.postcode, mode);

  const rendered = tone === undefined
    ? await renderAssessment(
        assessment,
        options.zaiClient ? { client: options.zaiClient } : {},
      )
    : await renderAssessmentWithTone(
        assessment,
        tone,
        options.zaiClient ? { client: options.zaiClient } : {},
      );

  if (path && query.get("live") === "1") {
    try {
      await writeCachedJson(path, rendered);
    } catch {
      /* non-fatal */
    }
  }

  return { status: 200, body: { card: rendered, source: "live" } };
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/factor-explain                                               */
/* -------------------------------------------------------------------------- */

export interface FactorExplainRequestBody {
  patient: unknown;
  factorKey: string;
  postcode?: string;
}

export async function postFactorExplain(
  query: URLSearchParams,
  body: unknown,
  options: RouterOptions = {},
): Promise<RouterResponse> {
  if (typeof body !== "object" || body === null) {
    return { status: 400, body: { error: "body must be a JSON object" } };
  }
  const b = body as Partial<FactorExplainRequestBody>;
  const parsed = parsePatientInput(b.patient);
  if (!parsed.ok) {
    return { status: 400, body: { error: "invalid patient", issues: parsed.issues } };
  }
  if (typeof b.factorKey !== "string" || b.factorKey.length === 0) {
    return { status: 400, body: { error: "missing factorKey" } };
  }

  const factors = derivePatientFactors(parsed.value);
  const factor = findFactor(factors, b.factorKey);
  if (!factor) {
    return {
      status: 400,
      body: {
        error: "factorKey not present in patient's factors",
        availableFactors: factors.map((f) => f.key),
      },
    };
  }

  const useCache = query.get("live") !== "1";
  const path = isDemoPostcode(b.postcode)
    ? cachePath(`m13-9pl-factor-${b.factorKey}.json`)
    : null;
  if (useCache && path) {
    const cached = await readCachedJson<FactorExplanation>(path);
    if (cached) return { status: 200, body: { explanation: cached, source: "cache" } };
  }

  const assessment = await assessmentFor(parsed.value, b.postcode);
  const explanation = await renderFactorExplain(
    {
      factor,
      assessment: {
        risk_band: assessment.risk_band,
        next_step_type: assessment.next_step_type,
        missing_measurements: assessment.missing_measurements,
        forbidden_claims: assessment.forbidden_claims,
      },
    },
    options.zaiClient ? { client: options.zaiClient } : {},
  );

  if (path && query.get("live") === "1") {
    try {
      await writeCachedJson(path, explanation);
    } catch {
      /* non-fatal */
    }
  }

  return { status: 200, body: { explanation, source: "live" } };
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/questions-to-ask                                             */
/* -------------------------------------------------------------------------- */

export interface QuestionsRequestBody {
  patient: unknown;
  postcode?: string;
}

export async function postQuestions(
  query: URLSearchParams,
  body: unknown,
  options: RouterOptions = {},
): Promise<RouterResponse> {
  if (typeof body !== "object" || body === null) {
    return { status: 400, body: { error: "body must be a JSON object" } };
  }
  const b = body as Partial<QuestionsRequestBody>;
  const parsed = parsePatientInput(b.patient);
  if (!parsed.ok) {
    return { status: 400, body: { error: "invalid patient", issues: parsed.issues } };
  }

  const useCache = query.get("live") !== "1";
  const path = isDemoPostcode(b.postcode) ? cachePath("m13-9pl-questions.json") : null;
  if (useCache && path) {
    const cached = await readCachedJson<QuestionsJson>(path);
    if (cached) return { status: 200, body: { questions: cached.questions, source: "cache" } };
  }

  const assessment = await assessmentFor(parsed.value, b.postcode);
  const factors = derivePatientFactors(parsed.value);
  const result = await renderQuestions(
    {
      assessment: {
        risk_band: assessment.risk_band,
        next_step_type: assessment.next_step_type,
        missing_measurements: assessment.missing_measurements,
        eligible_for_health_check: assessment.eligible_for_health_check,
        forbidden_claims: assessment.forbidden_claims,
      },
      factors,
    },
    options.zaiClient ? { client: options.zaiClient } : {},
  );

  if (path && query.get("live") === "1") {
    try {
      await writeCachedJson(path, result);
    } catch {
      /* non-fatal */
    }
  }

  return { status: 200, body: { questions: result.questions, source: "live" } };
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/unlock-narration                                             */
/* -------------------------------------------------------------------------- */

export interface UnlockNarrationRequestBody {
  patient: unknown;
  previouslyMissing: string[];
  postcode?: string;
}

const CANONICAL_PREV_MISSING = ["blood pressure", "cholesterol"];

function previouslyMissingMatchesCanonical(arr: string[]): boolean {
  if (arr.length !== CANONICAL_PREV_MISSING.length) return false;
  const sorted = arr.slice().sort();
  for (let i = 0; i < CANONICAL_PREV_MISSING.length; i++) {
    if (sorted[i] !== CANONICAL_PREV_MISSING[i]) return false;
  }
  return true;
}

export async function postUnlockNarration(
  query: URLSearchParams,
  body: unknown,
  options: RouterOptions = {},
): Promise<RouterResponse> {
  if (typeof body !== "object" || body === null) {
    return { status: 400, body: { error: "body must be a JSON object" } };
  }
  const b = body as Partial<UnlockNarrationRequestBody>;
  const parsed = parsePatientInput(b.patient);
  if (!parsed.ok) {
    return { status: 400, body: { error: "invalid patient", issues: parsed.issues } };
  }
  if (
    !Array.isArray(b.previouslyMissing) ||
    !b.previouslyMissing.every((m) => typeof m === "string")
  ) {
    return { status: 400, body: { error: "previouslyMissing must be string[]" } };
  }

  const assessment = await assessmentFor(parsed.value, b.postcode);
  const resolved = b.previouslyMissing.filter(
    (m) => !assessment.missing_measurements.includes(m),
  );

  if (resolved.length === 0) {
    return {
      status: 200,
      body: { narration: null, resolved: [], source: "no-change" },
    };
  }

  const useCache = query.get("live") !== "1";
  const path =
    isDemoPostcode(b.postcode) && previouslyMissingMatchesCanonical(b.previouslyMissing)
      ? cachePath("m13-9pl-unlock.json")
      : null;
  if (useCache && path) {
    const cached = await readCachedJson<NarrationJson>(path);
    if (cached) {
      return {
        status: 200,
        body: { narration: cached.narration, resolved, source: "cache" },
      };
    }
  }

  const result = await renderUnlockNarration(
    {
      assessment: {
        risk_band: assessment.risk_band,
        next_step_type: assessment.next_step_type,
        missing_measurements: assessment.missing_measurements,
        forbidden_claims: assessment.forbidden_claims,
      },
      resolved_measurements: resolved,
    },
    options.zaiClient ? { client: options.zaiClient } : {},
  );

  if (path && query.get("live") === "1") {
    try {
      await writeCachedJson(path, result);
    } catch {
      /* non-fatal */
    }
  }

  return {
    status: 200,
    body: { narration: result.narration, resolved, source: "live" },
  };
}

/* -------------------------------------------------------------------------- */
/* UI vocabulary loader (engineer-authored, NHS-sourced)                      */
/* -------------------------------------------------------------------------- */

const UI_VOCAB_PATH = join(__dirname, "..", "..", "data", "ui-vocabulary.json");

interface VocabularyEntry {
  label: string;
  whyItMatters: string;
  nhsUrl: string;
}
interface UiVocabulary {
  factors: Record<FactorId, VocabularyEntry>;
  statusLabels: Record<"recorded" | "protective" | "unknown", string>;
}

let vocabularyCache: UiVocabulary | null = null;
async function loadUiVocabulary(): Promise<UiVocabulary> {
  if (vocabularyCache) return vocabularyCache;
  const raw = await readFile(UI_VOCAB_PATH, "utf8");
  const parsed = JSON.parse(raw) as { factors: unknown; statusLabels: unknown };
  vocabularyCache = {
    factors: parsed.factors as UiVocabulary["factors"],
    statusLabels: parsed.statusLabels as UiVocabulary["statusLabels"],
  };
  return vocabularyCache;
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/profile — combined UI endpoint                               */
/* -------------------------------------------------------------------------- */

/**
 * Augmented-seam contract. One endpoint that gives the UI everything it needs
 * to render the dashboard: the LLM-rendered safety card, the 9-factor list
 * with status enums + curated NHS-sourced display strings, the readiness
 * ring summary, the eligibility/missing/screening enums, and a `source` tag
 * that distinguishes a live card from a safe-fallback card.
 *
 * Safety invariants:
 *   - The `card` field still passes through the existing renderer
 *     (validateAssessment → LLM → containsForbiddenToken → urgent-text-leak
 *     guard → safe-fallback if any check fails). No new model surface.
 *   - The `factors` / `qrisk` / `screening` / `eligibility` / `missing`
 *     fields carry ONLY structured enums + numbers + canonical key names. The
 *     rich engine's free-text fields (qrisk.explanation,
 *     healthCheckEligibility.explanation, missingMeasurement.whyItMatters,
 *     recommendation.title/description, screening.explanation) are NEVER
 *     forwarded — they would bypass the guardrail token list.
 *   - Human-readable per-factor text comes from data/ui-vocabulary.json,
 *     engineer-authored, NHS-sourced, vetted at write time against the same
 *     forbidden-token discipline the renderer screens model output against.
 */
export interface ProfileFactor {
  id: FactorId;
  status: Factor["status"];
  priority: Factor["priority"];
  label: string;
  statusLabel: string;
  whyItMatters: string;
  nhsUrl: string;
}

export interface ProfileResponse {
  source: "live" | "cache" | "safe_fallback";
  card: CardJson;
  factors: ProfileFactor[];
  readiness: ReturnType<typeof summariseReadiness>;
  qrisk: {
    ready: boolean;
    missingInputs: string[];
    staleInputs: string[];
  };
  eligibility: { status: string };
  screening: { type: string; status: string }[];
  missing: string[];
  nextStep: string;
  urgencyLevel: "routine" | "soon" | "urgent" | "emergency";
}

/**
 * Map the rich engine's QRISK readiness `missingData` strings (raw engine
 * text like "Blood pressure (systolic)" or "Cholesterol ratio") to canonical
 * UI-vocabulary keys. Anything unrecognised is dropped — the UI surface is
 * enum-only by design.
 */
const QRISK_MISSING_MAP: Record<string, string> = {
  "Blood pressure (systolic)": "blood_pressure",
  "Cholesterol ratio": "cholesterol",
  "Sex at birth": "sex_at_birth",
  BMI: "bmi_or_waist",
  "Smoking status": "smoking",
};
function projectQriskMissing(raw: readonly string[]): string[] {
  const out: string[] = [];
  for (const item of raw) {
    const mapped = QRISK_MISSING_MAP[item];
    if (mapped) out.push(mapped);
  }
  return out;
}

function isSafeFallbackCard(card: CardJson): boolean {
  return (
    card.headline === SAFE_FALLBACK_CARD.headline &&
    card.body === SAFE_FALLBACK_CARD.body &&
    card.next_step === SAFE_FALLBACK_CARD.next_step
  );
}

export interface ProfileRequestBody {
  patient: unknown;
  postcode?: string;
}

export async function postProfile(
  query: URLSearchParams,
  body: unknown,
  options: RouterOptions = {},
): Promise<RouterResponse> {
  if (typeof body !== "object" || body === null) {
    return { status: 400, body: { error: "body must be a JSON object" } };
  }
  const b = body as Partial<ProfileRequestBody>;
  const parsed = parsePatientInput(b.patient);
  if (!parsed.ok) {
    return { status: 400, body: { error: "invalid patient", issues: parsed.issues } };
  }

  const mode = parseMode(query);

  // 1. Flat engine drives the LLM card (existing safety path, unchanged).
  //    Pass mode so light/full uses ODS-live services for the card.
  const flatAssessment = await assessmentFor(parsed.value, b.postcode, mode);

  // 2. Rich engine drives QRISK / screening / extra signal — pure data, never
  //    free text, so it can't bypass the LLM-output guardrails. Local services
  //    aren't relevant to the rich extras (no screening match depends on them),
  //    so we omit the option entirely.
  const { extras } = assessViaSafetyEngine(parsed.value);

  // 3. Factor projection drives the chip list + readiness ring.
  const factorsRaw = projectFactors(parsed.value);
  const readiness = summariseReadiness(factorsRaw);

  // 4. Card path: cache → live → safe-fallback (in that order).
  //    The M13 file cache only applies to demo mode — light/full want the
  //    card to re-render so it can pick up the live ODS services / Fingertips
  //    population that the cached card was rendered without.
  const useCache = query.get("live") !== "1";
  const path =
    isDemoPostcode(b.postcode) && mode === "demo"
      ? cachePath("m13-9pl-card.json")
      : null;
  let card: CardJson;
  let source: ProfileResponse["source"];
  if (useCache && path) {
    const cached = await readCachedJson<CardJson>(path);
    if (cached) {
      card = cached;
      source = "cache";
    } else {
      card = await renderAssessment(
        flatAssessment,
        options.zaiClient ? { client: options.zaiClient } : {},
      );
      source = isSafeFallbackCard(card) ? "safe_fallback" : "live";
    }
  } else {
    card = await renderAssessment(
      flatAssessment,
      options.zaiClient ? { client: options.zaiClient } : {},
    );
    source = isSafeFallbackCard(card) ? "safe_fallback" : "live";
  }

  // 5. Decorate factors with the engineer-authored vocabulary.
  const vocab = await loadUiVocabulary();
  const factors: ProfileFactor[] = factorsRaw.map((f) => {
    const entry = vocab.factors[f.id];
    return {
      id: f.id,
      status: f.status,
      priority: f.priority,
      label: entry.label,
      statusLabel: vocab.statusLabels[f.status],
      whyItMatters: entry.whyItMatters,
      nhsUrl: entry.nhsUrl,
    };
  });

  // 6. Build the response. Everything from the rich engine is projected down
  //    to enums / canonical keys — no free text from extras enters the wire.
  const response: ProfileResponse = {
    source,
    card,
    factors,
    readiness,
    qrisk: {
      ready: extras.qrisk.ready,
      missingInputs: projectQriskMissing(extras.qrisk.missingData),
      staleInputs: projectQriskMissing(extras.qrisk.staleData),
    },
    eligibility: { status: flatAssessment.eligible_for_health_check },
    screening: extras.screeningMatches.map((s) => ({
      type: s.screeningType,
      status: s.status,
    })),
    missing: flatAssessment.missing_measurements,
    nextStep: flatAssessment.next_step_type,
    urgencyLevel: extras.urgencyLevel,
  };

  return { status: 200, body: response };
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/full — aggregate one-shot for the UI                         */
/* -------------------------------------------------------------------------- */

/**
 * One-round-trip endpoint the UI calls. Returns the union of /api/nhs/context
 * + /api/nhs/profile so the UI doesn't have to orchestrate. Respects the
 * `?mode=` query param: passes it to the context fetch (which gates Fingertips /
 * RTT / Service Search live calls) and uses it as a hint for the card path
 * (`mode=full` is treated as `?live=1` semantics for the renderer; demo/light
 * use the cached card when available).
 *
 * Postcode is optional. Without one, `context` is omitted and only the
 * profile is returned.
 */
export interface FullRequestBody {
  patient: unknown;
  postcode?: string;
}

export async function postFull(
  query: URLSearchParams,
  body: unknown,
  options: RouterOptions = {},
): Promise<RouterResponse> {
  if (typeof body !== "object" || body === null) {
    return { status: 400, body: { error: "body must be a JSON object" } };
  }
  const b = body as Partial<FullRequestBody>;
  const parsed = parsePatientInput(b.patient);
  if (!parsed.ok) {
    return { status: 400, body: { error: "invalid patient", issues: parsed.issues } };
  }

  const mode = parseMode(query);

  // Profile path. In full mode we also force-bypass the card cache so the demo
  // truly shows a fresh LLM render.
  const profileQuery = new URLSearchParams(query);
  if (mode === "full") profileQuery.set("live", "1");
  const profileR = await postProfile(profileQuery, body, options);

  // Context path — only if a postcode was supplied.
  let context: unknown = null;
  if (b.postcode && b.postcode.trim().length > 0) {
    const ctxQuery = new URLSearchParams({ postcode: b.postcode, mode });
    const ctxR = await getContext(ctxQuery);
    if (ctxR.status === 200) context = ctxR.body;
  }

  return {
    status: profileR.status,
    body: {
      mode,
      context,
      profile: profileR.body,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* /api/nhs/session(/:id) — local file-backed draft storage                   */
/* -------------------------------------------------------------------------- */

/**
 * Session endpoints let the UI persist a patient draft + previously-missing
 * snapshot across page reloads and across LLM calls, without standing up a
 * database. Backed by atomic JSON files under data/sessions/<uuid>.json
 * (see src/storage/sessions.ts).
 *
 *   POST   /api/nhs/session             → create new session
 *   GET    /api/nhs/session/:id         → read
 *   PUT    /api/nhs/session/:id         → replace
 *   PATCH  /api/nhs/session/:id         → shallow-merge update
 *   DELETE /api/nhs/session/:id         → delete
 *   GET    /api/nhs/session             → list (id + updatedAt only)
 *
 * Patient data is sensitive — the store is unencrypted on the demo machine
 * and data/sessions/ is .gitignored. Do NOT point the UI at this with real
 * patient information.
 */

const SESSION_PATH_RE = /^\/api\/nhs\/session(?:\/([^/]+))?\/?$/;

/** Optional injected store override (for tests). Defaults to module store. */
export interface SessionRouterOptions {
  sessionStore?: ReturnType<typeof getDefaultStore>;
}
function storeFrom(options: RouterOptions & SessionRouterOptions): ReturnType<typeof getDefaultStore> {
  return options.sessionStore ?? getDefaultStore();
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function badSessionId(): RouterResponse {
  return { status: 400, body: { error: "invalid session id" } };
}
function notFound(): RouterResponse {
  return { status: 404, body: { error: "session not found" } };
}

export async function postSession(
  body: unknown,
  options: RouterOptions & SessionRouterOptions = {},
): Promise<RouterResponse> {
  const store = storeFrom(options);
  const seed: Partial<SessionData> = isPlainObject(body) ? readSessionSeed(body) : {};
  const { id, data } = await store.create(seed);
  return { status: 201, body: { id, ...data } };
}

function readSessionSeed(body: Record<string, unknown>): Partial<SessionData> {
  const out: Partial<SessionData> = {};
  if (isPlainObject(body.patient)) out.patient = body.patient as Partial<PatientInput>;
  if (typeof body.postcode === "string") out.postcode = body.postcode;
  if (Array.isArray(body.previouslyMissing)) {
    out.previouslyMissing = body.previouslyMissing.filter((m) => typeof m === "string") as string[];
  }
  return out;
}

export async function getSession(
  id: string,
  options: RouterOptions & SessionRouterOptions = {},
): Promise<RouterResponse> {
  if (!isValidSessionId(id)) return badSessionId();
  const store = storeFrom(options);
  const data = await store.get(id);
  if (!data) return notFound();
  return { status: 200, body: { id, ...data } };
}

export async function putSession(
  id: string,
  body: unknown,
  options: RouterOptions & SessionRouterOptions = {},
): Promise<RouterResponse> {
  if (!isValidSessionId(id)) return badSessionId();
  if (!isPlainObject(body)) {
    return { status: 400, body: { error: "body must be a JSON object" } };
  }
  const seed = readSessionSeed(body);
  const store = storeFrom(options);
  const next = await store.put(id, {
    patient: seed.patient ?? {},
    previouslyMissing: seed.previouslyMissing ?? [],
    ...(seed.postcode !== undefined ? { postcode: seed.postcode } : {}),
  });
  if (!next) return notFound();
  return { status: 200, body: { id, ...next } };
}

export async function patchSession(
  id: string,
  body: unknown,
  options: RouterOptions & SessionRouterOptions = {},
): Promise<RouterResponse> {
  if (!isValidSessionId(id)) return badSessionId();
  if (!isPlainObject(body)) {
    return { status: 400, body: { error: "body must be a JSON object" } };
  }
  const seed = readSessionSeed(body);
  const store = storeFrom(options);
  const next = await store.patch(id, seed);
  if (!next) return notFound();
  return { status: 200, body: { id, ...next } };
}

export async function deleteSession(
  id: string,
  options: RouterOptions & SessionRouterOptions = {},
): Promise<RouterResponse> {
  if (!isValidSessionId(id)) return badSessionId();
  const store = storeFrom(options);
  const removed = await store.delete(id);
  if (!removed) return notFound();
  return { status: 200, body: { id, deleted: true } };
}

export async function listSessions(
  options: RouterOptions & SessionRouterOptions = {},
): Promise<RouterResponse> {
  const store = storeFrom(options);
  const items = await store.list();
  return { status: 200, body: { sessions: items } };
}

/* -------------------------------------------------------------------------- */
/* Dispatcher                                                                 */
/* -------------------------------------------------------------------------- */

export async function dispatch(
  method: string,
  pathname: string,
  query: URLSearchParams,
  body: unknown,
  options: RouterOptions & SessionRouterOptions = {},
): Promise<RouterResponse> {
  if (method === "GET" && pathname === "/api/nhs/postcode") return getPostcode(query);
  if (method === "GET" && pathname === "/api/nhs/services") return getServices(query);
  if (method === "GET" && pathname === "/api/nhs/waiting-times") return getWaitingTimes();
  if (method === "GET" && pathname === "/api/nhs/population") return getPopulation();
  if (method === "GET" && pathname === "/api/nhs/context") return getContext(query);
  if (method === "POST" && pathname === "/api/nhs/gp-summary") {
    return postGpSummary(query, body, options);
  }
  if (method === "POST" && pathname === "/api/nhs/factor-explain") {
    return postFactorExplain(query, body, options);
  }
  if (method === "POST" && pathname === "/api/nhs/questions-to-ask") {
    return postQuestions(query, body, options);
  }
  if (method === "POST" && pathname === "/api/nhs/unlock-narration") {
    return postUnlockNarration(query, body, options);
  }
  if (method === "POST" && pathname === "/api/nhs/profile") {
    return postProfile(query, body, options);
  }
  if (method === "POST" && pathname === "/api/nhs/full") {
    return postFull(query, body, options);
  }

  // /api/nhs/session(/:id) — collection and resource routes.
  const sessionMatch = SESSION_PATH_RE.exec(pathname);
  if (sessionMatch) {
    const id = sessionMatch[1];
    if (id === undefined) {
      if (method === "POST") return postSession(body, options);
      if (method === "GET") return listSessions(options);
      return { status: 405, body: { error: "method not allowed" } };
    }
    if (method === "GET") return getSession(id, options);
    if (method === "PUT") return putSession(id, body, options);
    if (method === "PATCH") return patchSession(id, body, options);
    if (method === "DELETE") return deleteSession(id, options);
    return { status: 405, body: { error: "method not allowed" } };
  }

  return { status: 404, body: { error: "not found" } };
}
