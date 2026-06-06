import type { PatientInput } from "../contracts/patient_input.js";

/**
 * A patient-facing "factor chip" derived from PatientInput. Used by the
 * factor-explain and questions-to-ask renderers as the structured truth the
 * LLM is allowed to phrase calmly. No clinical inference happens here — the
 * chip is a verbatim restatement of one input field with a friendly label.
 *
 * The LLM is forbidden from inventing values, so every value carried here MUST
 * be a literal echo of the input (with unit suffix where applicable).
 */
export interface FactorChip {
  /** Stable machine key — used as the cache filename suffix and the request param. */
  key: string;
  /** Short patient-facing label, e.g. "Raised waist". */
  label: string;
  /** Patient-facing value with unit, e.g. "102 cm". Empty string when binary. */
  value: string;
}

// PatientInput has no sex field, so we apply a single conservative threshold.
const RAISED_WAIST_CM = 94;

function waistLabel(cm: number): string {
  return cm >= RAISED_WAIST_CM ? "Raised waist measurement" : "Waist measurement";
}

function bmiLabel(bmi: number): string {
  if (bmi >= 30) return "BMI in the higher range";
  if (bmi >= 25) return "BMI just above the healthy range";
  if (bmi < 18.5) return "BMI in the lower range";
  return "BMI in the healthy range";
}

function smokingLabel(s: "never" | "former" | "current"): string {
  if (s === "current") return "Current smoker";
  if (s === "former") return "Ex-smoker";
  return "Never smoked";
}

function ageBandLabel(age: number): string {
  if (age < 40) return "Under 40";
  if (age <= 74) return "Aged 40–74 (NHS Health Check age range)";
  return "Over 74";
}

/**
 * Build the patient's chip list from validated PatientInput. The list is
 * ordered for stable cache keys and stable UI rendering: age, then
 * measurements in the order they appear on a Health Check, then smoking,
 * then condition flags (only when true).
 *
 * Reference for thresholds:
 *   - RAISED_WAIST_CM_FEMALE intentionally unused: the input has no sex field.
 *     We use the conservative generic threshold instead.
 */
export function derivePatientFactors(patient: PatientInput): FactorChip[] {
  const chips: FactorChip[] = [];

  chips.push({ key: "age", label: ageBandLabel(patient.age), value: `${patient.age}` });

  if (patient.systolicBp !== undefined && patient.diastolicBp !== undefined) {
    chips.push({
      key: "bloodPressure",
      label: "Blood pressure on file",
      value: `${patient.systolicBp}/${patient.diastolicBp} mmHg`,
    });
  }

  if (patient.totalCholesterol !== undefined) {
    chips.push({
      key: "totalCholesterol",
      label: "Total cholesterol on file",
      value: `${patient.totalCholesterol} mmol/L`,
    });
  }

  if (patient.hdlCholesterol !== undefined) {
    chips.push({
      key: "hdlCholesterol",
      label: "HDL cholesterol on file",
      value: `${patient.hdlCholesterol} mmol/L`,
    });
  }

  if (patient.bmi !== undefined) {
    chips.push({
      key: "bmi",
      label: bmiLabel(patient.bmi),
      value: `${patient.bmi}`,
    });
  }

  if (patient.waistCircumferenceCm !== undefined) {
    chips.push({
      key: "waistCircumferenceCm",
      label: waistLabel(patient.waistCircumferenceCm),
      value: `${patient.waistCircumferenceCm} cm`,
    });
  }

  if (patient.smokingStatus !== undefined) {
    chips.push({
      key: "smokingStatus",
      label: smokingLabel(patient.smokingStatus),
      value: "",
    });
  }

  // Condition flags — only when true. We DO NOT translate flag names into a
  // diagnostic phrasing; the chip label is "On record" and the patient's GP
  // can elaborate. This is deliberate: the renderer must never invent a
  // diagnosis the patient didn't already self-report.
  const flagLabels: { key: keyof PatientInput; label: string }[] = [
    { key: "hasCvd", label: "Cardiovascular history on record" },
    { key: "hasChronicKidneyDisease", label: "Kidney condition on record" },
    { key: "hasDiabetes", label: "Diabetes on record" },
    { key: "hasHypertension", label: "Raised blood pressure on record" },
    { key: "hasAtrialFibrillation", label: "Irregular heartbeat on record" },
    { key: "hasStrokeOrTia", label: "Stroke or TIA on record" },
    { key: "hasFamilialHypercholesterolaemia", label: "Familial cholesterol condition on record" },
    { key: "hasHeartFailure", label: "Heart failure on record" },
    { key: "hasPeripheralArterialDisease", label: "Peripheral arterial condition on record" },
    { key: "onStatins", label: "Currently on statins" },
    { key: "previousHighCvdRisk", label: "Previous high CVD risk on record" },
  ];

  for (const { key, label } of flagLabels) {
    if (patient[key] === true) {
      chips.push({ key: key as string, label, value: "" });
    }
  }

  return chips;
}

export function findFactor(
  chips: FactorChip[],
  key: string,
): FactorChip | undefined {
  return chips.find((c) => c.key === key);
}
