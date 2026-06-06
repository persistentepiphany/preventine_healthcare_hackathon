/**
 * Constants for the PreventPath rules engine
 *
 * Contains age thresholds, screening intervals, and eligibility criteria.
 * These values are configurable and should be reviewed against NHS guidelines.
 */

/**
 * Age thresholds for preventive care services
 */
export const AGE_THRESHOLDS = {
  /**
   * NHS Health Check eligibility age range
   */
  HEALTH_CHECK: {
    MIN: 40,
    MAX: 74,
  },

  /**
   * QRISK assessment eligibility age range
   */
  QRISK: {
    MIN: 25,
    MAX: 84,
  },

  /**
   * Abdominal Aortic Aneurysm screening age range (males only)
   */
  ABDOMINAL_AORTIC_ANEURYSM: {
    MIN: 65,
    MAX: 75,
  },

  /**
   * Breast screening age range (females only)
   */
  BREAST_SCREENING: {
    MIN: 47,
    MAX: 73,
  },

  /**
   * Cervical screening start age
   */
  CERVICAL_SCREENING_START: 25,

  /**
   * Cervical screening regular age upper bound
   */
  CERVICAL_SCREENING_REGULAR: 64,

  /**
   * Cervical screening upper bound for follow-up
   */
  CERVICAL_SCREENING_MAX: 74,

  /**
   * Colorectal screening start age
   */
  COLORECTAL_SCREENING: {
    START: 54,
    STOP: 74,
  },

  /**
   * Diabetic eye screening start age
   */
  DIABETIC_EYE_SCREENING: 12,

} as const;

/**
 * Recommended screening intervals
 */
export const SCREENING_INTERVALS = {
  /**
   * NHS Health Check - every 5 years
   */
  HEALTH_CHECK_MONTHS: 60,

  /**
   * Blood pressure - annually if normal, more frequent if elevated
   */
  BLOOD_PRESSURE_MONTHS: 12,
  BLOOD_PRESSURE_ELEVATED_MONTHS: 3,

  /**
   * Cholesterol - annually, more frequent if elevated
   */
  CHOLESTEROL_MONTHS: 12,

  /**
   * HbA1c - annually for at-risk, every 3-6 months if diabetic
   */
  HBA1C_MONTHS: 12,
  HBA1C_DIABETIC_MONTHS: 6,

  /**
   * BMI - annually
   */
  BMI_MONTHS: 12,

  /**
   * Smoking review - annually
   */
  SMOKING_REVIEW_MONTHS: 12,

  /**
   * Alcohol review - annually
   */
  ALCOHOL_REVIEW_MONTHS: 12,

  /**
   * Cervical screening - every 3 years (25-49), every 5 years (50-64)
   */
  CERVICAL_YOUNG_MONTHS: 36,
  CERVICAL_OLDER_MONTHS: 60,

  /**
   * Breast screening - every 3 years
   */
  BREAST_SCREENING_MONTHS: 36,

  /**
   * Colorectal screening - every 2 years
   */
  COLORECTAL_SCREENING_MONTHS: 24,

  /**
   * Abdominal Aortic Aneurysm - one-time screening
   */
  ABDOMINAL_AORTIC_ANEURYSM_ONE_TIME: true,

  /**
   * Diabetic eye screening - annually
   */
  DIABETIC_EYE_MONTHS: 12,

} as const;

/**
 * Clinical thresholds for measurement categorisation
 */
export const CLINICAL_THRESHOLDS = {
  /**
   * Blood pressure categories (mmHg)
   */
  BLOOD_PRESSURE: {
    NORMAL_SYSTOLIC: 120,
    NORMAL_DIASTOLIC: 80,
    ELEVATED_SYSTOLIC: 129,
    HIGH_SYSTOLIC_STAGE1: 139,
    HIGH_DIASTOLIC_STAGE1: 89,
    HIGH_SYSTOLIC_STAGE2: 159,
    HIGH_DIASTOLIC_STAGE2: 99,
  },

  /**
   * Cholesterol thresholds (mmol/L)
   */
  CHOLESTEROL: {
    TOTAL_HEALTHY: 5,
    TOTAL_BORDERLINE: 6.2,
    LDL_HEALTHY: 3,
    LDL_BORDERLINE: 4,
    HDL_MINIMAL_RISK: 1,
    HDL_INCREASED_RISK: 0.9,
  },

  /**
   * HbA1c thresholds (mmol/mol)
   */
  HBA1C: {
    NORMAL: 42,
    PRE_DIABETES: 47,
    DIABETES: 48,
  },

  /**
   * BMI categories (kg/m²)
   */
  BMI: {
    UNDERWEIGHT: 18.5,
    HEALTHY: 24.9,
    OVERWEIGHT: 29.9,
    OBESITY_CLASS1: 34.9,
    OBESITY_CLASS2: 39.9,
  },

  /**
   * Alcohol units per week
   */
  ALCOHOL: {
    LOW_RISK_WEEKLY: 14,
    INCREASING_RISK_WEEKLY: 50,
    HIGH_RISK_WEEKLY: 75,
  },

} as const;

/**
 * Maximum age of data considered current
 */
export const DATA_FRESHNESS = {
  /**
   * Maximum age for demographic data (years)
   */
  DEMOGRAPHIC_YEARS: 1,

  /**
   * Maximum age for blood pressure (months)
   */
  BLOOD_PRESSURE_MONTHS: 12,

  /**
   * Maximum age for cholesterol (months)
   */
  CHOLESTEROL_MONTHS: 12,

  /**
   * Maximum age for HbA1c (months)
   */
  HBA1C_MONTHS: 12,

  /**
   * Maximum age for BMI (months)
   */
  BMI_MONTHS: 12,

  /**
   * Maximum age for smoking status (months)
   */
  SMOKING_STATUS_MONTHS: 12,

  /**
   * Maximum age for alcohol status (months)
   */
  ALCOHOL_STATUS_MONTHS: 12,

} as const;

/**
 * Prerequisite screening types required before certain assessments
 */
export const PREREQUISITES: Record<string, string[]> = {
  qrisk: ['blood_pressure', 'cholesterol'],
  health_check: ['blood_pressure', 'cholesterol', 'bmi', 'smoking_review', 'alcohol_review'],
} as const;

/**
 * Safety layer constraints
 */
export const SAFETY_CONSTRAINTS = {
  /**
   * Minimum age for NHS Health Check
   */
  MIN_HEALTH_CHECK_AGE: 40,

  /**
   * Maximum age for QRISK calculation
   */
  MAX_QRISK_AGE: 84,

  /**
   * Minimum data freshness required for recommendations
   */
  MIN_DATA_FRESHNESS_MONTHS: 12,

  /**
   * Maximum number of recommendations to surface
   */
  MAX_RECOMMENDATIONS: 10,

  /**
   * Fields that must be present before any recommendations
   */
  REQUIRED_FIELDS: ['age', 'sex', 'hasRegisteredGP'] as const,

} as const;

/**
 * Routing decision thresholds
 */
export const ROUTING_THRESHOLDS = {
  /**
   * High urgency items count that triggers clinician review
   */
  HIGH_URGENCY_THRESHOLD: 1,

  /**
   * Medium urgency items count that flags for review
   */
  MEDIUM_URGENCY_THRESHOLD: 3,

  /**
   * Missing critical data items that triggers review
   */
  MISSING_CRITICAL_DATA_THRESHOLD: 2,

  /**
   * Time since last NHS Health Check before urgent flag
   */
  HEALTH_CHECK_OVERDUE_MONTHS: 72,

} as const;

/**
 * UK postcode region codes for IMD (Index of Multiple Deprivation) mapping
 */
export const POSTCODE_REGIONS = [
  'E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC', // London
  'B', 'CV', 'LE', 'NG', 'S', 'ST', 'WS', 'WV', // Midlands
  'BL', 'CH', 'L', 'M', 'OL', 'PR', 'SK', 'WA', 'WN', // North West
  'BD', 'DH', 'DL', 'HG', 'HX', 'LS', 'NE', 'SR', 'TS', 'YO', // North East
  'BA', 'BS', 'DT', 'EX', 'PL', 'SN', 'TA', 'TQ', // South West
  'BN', 'BR', 'CR', 'CT', 'DA', 'GU', 'HA', 'HP', 'KT', 'ME', 'RH', 'RM', 'SL', 'SM', 'SS', 'TN', 'TW', 'UB', 'WD', // South East
  'CB', 'CM', 'CO', 'EN', 'IG', 'IP', 'LU', 'MK', 'NN', 'PE', 'RM', 'RG', 'SG', // East of England
  'AB', 'DD', 'FK', 'G', 'KA', 'KY', 'ML', 'PA', 'PH', 'TD', // Scotland
  'BT', // Northern Ireland
  'CF', 'LD', 'LL', 'NP', 'SA', 'SY', // Wales
] as const;

/**
 * Rules engine version
 */
export const RULES_ENGINE_VERSION = '1.0.0';