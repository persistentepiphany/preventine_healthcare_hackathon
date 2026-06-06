/**
 * FROZEN SEAM: shared between the rules engine, the ingestion adapter, and the
 * rendering layer. Do not extend without coordinating across all three tracks.
 */

export type RiskBand = "incomplete" | "low" | "moderate" | "high";

export type HealthCheckEligibility =
  | "possibly"
  | "not_age_eligible"
  | "not_eligible_existing_condition";

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
] as const;

export const NEXT_STEP_TYPES: readonly NextStepType[] = [
  "ask_gp_or_pharmacy_about_measurements",
  "pharmacy_bp_check",
  "gp_review",
  "urgent_care",
] as const;
