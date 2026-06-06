/**
 * Core types for the PreventPath rules engine
 *
 * Full TypeScript contract for the rules engine.
 * Defines strict, reusable types for all rule evaluations.
 *
 * Safety layer: Rules process input deterministically and return structured output.
 * No diagnosis, treatment advice, or clinical scoring in these types.
 */

// ============================================================================
// FUNDAMENTAL ENUMS AND PRIMITIVES
// ============================================================================

/**
 * Sex assigned at birth
 */
export type SexAtBirth = 'male' | 'female' | 'intersex' | 'prefer_not_to_say';

/**
 * Urgency level for follow-up and routing decisions
 */
export type UrgencyLevel = 'routine' | 'soon' | 'urgent' | 'emergency';

/**
 * Eligibility status for preventive care services
 */
export type EligibilityStatus =
  | 'possibly_eligible'
  | 'not_eligible'
  | 'insufficient_information'
  | 'not_applicable';

/**
 * Source label for data provenance tracking
 */
export type SourceLabel =
  | 'patient_reported'
  | 'gp_record'
  | 'hospital_record'
  | 'screening_programme'
  | 'calculated'
  | 'unknown';

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

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Patient input data for rules engine evaluation
 *
 * This is the primary input interface for the rules engine.
 * All fields are optional except where noted by safety rules.
 */
export interface PatientInput {
  /** Age in years (required for most eligibility rules) */
  age: number;

  /** UK postcode for deprivation index calculation */
  postcode?: string;

  /** Sex assigned at birth (required for sex-specific screenings) */
  sexAtBirth?: SexAtBirth;

  /** Whether patient has a cervix (affects cervical screening eligibility) */
  hasCervix?: boolean;

  /** Pregnancy status (affects timing of certain screenings) */
  pregnant?: boolean;

  /** Current smoking status */
  smoker?: boolean;

  /** Family history of cardiovascular disease */
  familyHistoryCvd?: boolean;

  /** Existing diagnosis of cardiovascular disease */
  hasCvd?: boolean;

  /** Existing diagnosis of diabetes */
  hasDiabetes?: boolean;

  /** Existing diagnosis of chronic kidney disease */
  hasKidneyDisease?: boolean;

  /** Existing diagnosis of hypertension */
  hasHypertension?: boolean;

  /** Currently prescribed statins */
  onStatins?: boolean;

  /** Most recent systolic blood pressure reading (mmHg) */
  systolicBp?: number;

  /** Most recent diastolic blood pressure reading (mmHg) */
  diastolicBp?: number;

  /** Cholesterol ratio (total cholesterol / HDL) */
  cholesterolRatio?: number;

  /** Body mass index (kg/m²) */
  bmi?: number;

  /** Waist circumference (cm) */
  waistCm?: number;

  /** Reported symptoms requiring clinician review */
  symptoms?: string[];

  /** Red flag symptoms requiring urgent review */
  redFlags?: string[];
}

/**
 * Local context for geographic and organisational routing
 */
export interface LocalContext {
  /** UK postcode for local area identification */
  postcode?: string;

  /** Local authority name */
  localAuthority?: string;

  /** Integrated Care Board identifier */
  icb?: string;

  /** NHS region name */
  nhsRegion?: string;

  /** Index of Multiple Deprivation rank (1 = most deprived) */
  deprivationRank?: number;
}

// ============================================================================
// OUTPUT TYPES - DOMAIN SPECIFIC
// ============================================================================

/**
 * Urgency assessment for patient follow-up
 */
export interface UrgencyAssessment {
  /** Overall urgency level */
  level: UrgencyLevel;

  /** Human-readable explanation of urgency */
  reason: string;

  /** Recommended time to action */
  timeToAction?: string;

  /** Whether emergency services should be contacted */
  requiresEmergencyServices: boolean;
}

/**
 * NHS Health Check eligibility assessment
 */
export interface HealthCheckEligibility {
  /** Eligibility status */
  status: EligibilityStatus;

  /** Age-based eligibility (40-74) */
  ageEligible: boolean;

  /** Has registered GP (required) */
  hasRegisteredGP?: boolean;

  /** Date of last health check */
  lastHealthCheckDate?: string;

  /** Months since last health check */
  monthsSinceLast?: number;

  /** When next health check is due */
  dueDate?: string;

  /** Human-readable explanation */
  explanation: string;
}

/**
 * Match result for a population screening programme
 */
export interface ScreeningMatch {
  /** Type of screening */
  screeningType: ScreeningType;

  /** Eligibility status */
  status: EligibilityStatus;

  /** Urgency of this screening */
  urgency: UrgencyLevel;

  /** When screening is due */
  dueDate?: string;

  /** Date of last completed screening */
  lastCompletedDate?: string;

  /** Human-readable explanation */
  explanation: string;

  /** Data sources supporting this assessment */
  sources: SourceLabel[];

  /** Prerequisite screenings before this can be scheduled */
  prerequisites: ScreeningType[];

  /** Factors blocking this screening */
  blockedBy: string[];
}

/**
 * Missing or out-of-date measurement
 *
 * This is a flexible structure to accommodate various formats.
 * For prototype: uses key, label, whyItMatters, suggestedSource, priority.
 */
export interface MissingMeasurement {
  /** Unique identifier for the measurement */
  key?: string;

  /** Human-readable label */
  label?: string;

  /** Why this measurement matters for preventive care */
  whyItMatters?: string;

  /** Suggested source for obtaining this measurement */
  suggestedSource?: 'pharmacy' | 'nhs_health_check' | 'self_report' | 'gp_record';

  /** Type of measurement (legacy field) */
  measurementType?: ScreeningType;

  /** Whether this is critical for decision-making (legacy field) */
  critical?: boolean;

  /** Date of most recent measurement (if any) */
  lastMeasuredDate?: string;

  /** How many months since last measurement */
  monthsSince?: number;

  /** Recommended action (legacy field) */
  recommendedAction?: string;

  /** Priority level */
  priority?: 'high' | 'medium' | 'low';
}

/**
 * QRISK assessment readiness
 */
export interface QriskReadiness {
  /** Whether sufficient data is available */
  ready: boolean;

  /** Missing required data points */
  missingData: string[];

  /** Stale data (outside acceptable timeframe) */
  staleData: string[];

  /** Human-readable readiness status */
  status: string;

  /** Explanation of what's needed */
  explanation: string;
}

/**
 * Actionable recommendation for patient or clinician
 */
export interface Recommendation {
  /** Unique identifier for this recommendation */
  id: string;

  /** Action to take */
  action:
    | 'book_appointment'
    | 'update_measurements'
    | 'review_with_clinician'
    | 'self_monitor'
    | 'lifestyle_consideration'
    | 'information_only'
    | 'contact_emergency';

  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /** Category of preventive care */
  category: ScreeningType;

  /** Human-readable title */
  title: string;

  /** Detailed description */
  description: string;

  /** When this became applicable */
  applicableSince: string;

  /** Target audience for this recommendation */
  target: 'patient' | 'clinician' | 'both';

  /** Estimated time to action */
  timeToAction?: string;
}

/**
 * Summary item for GP review
 */
export interface GPSummaryItem {
  /** Category of summary item */
  category:
    | 'data_gaps'
    | 'overdue_screenings'
    | 'risk_factors'
    | 'existing_conditions'
    | 'preventive_care'
    | 'urgency'
    | 'other';

  /** Title of summary item */
  title: string;

  /** Detailed information */
  details: string;

  /** Urgency level */
  urgency: UrgencyLevel;

  /** Whether action is required */
  actionRequired: boolean;

  /** When this information was last updated */
  lastUpdated: string;

  /** Source of this information */
  source?: SourceLabel;
}

/**
 * Safety notice for AI guardrails
 */
export interface SafetyNotice {
  /** Type of safety notice */
  type: 'warning' | 'caution' | 'prohibited';

  /** Category of safety concern */
  category: 'clinical' | 'data' | 'privacy' | 'boundary';

  /** Human-readable message */
  message: string;

  /** What should be avoided */
  avoid?: string[];

  /** Recommended approach */
  recommended?: string[];
}

/**
 * AI guardrails configuration
 */
export interface AiGuardrails {
  /** Safety notices for AI layer */
  safetyNotices: SafetyNotice[];

  /** Topics AI should not discuss */
  prohibitedTopics: string[];

  /** Topics AI should defer to clinician */
  deferToClinician: string[];

  /** Maximum quantitative risk disclosure */
  maxRiskDisclosure?: 'none' | 'qualitative_only' | 'ranges_only' | 'full';
}

/**
 * Data source attribution
 */
export interface Source {
  /** Type of data source */
  label: SourceLabel;

  /** Description of source */
  description: string;

  /** When data was retrieved */
  retrievedAt: string;

  /** Confidence in data accuracy */
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================================
// OUTPUT TYPES - AGGREGATE
// ============================================================================

/**
 * Complete preventive care assessment result
 *
 * This is the primary output interface for the rules engine.
 * Contains all assessment results in a structured format.
 */
export interface PreventiveAssessment {
  /** Urgency assessment for follow-up */
  urgency: UrgencyAssessment;

  /** NHS Health Check eligibility */
  healthCheckEligibility: HealthCheckEligibility;

  /** All population screening matches */
  screeningMatches: ScreeningMatch[];

  /** Missing or out-of-date measurements */
  missingMeasurements: MissingMeasurement[];

  /** QRISK assessment readiness */
  qrisk: QriskReadiness;

  /** Actionable recommendations */
  recommendations: Recommendation[];

  /** Summary for GP review */
  gpSummary: GPSummaryItem[];

  /** Safety notices for AI layer */
  safetyNotice: SafetyNotice[];

  /** AI guardrails configuration */
  aiGuardrails: AiGuardrails;

  /** Data source attribution */
  sources: Source[];

  /** Assessment metadata */
  meta: {
    /** Rules engine version */
    version: string;

    /** When assessment was performed */
    assessedAt: string;

    /** Processing time in milliseconds */
    processingTimeMs: number;

    /** Whether validation passed */
    validationPassed: boolean;
  };
}

// ============================================================================
// LEGACY TYPES (for backward compatibility during migration)
// ============================================================================

/**
 * @deprecated Use PreventiveAssessment instead
 */
export interface PreventiveCareResult {
  patientId: string;
  assessmentDate: string;
  eligibility: ScreeningMatch[];
  recommendations: Recommendation[];
  gpSummary: GPSummaryItem[];
  missingMeasurements: ScreeningType[];
  route: PreventiveRoute;
}

/**
 * @deprecated Use PreventiveAssessment.urgency instead
 */
export interface PreventiveRoute {
  primaryRoute: 'self_serve' | 'clinician_review' | 'urgent_referral';
  secondaryRoute?: PreventiveRoute['primaryRoute'];
  reason: string;
  requiresSafetyLayerReview: boolean;
}

/**
 * @deprecated Use PatientInput instead
 */
export interface RulesEngineInput {
  patientId: string;
  demographics: {
    age: number;
    sex: 'male' | 'female';
    postcode?: string;
    hasRegisteredGP: boolean;
  };
  riskFactors: {
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
  };
  bloodPressureHistory?: {
    systolic: number;
    diastolic: number;
    dateRecorded: string;
  }[];
  bloodTestHistory?: {
    type: 'cholesterol' | 'hba1c' | 'creatinine' | 'other';
    value: number;
    unit: string;
    dateRecorded: string;
  }[];
  measurements?: {
    type: 'bmi' | 'weight' | 'height' | 'waist_circumference' | 'other';
    value: number;
    unit: string;
    dateRecorded: string;
  }[];
  previousScreenings?: {
    type: ScreeningType;
    dateCompleted: string;
    result?: string;
  }[];
  existingConditions?: string[];
  medications?: string[];
}

/**
 * @deprecated Use PreventiveAssessment.meta.validationPassed instead
 */
export interface SafetyValidation {
  isValid: boolean;
  violations: {
    type: 'missing_required_data' | 'data_out_of_range' | 'contraindication' | 'timeframe_violation';
    severity: 'error' | 'warning' | 'info';
    field: string;
    message: string;
    recommendation?: string;
  }[];
  requiresReview: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extract the value type from a union of keys
 */
export type ValueOf<T> = T[keyof T];

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};