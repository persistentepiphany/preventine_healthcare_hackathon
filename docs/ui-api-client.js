/**
 * UI ↔ API client for the PreventPath / NHS preventive-care backend.
 *
 * Drop this file into your Claude Design artifact (or paste its contents
 * into the artifact's <script> block) and replace any `data.js` mock data
 * with calls to the exported functions.
 *
 * Usage (vanilla):
 *
 *   import { setApiBase, fetchContext, fetchProfile } from "./ui-api-client.js";
 *   setApiBase("http://localhost:3000");                       // dev
 *   // setApiBase("https://my-tunnel-host.ngrok.io");          // tunnel
 *
 *   const ctx = await fetchContext("M13 9PL");
 *   const profile = await fetchProfile({ patient: {...}, postcode: "M13 9PL" });
 *
 * Each function returns one of:
 *   { ok: true, data, source }                    — success
 *   { ok: false, status, error, issues? }         — server returned non-200
 *   { ok: false, status: 0, error: "network" }    — fetch threw / aborted / timed out
 *
 * No throws — the caller checks `ok` and renders the corresponding state.
 *
 * Safety: the response shapes are documented in docs/ui-response-shape.md.
 * Anything user-facing (card text, factor labels) has already passed the
 * server-side vocabulary discipline; do not concatenate your own clinical
 * strings around them.
 */

let API_BASE = "http://localhost:3000";
const DEFAULT_TIMEOUT_MS = 12000;

/** Override at runtime: setApiBase("https://your-host"); */
export function setApiBase(url) {
  if (typeof url !== "string" || url.length === 0) throw new Error("api base must be a non-empty string");
  API_BASE = url.replace(/\/+$/, "");
}

export function getApiBase() {
  return API_BASE;
}

async function jsonFetch(path, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 0,
      error: err && err.name === "AbortError" ? "timeout" : "network",
    };
  }
  clearTimeout(timer);
  let body = null;
  try {
    body = await res.json();
  } catch {
    return { ok: false, status: res.status, error: "non-json response" };
  }
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: (body && body.error) || `http ${res.status}`,
      issues: body && body.issues,
    };
  }
  return { ok: true, data: body, status: res.status };
}

/* -------------------------------------------------------------------------- */
/* GET /api/nhs/postcode                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Resolve a postcode to NHS geography (lat/lon, local authority, ICB, region).
 * On 404 → ok=false, status=404, error="not_found".
 * Use this to drive the "we found you in Manchester ICB" header.
 */
export function fetchPostcode(postcode) {
  const q = new URLSearchParams({ postcode }).toString();
  return jsonFetch(`/api/nhs/postcode?${q}`);
}

/* -------------------------------------------------------------------------- */
/* GET /api/nhs/context                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Combined geography + nearby services + waiting times + curated NHS content
 * + (synthetic) population context for a postcode.
 *
 * Returns dataQuality: { postcode, services, waitingTimes, officialContent,
 * population } — each one of "live" | "cached" | "mock" | "failed" |
 * "synthetic". Render data-quality badges per panel using this.
 */
export function fetchContext(postcode) {
  const q = new URLSearchParams({ postcode }).toString();
  return jsonFetch(`/api/nhs/context?${q}`);
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/profile  — the main UI endpoint                              */
/* -------------------------------------------------------------------------- */

/**
 * Run the rules engine + bridge + factor projection + LLM renderer for a
 * patient. Returns:
 *
 *   {
 *     source: "live" | "cache" | "safe_fallback",
 *     card: { headline, body, next_step, services: [{name, type, ...}] },
 *     factors: [{ id, status, priority, label, statusLabel, whyItMatters, nhsUrl }] x9,
 *     readiness: { total, recorded, protective, unknown, percent },
 *     qrisk: { ready, missingInputs, staleInputs },
 *     eligibility: { status: "possibly" | "not_age_eligible" | "not_eligible_existing_condition" | "not_applicable" },
 *     screening: [{ type, status }],
 *     missing: ["blood pressure", ...],
 *     nextStep: "urgent_care" | "pharmacy_bp_check" | "ask_gp_or_pharmacy_about_measurements" | "gp_review",
 *     urgencyLevel: "routine" | "soon" | "urgent" | "emergency"
 *   }
 *
 * On safe_fallback the card content is the generic safe-fallback text — show
 * the UI's safe-fallback state (it means the model output failed validation).
 *
 * If the patient is in urgent_care, hide the services panel
 * (`card.services` will be []) and surface the urgent card prominently.
 */
export function fetchProfile({ patient, postcode, live = false } = {}) {
  if (!patient || typeof patient !== "object") {
    throw new Error("fetchProfile: patient (PatientInput) is required");
  }
  const q = live ? "?live=1" : "";
  return jsonFetch(`/api/nhs/profile${q}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ patient, postcode }),
  });
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/gp-summary  — original LLM card only (no factors)            */
/* -------------------------------------------------------------------------- */

/**
 * Render only the LLM card (headline/body/next_step/services). Useful when
 * you already have the factors and just want a refreshed card text. Pass
 * tone="simple" or "detailed" to change register.
 */
export function fetchGpSummary({ patient, postcode, tone, live = false } = {}) {
  if (!patient || typeof patient !== "object") {
    throw new Error("fetchGpSummary: patient is required");
  }
  const q = live ? "?live=1" : "";
  const body = { patient, postcode };
  if (tone) body.tone = tone;
  return jsonFetch(`/api/nhs/gp-summary${q}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/factor-explain                                               */
/* -------------------------------------------------------------------------- */

/**
 * Render an LLM explanation for a single factor (e.g. "Why blood pressure
 * matters for you given the rest of your information"). `factorKey` must be
 * one of the chip keys returned by /api/nhs/profile or the factor-chip layer.
 */
export function fetchFactorExplain({ patient, factorKey, postcode, live = false } = {}) {
  if (!patient || typeof patient !== "object") throw new Error("fetchFactorExplain: patient is required");
  if (!factorKey) throw new Error("fetchFactorExplain: factorKey is required");
  const q = live ? "?live=1" : "";
  return jsonFetch(`/api/nhs/factor-explain${q}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ patient, factorKey, postcode }),
  });
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/questions-to-ask                                             */
/* -------------------------------------------------------------------------- */

/**
 * Build a copy-pasteable list of questions the patient can take to a GP or
 * pharmacist. Returns { questions: [...], source }.
 */
export function fetchQuestions({ patient, postcode, live = false } = {}) {
  if (!patient || typeof patient !== "object") throw new Error("fetchQuestions: patient is required");
  const q = live ? "?live=1" : "";
  return jsonFetch(`/api/nhs/questions-to-ask${q}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ patient, postcode }),
  });
}

/* -------------------------------------------------------------------------- */
/* POST /api/nhs/unlock-narration                                             */
/* -------------------------------------------------------------------------- */

/**
 * After the patient has added a previously-missing measurement, ask the
 * server to narrate the change. Pass `previouslyMissing` = the list of
 * measurements that were missing BEFORE this update; the server will diff
 * against the current state and narrate only the ones the patient resolved.
 *
 * Returns { narration: string | null, resolved: string[], source }.
 */
export function fetchUnlockNarration({ patient, previouslyMissing, postcode, live = false } = {}) {
  if (!patient || typeof patient !== "object") throw new Error("fetchUnlockNarration: patient is required");
  if (!Array.isArray(previouslyMissing)) throw new Error("previouslyMissing must be an array");
  const q = live ? "?live=1" : "";
  return jsonFetch(`/api/nhs/unlock-narration${q}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ patient, previouslyMissing, postcode }),
  });
}

/* -------------------------------------------------------------------------- */
/* Sessions — local draft persistence                                         */
/* -------------------------------------------------------------------------- */

/**
 * Each session holds the patient draft, the postcode, and the snapshot of
 * "previously missing measurements" (used by /api/nhs/unlock-narration).
 * Backed by atomic JSON files on the server under data/sessions/<uuid>.json.
 * Sessions auto-expire after 24h by default (configurable via
 * SESSION_TTL_MS env on the server).
 *
 * Suggested UI usage:
 *   - On first page load: createSession() → save id to localStorage.
 *   - On subsequent loads: loadSession(id) → null means TTL expired,
 *     fall back to createSession().
 *   - On every form change: patchSession(id, { patient: { fieldX: value } }).
 *   - Before calling fetchProfile: optionally re-read the session to seed
 *     the request body.
 *   - On "clear demo" button: clearSession(id) then localStorage.remove.
 */

export function createSession(seed = {}) {
  return jsonFetch(`/api/nhs/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(seed),
  });
}

export function loadSession(id) {
  if (!id) throw new Error("loadSession: id is required");
  return jsonFetch(`/api/nhs/session/${encodeURIComponent(id)}`);
}

/**
 * Shallow-merge partial update. patient subobject is also shallow-merged
 * so passing { patient: { systolicBp: 122 } } leaves the rest of the
 * patient's saved fields intact.
 */
export function patchSession(id, partial) {
  if (!id) throw new Error("patchSession: id is required");
  return jsonFetch(`/api/nhs/session/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(partial),
  });
}

/**
 * Wholesale replace. Use when the UI is the canonical owner of the draft
 * and is writing the whole snapshot.
 */
export function saveSession(id, data) {
  if (!id) throw new Error("saveSession: id is required");
  return jsonFetch(`/api/nhs/session/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function clearSession(id) {
  if (!id) throw new Error("clearSession: id is required");
  return jsonFetch(`/api/nhs/session/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function listSessions() {
  return jsonFetch(`/api/nhs/session`);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Convenience: deterministic defaults for the seam PatientInput. Every field
 * is required by the schema except the optional measurements + sexAtBirth.
 * Merge your form data into this baseline before calling fetchProfile.
 */
export function emptyPatientInput() {
  return {
    age: 0,
    livesInEngland: true,
    hasCvd: false,
    hasChronicKidneyDisease: false,
    hasDiabetes: false,
    hasHypertension: false,
    hasAtrialFibrillation: false,
    hasStrokeOrTia: false,
    hasFamilialHypercholesterolaemia: false,
    hasHeartFailure: false,
    hasPeripheralArterialDisease: false,
    onStatins: false,
    previousHighCvdRisk: false,
    bpCheckedLast6Months: false,
    chestPain: false,
    strokeSymptoms: false,
    severeBreathlessness: false,
    // optional — leave undefined for "missing"
    sexAtBirth: undefined,
    systolicBp: undefined,
    diastolicBp: undefined,
    totalCholesterol: undefined,
    hdlCholesterol: undefined,
    bmi: undefined,
    waistCircumferenceCm: undefined,
    smokingStatus: undefined,
  };
}

/**
 * Map a data-quality enum to a short UI badge string. Use for the small
 * "live · cached · mock · failed" badges per panel.
 */
export function dataQualityBadge(value) {
  switch (value) {
    case "live":
      return { label: "Live", tone: "ok" };
    case "cached":
      return { label: "Cached", tone: "info" };
    case "synthetic":
      return { label: "Demo data", tone: "warn" };
    case "mock":
      return { label: "Mock", tone: "warn" };
    case "failed":
      return { label: "Unavailable", tone: "error" };
    case "not_loaded":
      return { label: "Not loaded", tone: "muted" };
    default:
      return { label: String(value), tone: "muted" };
  }
}
