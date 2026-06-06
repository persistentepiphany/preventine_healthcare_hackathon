/**
 * Bridge: seam PatientInput  →  rich (src/lib/rules) engine  →  flat seam shape
 *
 * The seam engine (src/rules/engine.ts) is the renderer's contract. The rich
 * engine (src/lib/rules/*) was developed in parallel and carries useful extra
 * signal — broader red-flag taxonomy, screening matches (cervical, breast,
 * colorectal, AAA, diabetic eye), QRISK readiness with stale-data tracking,
 * and prioritized recommendation cards. This bridge runs the rich engine
 * over the same patient and:
 *
 *   1. Projects its output DOWN to the flat seam shape so the renderer can
 *      consume it unchanged (same contract, second opinion).
 *   2. Surfaces the rich-only extras as a structured side-channel
 *      (`extras`) so callers that want screening/QRISK signal can read it
 *      without breaking the seam.
 *
 * No clinical judgement was changed in either engine — this only translates.
 */
import type { PatientInput as SeamPatientInput } from "../contracts/patient_input.js";
import type {
  PreventiveAssessment as SeamAssessment,
  HealthCheckEligibility,
  LocalService,
  NextStepType,
} from "./types.js";
import type {
  PatientInput as RichPatientInput,
  LocalContext as RichLocalContext,
  PreventiveAssessment as RichAssessment,
  ScreeningMatch,
  QriskReadiness,
  Recommendation,
} from "../lib/rules/types.js";
import { assessPreventiveRoute as runRichEngine } from "../lib/rules/assessPreventiveRoute.js";
import { bpCheckRoute } from "./engine.js";

/**
 * Map seam red-flag booleans to the rich engine's red-flag string taxonomy.
 * The rich engine's emergency set includes broader stroke / collapse signals;
 * the seam's `strokeSymptoms` boolean fans out to all three FAST indicators.
 */
function mapRedFlags(input: SeamPatientInput): string[] {
  const flags: string[] = [];
  if (input.chestPain) flags.push("chest_pain");
  if (input.severeBreathlessness) flags.push("severe_breathlessness");
  if (input.strokeSymptoms) {
    flags.push("face_drooping", "speech_difficulty", "sudden_weakness_or_numbness");
  }
  return flags;
}

/**
 * Translate the seam's deterministic PatientInput into the rich engine's
 * input shape. Cholesterol ratio is derived only when both numerator and
 * denominator are present — never imputed.
 */
export function toRichInput(input: SeamPatientInput): RichPatientInput {
  const cholesterolRatio =
    input.totalCholesterol !== undefined && input.hdlCholesterol !== undefined
      ? input.totalCholesterol / input.hdlCholesterol
      : undefined;

  return {
    age: input.age,
    smoker: input.smokingStatus === "current",
    hasCvd: input.hasCvd,
    hasDiabetes: input.hasDiabetes,
    hasKidneyDisease: input.hasChronicKidneyDisease,
    hasHypertension: input.hasHypertension,
    onStatins: input.onStatins,
    systolicBp: input.systolicBp,
    diastolicBp: input.diastolicBp,
    cholesterolRatio,
    bmi: input.bmi,
    waistCm: input.waistCircumferenceCm,
    redFlags: mapRedFlags(input),
  } as RichPatientInput;
}

/**
 * Map the rich HealthCheckEligibility object onto the flat seam enum.
 *  - possibly_eligible              → "possibly"
 *  - not_eligible & ageEligible     → "not_eligible_existing_condition"
 *  - not_eligible & !ageEligible    → "not_age_eligible"
 *  - not_applicable                 → "not_applicable"
 *  - insufficient_information       → "not_age_eligible" (data gap, treat as ineligible)
 */
function projectEligibility(rich: RichAssessment): HealthCheckEligibility {
  const e = rich.healthCheckEligibility;
  switch (e.status) {
    case "possibly_eligible":
      return "possibly";
    case "not_eligible":
      return e.ageEligible ? "not_eligible_existing_condition" : "not_age_eligible";
    case "not_applicable":
      return "not_applicable";
    case "insufficient_information":
    default:
      return "not_age_eligible";
  }
}

/**
 * Project the rich MissingMeasurement list into the seam's flat string list.
 * The seam vocabulary is fixed ("blood pressure", "cholesterol",
 * "BMI or waist circumference", "smoking status") so we map on canonical keys
 * and dedupe.
 */
function projectMissing(rich: RichAssessment): string[] {
  const out = new Set<string>();
  for (const m of rich.missingMeasurements) {
    const key = m.key ?? "";
    if (key === "blood_pressure") out.add("blood pressure");
    else if (key === "cholesterol" || key === "cholesterol_hdl" || key === "cholesterol_hdl_ratio")
      out.add("cholesterol");
    else if (key === "bmi" || key === "waist" || key === "bmi_waist" || key === "bmi_or_waist")
      out.add("BMI or waist circumference");
    else if (key === "smoking" || key === "smoking_status") out.add("smoking status");
  }
  return Array.from(out);
}

/**
 * Decide the seam's `next_step_type` from the rich engine's output, preserving
 * the seam's precedence rules:
 *   1. urgent override (rich emergency/urgent)
 *   2. missing BP & patient is in NHS pharmacy-BP-check window → pharmacy_bp_check
 *   3. any other missing measurement → ask_gp_or_pharmacy_about_measurements
 *   4. all measurements present → gp_review
 */
function projectNextStep(
  input: SeamPatientInput,
  rich: RichAssessment,
  missing: string[],
): NextStepType {
  if (rich.urgency.level === "emergency" || rich.urgency.level === "urgent") {
    return "urgent_care";
  }
  if (missing.includes("blood pressure") && bpCheckRoute(input)) {
    return "pharmacy_bp_check";
  }
  if (missing.length > 0) return "ask_gp_or_pharmacy_about_measurements";
  return "gp_review";
}

/**
 * Always-on forbidden claims (mirror of src/rules/engine.ts ALWAYS_FORBIDDEN).
 * Kept in sync by hand because both engines need to land on the same seam
 * post-projection — see the vocabulary contract in src/rules/engine.ts.
 */
const ALWAYS_FORBIDDEN: readonly string[] = [
  "you are diagnosed with a condition",
  "you should start a prescribed drug",
  "you should stop a prescribed drug",
  "you should take a specific prescribed treatment",
  "your CVD risk is X%",
  "you have hypertension",
  "you have hypertension or high blood pressure",
  "you have diabetes",
  "you have CVD (a heart attack or stroke risk)",
];

/**
 * Extras the rich engine produces that the flat seam doesn't carry. The
 * renderer can ignore this entirely; analytics / GP-summary builders can
 * surface it as additional context.
 */
export interface RichExtras {
  /** Population screening matches the rich engine surfaced (cervical, AAA, etc.) */
  screeningMatches: ScreeningMatch[];
  /** QRISK readiness — flags stale/missing inputs for a CVD risk estimate */
  qrisk: QriskReadiness;
  /** Prioritised recommendation cards from the rich engine */
  recommendations: Recommendation[];
  /** Rich-engine urgency level (verbose: routine/soon/urgent/emergency) */
  urgencyLevel: RichAssessment["urgency"]["level"];
  /** Whether emergency services are indicated (rich `requiresEmergencyServices`) */
  requiresEmergencyServices: boolean;
}

/**
 * Run the rich engine and return both the flat seam projection and the
 * rich-only extras. Pure function; no IO.
 */
export function assessViaSafetyEngine(
  input: SeamPatientInput,
  options: { localServices?: LocalService[]; localContext?: RichLocalContext } = {},
): { assessment: SeamAssessment; extras: RichExtras } {
  const richInput = toRichInput(input);
  const rich = runRichEngine(richInput, options.localContext ?? {});

  const services = options.localServices ?? [];
  const isUrgent = rich.urgency.level === "emergency" || rich.urgency.level === "urgent";
  const missing = isUrgent ? [] : projectMissing(rich);
  const eligibility: HealthCheckEligibility = isUrgent ? "not_applicable" : projectEligibility(rich);
  const nextStep = projectNextStep(input, rich, missing);

  const assessment: SeamAssessment = {
    risk_band: "incomplete",
    missing_measurements: missing,
    eligible_for_health_check: eligibility,
    next_step_type: nextStep,
    local_services: isUrgent ? [] : services,
    forbidden_claims: [...ALWAYS_FORBIDDEN],
  };

  const extras: RichExtras = {
    screeningMatches: rich.screeningMatches,
    qrisk: rich.qrisk,
    recommendations: rich.recommendations,
    urgencyLevel: rich.urgency.level,
    requiresEmergencyServices: rich.urgency.requiresEmergencyServices,
  };

  return { assessment, extras };
}
