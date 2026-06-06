/**
 * FROZEN SEAM: shared between the rules engine, the ingestion adapter, and the
 * rendering layer. Do not extend without coordinating across all three tracks.
 */

export type RiskBand = "incomplete" | "low" | "moderate" | "high";

export type HealthCheckEligibility =
  | "possibly"
  | "not_age_eligible"
  | "not_eligible_existing_condition"
  // Used by the engine on the urgent_care branch: NHS Health Check eligibility
  // is irrelevant when the patient has a red-flag symptom. The renderer reads
  // next_step_type === "urgent_care" as the dominant signal and ignores
  // eligibility on that branch; this value just stops the data from lying
  // (a 50yo with chest pain does not have "an existing condition").
  | "not_applicable";

export type NextStepType =
  | "ask_gp_or_pharmacy_about_measurements"
  | "pharmacy_bp_check"
  | "gp_review"
  | "urgent_care";

export interface LocalService {
  name: string;
  type: string;
}

export interface PreventiveAssessment {
  risk_band: RiskBand;
  missing_measurements: string[];
  eligible_for_health_check: HealthCheckEligibility;
  next_step_type: NextStepType;
  local_services?: LocalService[];
  forbidden_claims: string[];
}

export const RISK_BANDS: readonly RiskBand[] = [
  "incomplete",
  "low",
  "moderate",
  "high",
] as const;

export const HEALTH_CHECK_ELIGIBILITY: readonly HealthCheckEligibility[] = [
  "possibly",
  "not_age_eligible",
  "not_eligible_existing_condition",
  "not_applicable",
] as const;

export const NEXT_STEP_TYPES: readonly NextStepType[] = [
  "ask_gp_or_pharmacy_about_measurements",
  "pharmacy_bp_check",
  "gp_review",
  "urgent_care",
] as const;
