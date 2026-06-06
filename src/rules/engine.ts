import type { PatientInput } from "../contracts/patient_input.js";
import type {
  HealthCheckEligibility,
  NextStepType,
  PreventiveAssessment,
  LocalService,
} from "./types.js";

/**
 * Pure, deterministic rules engine. Produces PreventiveAssessment from
 * PatientInput. Never calls an LLM, never touches the network.
 *
 * DESIGN DECISION (hackathon): risk_band is MISSING-DATA-ONLY. We do not
 * implement QRISK3 here. The engine emits "incomplete" whenever a measurement
 * is missing; it only ever emits low/moderate/high if a deterministic,
 * defensible basis exists. For now no such basis is wired in, so the demo
 * never emits low/moderate/high. The enum stays open because the renderer
 * already handles all four bands.
 */

const HEALTH_CHECK_MIN_AGE = 40;
const HEALTH_CHECK_MAX_AGE = 74;

/**
 * Always-on forbidden claims — the renderer is contractually barred from these.
 *
 * Vocabulary discipline: every claim here MUST share a substring with at least
 * one token in `FORBIDDEN_OUTPUT_TOKENS` (src/rendering/guardrails.ts). That
 * way, if the LLM disregards `forbidden_claims` and renders the claim, the
 * post-LLM token sweep is the last line of defence. The seam test
 * (test/seam.test.ts §2) enforces this invariant. See engine→guardrail
 * vocabulary contract.
 *
 *  "...diagnosed..."          ← caught by token "diagnos"
 *  "...prescribed drug..."    ← caught by token "prescrib"
 *  "...prescribed treatment..." ← caught by token "prescrib"
 *  "...X%..."                 ← caught by token "%"
 */
const ALWAYS_FORBIDDEN: readonly string[] = [
  "you are diagnosed with a condition",
  "you should start a prescribed drug",
  "you should stop a prescribed drug",
  "you should take a specific prescribed treatment",
  "your CVD risk is X%",
];

/* -------------------------------------------------------------------------- */
/* Sub-rules                                                                  */
/* -------------------------------------------------------------------------- */

const EXCLUSION_FLAGS: readonly (keyof PatientInput)[] = [
  "hasCvd",
  "hasChronicKidneyDisease",
  "hasDiabetes",
  "hasHypertension",
  "hasAtrialFibrillation",
  "hasStrokeOrTia",
  "hasFamilialHypercholesterolaemia",
  "hasHeartFailure",
  "hasPeripheralArterialDisease",
  "onStatins",
  "previousHighCvdRisk",
];

export function assessHealthCheckEligibility(
  input: PatientInput,
): HealthCheckEligibility {
  if (input.age < HEALTH_CHECK_MIN_AGE || input.age > HEALTH_CHECK_MAX_AGE) {
    return "not_age_eligible";
  }
  for (const flag of EXCLUSION_FLAGS) {
    if (input[flag] === true) return "not_eligible_existing_condition";
  }
  return "possibly";
}

/**
 * NHS pharmacy BP-check rule: adults 40+ in England, not already managing
 * hypertension, whose BP has NOT been checked in the last 6 months.
 */
export function bpCheckRoute(input: PatientInput): boolean {
  if (input.age < HEALTH_CHECK_MIN_AGE) return false;
  if (!input.livesInEngland) return false;
  if (input.hasHypertension) return false;
  if (input.bpCheckedLast6Months) return false;
  return true;
}

/**
 * Detect which preventive measurements are missing. We only ask for what the
 * NHS Health Check would actually use, and only when relevant to the patient.
 */
export function detectMissingMeasurements(input: PatientInput): string[] {
  const missing: string[] = [];
  if (input.systolicBp === undefined) missing.push("blood pressure");
  if (
    input.totalCholesterol === undefined ||
    input.hdlCholesterol === undefined
  ) {
    missing.push("cholesterol");
  }
  if (input.bmi === undefined && input.waistCircumferenceCm === undefined) {
    missing.push("BMI or waist circumference");
  }
  if (input.smokingStatus === undefined) missing.push("smoking status");
  return missing;
}

function hasRedFlagSymptoms(input: PatientInput): boolean {
  return (
    input.chestPain || input.strokeSymptoms || input.severeBreathlessness
  );
}

/* -------------------------------------------------------------------------- */
/* forbidden_claims producer                                                  */
/* -------------------------------------------------------------------------- */

function buildForbiddenClaims(
  _input: PatientInput,
  _nextStep: NextStepType,
): string[] {
  const claims = new Set<string>(ALWAYS_FORBIDDEN);

  // Renderer's job is preventive framing, not clinical labelling — never put
  // a diagnosis in the patient's mouth even if their input ticked a condition
  // flag. Vocabulary discipline (see ALWAYS_FORBIDDEN comment): every claim
  // here shares a substring with a guardrail token.
  //
  //   "...hypertension..."        ← caught by token "hypertension"
  //   "...hypertension..." (HBP)  ← caught by token "hypertension"
  //   "...diabetes..."            ← caught by token "diabetes"
  //   "...heart attack or stroke..." (CVD) ← caught by tokens "heart attack" + "stroke"
  claims.add("you have hypertension");
  claims.add("you have hypertension or high blood pressure");
  claims.add("you have diabetes");
  claims.add("you have CVD (a heart attack or stroke risk)");

  // Urgent-only bans ("preventive advice", "NHS Health Check is available")
  // intentionally NOT added here. Two reasons:
  //   1. The system prompt already gives the LLM a hard rule for urgent_care
  //      ("No preventive advice. No Health Check. No pharmacy.").
  //   2. The post-LLM render.ts urgent-text guard
  //      (assertUrgentTextClean) sweeps the rendered card for "health check",
  //      "preventive", "pharmacy" and falls back if any appear — this is the
  //      defence-in-depth equivalent of the forbidden_claims layer, scoped to
  //      urgent context only so it doesn't break legitimate Health Check
  //      framing on the other branches.
  // Adding them as forbidden_claims would force the seam test (which checks
  // every claim is catchable by a global guardrail token) to either widen the
  // global token list to include "preventive"/"health check" — which would
  // break the renderer's main job — or carve out an exception. Neither is
  // better than letting render.ts handle it.

  return Array.from(claims);
}

/* -------------------------------------------------------------------------- */
/* Internal invariants                                                        */
/* -------------------------------------------------------------------------- */

class InvariantError extends Error {}

/**
 * Internal coherence guards — these would indicate the engine had bugs (e.g.
 * the E3 case where ask_about_measurements was emitted with an empty missing
 * list). We assert before returning so the caller can never see an incoherent
 * assessment.
 */
function assertInvariants(a: PreventiveAssessment): void {
  if (
    a.next_step_type === "ask_gp_or_pharmacy_about_measurements" &&
    a.missing_measurements.length === 0
  ) {
    throw new InvariantError(
      "ask_gp_or_pharmacy_about_measurements emitted with empty missing_measurements (the E3 bug)",
    );
  }
  if (a.next_step_type === "urgent_care") {
    if (a.local_services && a.local_services.length > 0) {
      throw new InvariantError(
        "urgent_care must carry no local_services",
      );
    }
    if (a.eligible_for_health_check !== "not_applicable") {
      // Urgent override beats Health Check framing; the renderer reads
      // next_step_type === "urgent_care" as a hard signal and we pin
      // eligibility to "not_applicable" so the data stops trying to also
      // describe a Health Check eligibility status on a non-Health-Check
      // route.
      throw new InvariantError(
        `urgent_care must carry eligible_for_health_check='not_applicable', got '${a.eligible_for_health_check}'`,
      );
    }
  }
  if (a.risk_band !== "incomplete" && a.missing_measurements.length > 0) {
    throw new InvariantError(
      "non-incomplete risk_band with missing measurements — engine cannot defensibly emit a band",
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Top-level decision tree                                                    */
/* -------------------------------------------------------------------------- */

export interface AssessOptions {
  localServices?: LocalService[];
}

export function assessPreventiveRoute(
  input: PatientInput,
  options: AssessOptions = {},
): PreventiveAssessment {
  // 1. Red-flag symptoms ALWAYS win. No services, no Health Check framing.
  if (hasRedFlagSymptoms(input)) {
    const a: PreventiveAssessment = {
      risk_band: "incomplete",
      missing_measurements: [],
      // Eligibility is not a meaningful concept on the urgent_care branch
      // (the patient has a red-flag symptom; Health Check is the wrong route
      // regardless of age or comorbidity). Pinning to "not_applicable"
      // avoids misrepresenting reality — a 50yo with chest pain doesn't have
      // "an existing condition", and the system_prompt reads
      // next_step_type === "urgent_care" as the dominant signal anyway.
      eligible_for_health_check: "not_applicable",
      next_step_type: "urgent_care",
      local_services: [],
      forbidden_claims: buildForbiddenClaims(input, "urgent_care"),
    };
    assertInvariants(a);
    return a;
  }

  const eligibility = assessHealthCheckEligibility(input);
  const missing = detectMissingMeasurements(input);
  const services = options.localServices ?? [];

  // 2. Missing measurements (and patient is in pharmacy-BP territory) — push to
  //    pharmacy BP check. This branch wins over the generic
  //    "ask_gp_or_pharmacy_about_measurements" because it's a more specific,
  //    actionable route the NHS funds.
  if (missing.includes("blood pressure") && bpCheckRoute(input)) {
    const a: PreventiveAssessment = {
      risk_band: "incomplete",
      missing_measurements: missing,
      eligible_for_health_check: eligibility,
      next_step_type: "pharmacy_bp_check",
      local_services: services,
      forbidden_claims: buildForbiddenClaims(input, "pharmacy_bp_check"),
    };
    assertInvariants(a);
    return a;
  }

  // 3. Any other missing measurements => generic "ask GP or pharmacy" route.
  if (missing.length > 0) {
    const a: PreventiveAssessment = {
      risk_band: "incomplete",
      missing_measurements: missing,
      eligible_for_health_check: eligibility,
      next_step_type: "ask_gp_or_pharmacy_about_measurements",
      local_services: services,
      forbidden_claims: buildForbiddenClaims(
        input,
        "ask_gp_or_pharmacy_about_measurements",
      ),
    };
    assertInvariants(a);
    return a;
  }

  // 4. All measurements present, no urgent symptoms. Demo cannot defensibly
  //    band risk without QRISK3 (out of scope this turn), so stay "incomplete"
  //    and route to GP review. This is the conservative default.
  const a: PreventiveAssessment = {
    risk_band: "incomplete",
    missing_measurements: [],
    eligible_for_health_check: eligibility,
    next_step_type: "gp_review",
    local_services: services,
    forbidden_claims: buildForbiddenClaims(input, "gp_review"),
  };
  assertInvariants(a);
  return a;
}
