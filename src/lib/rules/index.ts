/**
 * PreventPath Rules Engine
 *
 * Main entry point for the modular rules engine.
 * Evaluates patient data against preventive care guidelines and
 * returns structured eligibility, recommendations, and routing decisions.
 *
 * Principles:
 * - Deterministic: same input always produces same output
 * - Pure: no side effects
 * - No clinical advice: rules decide eligibility, not treatment
 * - This is a prototype for educational purposes only
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Fundamental enums and primitives
  SexAtBirth,
  UrgencyLevel,
  EligibilityStatus,
  SourceLabel,
  ScreeningType,

  // Input types
  PatientInput,
  LocalContext,

  // Output types - domain specific
  UrgencyAssessment,
  HealthCheckEligibility,
  ScreeningMatch,
  MissingMeasurement,
  QriskReadiness,
  Recommendation,
  GPSummaryItem,
  SafetyNotice,
  AiGuardrails,
  Source,

  // Output types - aggregate
  PreventiveAssessment,

  // Legacy types (for backward compatibility during migration)
  PreventiveCareResult,
  PreventiveRoute,
  RulesEngineInput,
  SafetyValidation,

  // Utility types
  ValueOf,
  DeepPartial,
  DeepRequired,
} from './types.js';

// ============================================================================
// CONSTANTS
// ============================================================================

export {
  AGE_THRESHOLDS,
  SCREENING_INTERVALS,
  CLINICAL_THRESHOLDS,
  DATA_FRESHNESS,
  PREREQUISITES,
  SAFETY_CONSTRAINTS,
  ROUTING_THRESHOLDS,
  POSTCODE_REGIONS,
  RULES_ENGINE_VERSION,
  SAFETY_NOTICE,
  AI_GUARDRAILS,
  SOURCE_LABELS,
  NHS_SOURCES,
} from './constants.js';

// ============================================================================
// SAFETY AND URGENCY
// ============================================================================

export {
  assessUrgency,
  getUrgencyAction,
  RED_FLAGS,
} from './safetyRules.js';

// ============================================================================
// VALIDATION
// ============================================================================

export {
  getSafeAge,
  getSafeRedFlags,
  getSafeSymptoms,
  hasMinimumData,
  getSafeBoolean,
  getSafeNumber,
  validateAgeForHealthCheck,
} from './validation.js';

// ============================================================================
// RULE MODULES
// ============================================================================

export {
  assessHealthCheckEligibility,
} from './healthCheckEligibility.js';

export {
  assessQriskReadiness,
  isMissingForQrisk,
} from './qriskReadiness.js';

export {
  findMissingMeasurements,
  hasHighPriorityMissing,
  countMissingByPriority,
} from './missingMeasurements.js';

export {
  assessScreeningEligibility,
} from './screeningEligibility.js';

export {
  buildRecommendations,
  toRecommendation,
} from './recommendations.js';

export {
  buildGpSummary,
} from './gpSummary.js';

export {
  assessPreventiveRoute,
  buildUrgentAssessment,
} from './assessPreventiveRoute.js';