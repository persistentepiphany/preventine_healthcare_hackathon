import {
  HEALTH_CHECK_ELIGIBILITY,
  NEXT_STEP_TYPES,
  RISK_BANDS,
  type PreventiveAssessment,
} from "../rules/types.js";

const ALLOWED_TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
  "risk_band",
  "missing_measurements",
  "eligible_for_health_check",
  "next_step_type",
  "local_services",
  "forbidden_claims",
]);

const REQUIRED_KEYS: readonly string[] = [
  "risk_band",
  "missing_measurements",
  "eligible_for_health_check",
  "next_step_type",
  "forbidden_claims",
] as const;

/**
 * Off-schema fields that strongly suggest the upstream is trying to push the
 * renderer toward diagnosing / prescribing. Presence of any of these forces the
 * safe fallback, even if the rest of the object validates.
 */
const FORBIDDEN_EXTRA_KEYS: ReadonlySet<string> = new Set([
  "diagnosis",
  "diagnoses",
  "condition",
  "prescribed_drug",
  "prescription",
  "medication",
  "drug",
  "dose",
  "dosage",
  "treatment",
  "recommend",
  "recommendation",
  "advice",
  "extra_advice",
  "notes",
  "clinical_notes",
  "free_text",
  "instruction",
  "instructions",
]);

const isNonLatinCharRe = /[^\u0000-\u024F\u2000-\u206F]/;

export type GuardrailResult =
  | { ok: true; value: PreventiveAssessment }
  | { ok: false; reason: string };

export function validateAssessment(input: unknown): GuardrailResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, reason: "input is not a plain object" };
  }
  const obj = input as Record<string, unknown>;

  for (const key of REQUIRED_KEYS) {
    if (!(key in obj)) return { ok: false, reason: `missing required key: ${key}` };
  }

  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_EXTRA_KEYS.has(key)) {
      return { ok: false, reason: `clinical field outside schema: ${key}` };
    }
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      return { ok: false, reason: `unknown field: ${key}` };
    }
  }

  if (typeof obj.risk_band !== "string" || !RISK_BANDS.includes(obj.risk_band as never)) {
    return { ok: false, reason: "invalid risk_band" };
  }
  if (
    typeof obj.eligible_for_health_check !== "string" ||
    !HEALTH_CHECK_ELIGIBILITY.includes(obj.eligible_for_health_check as never)
  ) {
    return { ok: false, reason: "invalid eligible_for_health_check" };
  }
  if (typeof obj.next_step_type !== "string" || !NEXT_STEP_TYPES.includes(obj.next_step_type as never)) {
    return { ok: false, reason: "invalid next_step_type" };
  }

  if (!Array.isArray(obj.missing_measurements)) {
    return { ok: false, reason: "missing_measurements must be array" };
  }
  for (const m of obj.missing_measurements) {
    if (typeof m !== "string") return { ok: false, reason: "non-string measurement" };
    if (isNonLatinCharRe.test(m)) {
      return { ok: false, reason: "non-latin measurement text — refusing to rephrase what we can't validate" };
    }
  }

  if (!Array.isArray(obj.forbidden_claims)) {
    return { ok: false, reason: "forbidden_claims must be array" };
  }
  for (const c of obj.forbidden_claims) {
    if (typeof c !== "string") return { ok: false, reason: "non-string forbidden_claim" };
  }

  if (obj.local_services !== undefined) {
    if (!Array.isArray(obj.local_services)) {
      return { ok: false, reason: "local_services must be array" };
    }
    for (const s of obj.local_services) {
      if (typeof s !== "object" || s === null) {
        return { ok: false, reason: "non-object service" };
      }
      const svc = s as Record<string, unknown>;
      if (typeof svc.name !== "string" || typeof svc.type !== "string") {
        return { ok: false, reason: "service missing name/type" };
      }
    }
  }

  return { ok: true, value: obj as unknown as PreventiveAssessment };
}

/**
 * Tokens that must never appear in rendered card body/headline/next_step.
 * Forbidden because they imply diagnosis, prescription, or specific treatment
 * choice — all of which the renderer is contractually barred from producing.
 * Service names are NOT screened (they're copied verbatim from input.local_services).
 */
export const FORBIDDEN_OUTPUT_TOKENS: readonly string[] = [
  "statin",
  "aspirin",
  "metformin",
  "ibuprofen",
  "paracetamol",
  "warfarin",
  "insulin",
  "mg",
  "mcg",
  "%",
  "diagnos",
  "prescrib",
  "surgery",
  "operation",
  "bariatric",
  "hypertension",
  "diabetes",
  "heart attack",
  "stroke",
  "tumor",
  "tumour",
  "cancer",
  "malignan",
] as const;

export function containsForbiddenToken(text: string): string | null {
  const lower = text.toLowerCase();
  for (const t of FORBIDDEN_OUTPUT_TOKENS) {
    if (lower.includes(t)) return t;
  }
  return null;
}
