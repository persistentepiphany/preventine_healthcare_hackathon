/**
 * Core types for the PreventPath rules engine
 *
 * Safety layer: This module defines pure data structures.
 * Rules process input deterministically and return structured output.
 * No diagnosis, treatment advice, or clinical scoring.
 */

/**
 * Patient demographic data required for rules evaluation
 */
export interface PatientDemographics {
  age: number;
  sex: 'male' | 'female';
  postcode?: string;
  hasRegisteredGP: boolean;
}

/**
 * Risk factors relevant to preventive care eligibility
 */
export interface RiskFactors {
  familyHistory?: {
    cardiovascularDisease?: boolean;
    diabetes?: boolean;
    hypertension?: boolean;
  };
  lifestyle?: {
    smokingStatus?: 'never' | 'ex' | 'current';
    alcoholUnitsPerWeek?: number;
  };
  ethnicity?: string;
  comorbidities?: string[];
}

/**
 * Blood pressure reading
 */
export interface BloodPressureReading {
  systolic: number;
  diastolic: number;
  dateRecorded: string;
}

/**
 * Blood test results relevant to preventive care
 */
export interface BloodTestResult {
  type: 'cholesterol' | 'hba1c' | 'creatinine' | 'other';
  value: number;
  unit: string;
  dateRecorded: string;
}

/**
 * Clinical observation or measurement
 */
export interface Measurement {
  type: 'bmi' | 'weight' | 'height' | 'waist_circumference' | 'other';
  value: number;
  unit: string;
  dateRecorded: string;
}

/**
 * Preventive care screening type
 */
export type ScreeningType =
  | 'health_check'
  | 'qrisk'
  | 'blood_pressure'
  | 'cholesterol'
  | 'hba1c'
  | 'bmi'
  | 'smoking_review'
  | 'alcohol_review'
  | 'cervical_screening'
  | 'breast_screening'
  | 'colorectal_screening'
  | 'abdominal_aortic_aneurysm'
  | 'diabetic_eye_screening';

/**
 * Urgency level for follow-up
 */
export type UrgencyLevel = 'none' | 'routine' | 'soonest' | 'urgent';

/**
 * Eligibility status for a preventive care service
 */
export type EligibilityStatus = 'eligible' | 'not_eligible' | 'unsure';

/**
 * Eligibility result for a specific screening
 */
export interface EligibilityResult {
  screeningType: ScreeningType;
  status: EligibilityStatus;
  reason: string;
  dueDate?: string;
  urgency: UrgencyLevel;
  prerequisites: ScreeningType[];
  blockedBy: string[];
}

/**
 * Recommendation action
 */
export type RecommendationAction =
  | 'book_appointment'
  | 'update_measurements'
  | 'review_with_clinician'
  | 'self_monitor'
  | 'lifestyle_consideration'
  | 'information_only';

/**
 * Individual recommendation
 */
export interface Recommendation {
  id: string;
  action: RecommendationAction;
  priority: 'low' | 'medium' | 'high';
  category: ScreeningType;
  title: string;
  description: string;
  applicableSince: string;
}

/**
 * GP summary item for clinician review
 */
export interface GPSummaryItem {
  category: string;
  title: string;
  details: string;
  urgency: UrgencyLevel;
  actionRequired: boolean;
  lastUpdated: string;
}

/**
 * Complete preventive care assessment result
 */
export interface PreventiveCareResult {
  patientId: string;
  assessmentDate: string;
  eligibility: EligibilityResult[];
  recommendations: Recommendation[];
  gpSummary: GPSummaryItem[];
  missingMeasurements: ScreeningType[];
  route: PreventiveRoute;
}

/**
 * Preventive care routing decision
 */
export interface PreventiveRoute {
  primaryRoute: 'self_serve' | 'clinician_review' | 'urgent_referral';
  secondaryRoute?: PreventiveRoute['primaryRoute'];
  reason: string;
  requiresSafetyLayerReview: boolean;
}

/**
 * Input data for rules engine evaluation
 */
export interface RulesEngineInput {
  patientId: string;
  demographics: PatientDemographics;
  riskFactors: RiskFactors;
  bloodPressureHistory?: BloodPressureReading[];
  bloodTestHistory?: BloodTestResult[];
  measurements?: Measurement[];
  previousScreenings?: {
    type: ScreeningType;
    dateCompleted: string;
    result?: string;
  }[];
  existingConditions?: string[];
  medications?: string[];
}

/**
 * Safety layer validation result
 */
export interface SafetyValidation {
  isValid: boolean;
  violations: SafetyViolation[];
  requiresReview: boolean;
}

/**
 * Safety rule violation
 */
export interface SafetyViolation {
  type: 'missing_required_data' | 'data_out_of_range' | 'contraindication' | 'timeframe_violation';
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  recommendation?: string;
}

/**
 * Rule engine output
 */
export interface RulesEngineOutput {
  result: PreventiveCareResult;
  safetyValidation: SafetyValidation;
  meta: {
    version: string;
    evaluatedAt: string;
    processingTimeMs: number;
  };
}