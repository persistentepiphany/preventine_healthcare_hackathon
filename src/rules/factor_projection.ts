/**
 * Factor projection: PatientInput → 9-factor list with status enums.
 *
 * Pure, deterministic, no LLM, no IO. The output is structured data only —
 * enum status values, factor ids, priority — designed to feed UI components
 * (factor chips, readiness ring) without ever passing through the renderer's
 * LLM path. Human-readable labels / "why it matters" text come from a separate
 * engineer-authored vocabulary file (`data/ui-vocabulary.json`) loaded by the
 * HTTP layer; this module emits only the ids and statuses so the safety
 * contract that screens model output isn't relevant here — there is no model
 * output to screen.
 *
 * Status taxonomy
 * ---------------
 *   recorded   — the patient gave us a value (any value).
 *   protective — the patient gave us a value AND it is the "favourable" state
 *                for this factor: no condition / non-smoker. Used only on the
 *                seven binary factors. The two measurement factors (BP,
 *                cholesterol) never qualify as "protective" here because the
 *                seam engine does not band them — we can't say a single
 *                reading is "favourable" without QRISK3.
 *   unknown    — the patient field is undefined / absent.
 *
 * Why nine factors
 * ----------------
 * NHS Health Check + NICE NG238 list the same set of inputs every preventive
 * cardiovascular conversation needs: age, BP, cholesterol/HDL, smoking,
 * BMI/waist, plus the four NHS Health Check exclusion comorbidities that
 * change the pathway (CVD, diabetes, hypertension, CKD). That's nine.
 * Statins / AF / stroke / heart failure / PAD / FH / previous high CVD risk
 * are also exclusion flags in the seam, but the UI mock only shows nine
 * chips, so the projection collapses the remaining exclusions into
 * `pastConditions` separately if any caller wants them. The nine here are the
 * ones the UI is built around.
 */
import type { PatientInput } from "../contracts/patient_input.js";

export type FactorId =
  | "age"
  | "blood_pressure"
  | "cholesterol"
  | "smoking"
  | "bmi_or_waist"
  | "cvd_history"
  | "diabetes"
  | "hypertension"
  | "kidney_disease";

export type FactorStatus = "recorded" | "protective" | "unknown";
export type FactorPriority = "high" | "medium" | "low";

export interface Factor {
  id: FactorId;
  status: FactorStatus;
  priority: FactorPriority;
}

/**
 * Aggregate readiness signal the UI renders as a ring / progress bar.
 * Defined here so the projection is self-contained and the UI can render the
 * ring from the same payload that drove the chip list.
 */
export interface FactorReadiness {
  total: number;
  recorded: number;
  protective: number;
  unknown: number;
  /** 0-100; (recorded + protective) / total. */
  percent: number;
}

/* -------------------------------------------------------------------------- */
/* Individual factor evaluators                                               */
/* -------------------------------------------------------------------------- */

function ageFactor(input: PatientInput): Factor {
  // Age is required in PatientInputSchema, so it is always recorded.
  return { id: "age", status: "recorded", priority: "high" };
}

function bpFactor(input: PatientInput): Factor {
  if (input.systolicBp === undefined || input.diastolicBp === undefined) {
    return { id: "blood_pressure", status: "unknown", priority: "high" };
  }
  return { id: "blood_pressure", status: "recorded", priority: "high" };
}

function cholesterolFactor(input: PatientInput): Factor {
  if (input.totalCholesterol === undefined || input.hdlCholesterol === undefined) {
    return { id: "cholesterol", status: "unknown", priority: "high" };
  }
  return { id: "cholesterol", status: "recorded", priority: "high" };
}

function smokingFactor(input: PatientInput): Factor {
  if (input.smokingStatus === undefined) {
    return { id: "smoking", status: "unknown", priority: "medium" };
  }
  // Non-smokers ("never" or "former") are the favourable state for the
  // smoking factor — no CVD-risk contribution from active smoking. We treat
  // "former" as protective on the deliberate hackathon design that the UI's
  // chip rewards quitting; if the team later wants "former" demoted, the
  // engine flags it here as a one-line change.
  if (input.smokingStatus === "never" || input.smokingStatus === "former") {
    return { id: "smoking", status: "protective", priority: "medium" };
  }
  return { id: "smoking", status: "recorded", priority: "medium" };
}

function bmiOrWaistFactor(input: PatientInput): Factor {
  if (input.bmi === undefined && input.waistCircumferenceCm === undefined) {
    return { id: "bmi_or_waist", status: "unknown", priority: "medium" };
  }
  return { id: "bmi_or_waist", status: "recorded", priority: "medium" };
}

/**
 * Binary comorbidity factor evaluator. "Protective" means the patient told us
 * they don't have the condition (false); "recorded" means they told us they
 * do (true). PatientInputSchema makes these booleans required, so there is no
 * "unknown" branch here — the seam form contract guarantees a value.
 */
function comorbidityFactor(
  id: FactorId,
  has: boolean,
  priority: FactorPriority,
): Factor {
  return { id, status: has ? "recorded" : "protective", priority };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Produce the canonical 9-factor list for a PatientInput. Order is stable:
 * the UI can render chips in the order returned and the ordering will not
 * drift across runs.
 */
export function projectFactors(input: PatientInput): Factor[] {
  return [
    ageFactor(input),
    bpFactor(input),
    cholesterolFactor(input),
    smokingFactor(input),
    bmiOrWaistFactor(input),
    comorbidityFactor("cvd_history", input.hasCvd, "high"),
    comorbidityFactor("diabetes", input.hasDiabetes, "high"),
    comorbidityFactor("hypertension", input.hasHypertension, "high"),
    comorbidityFactor("kidney_disease", input.hasChronicKidneyDisease, "medium"),
  ];
}

/**
 * Aggregate the per-factor statuses into the readiness signal the UI renders.
 * `percent` rounds half-up to the nearest integer so the ring renders cleanly.
 */
export function summariseReadiness(factors: Factor[]): FactorReadiness {
  let recorded = 0;
  let protective = 0;
  let unknown = 0;
  for (const f of factors) {
    if (f.status === "recorded") recorded++;
    else if (f.status === "protective") protective++;
    else unknown++;
  }
  const total = factors.length;
  const percent = total === 0 ? 0 : Math.round(((recorded + protective) / total) * 100);
  return { total, recorded, protective, unknown, percent };
}
