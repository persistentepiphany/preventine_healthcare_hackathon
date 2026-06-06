import { z } from "zod";

/**
 * PatientInput is the deterministic input to the rules engine. It mirrors what
 * a single web form would submit. All fields are explicit booleans / numbers /
 * literal unions — no free text, no clinical notes — so the engine can reach a
 * defensible decision without an LLM and without guessing.
 *
 * Exclusion conditions follow the NHS Health Check ineligibility list. Red-flag
 * symptoms drive the urgent_care override (highest precedence).
 */

export const SmokingStatusSchema = z.enum(["never", "former", "current"]);
export type SmokingStatus = z.infer<typeof SmokingStatusSchema>;

export const PatientInputSchema = z.object({
  age: z.number().int().min(0).max(120),
  livesInEngland: z.boolean(),

  // NHS Health Check exclusion conditions. Any true => not_eligible_existing_condition.
  hasCvd: z.boolean(),
  hasChronicKidneyDisease: z.boolean(),
  hasDiabetes: z.boolean(),
  hasHypertension: z.boolean(),
  hasAtrialFibrillation: z.boolean(),
  hasStrokeOrTia: z.boolean(),
  hasFamilialHypercholesterolaemia: z.boolean(),
  hasHeartFailure: z.boolean(),
  hasPeripheralArterialDisease: z.boolean(),
  onStatins: z.boolean(),
  previousHighCvdRisk: z.boolean(),

  // Measurements. Undefined => missing => engine emits "incomplete".
  systolicBp: z.number().min(60).max(260).optional(),
  diastolicBp: z.number().min(30).max(160).optional(),
  totalCholesterol: z.number().min(1).max(15).optional(),
  hdlCholesterol: z.number().min(0.2).max(5).optional(),
  bmi: z.number().min(10).max(80).optional(),
  waistCircumferenceCm: z.number().min(40).max(200).optional(),
  smokingStatus: SmokingStatusSchema.optional(),

  // BP route input: was the patient's BP checked in the last 6 months?
  bpCheckedLast6Months: z.boolean(),

  // Red-flag symptoms — any true forces next_step_type = "urgent_care" and stops
  // everything else. Engine MUST emit no services and no Health Check framing.
  chestPain: z.boolean(),
  strokeSymptoms: z.boolean(),
  severeBreathlessness: z.boolean(),
});

export type PatientInput = z.infer<typeof PatientInputSchema>;

export type PatientInputValidation =
  | { ok: true; value: PatientInput }
  | { ok: false; issues: { path: string; message: string }[] };

export function parsePatientInput(raw: unknown): PatientInputValidation {
  const r = PatientInputSchema.safeParse(raw);
  if (r.success) return { ok: true, value: r.data };
  return {
    ok: false,
    issues: r.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  };
}
