/**
 * PreventPath Rules Engine
 *
 * Main entry point for the modular rules engine.
 * Evaluates patient data against preventive care guidelines and
 * returns structured eligibility, recommendations, and routing decisions.
 *
 * Architecture:
 * 1. Safety layer validates input/output
 * 2. Rule modules evaluate specific domains
 * 3. Index module orchestrates and combines results
 *
 * Principles:
 * - Deterministic: same input always produces same output
 * - Pure: no side effects
 * - No clinical advice: rules decide eligibility, not treatment
 * - AI layer: only explains structured results later
 */

import type {
  RulesEngineInput,
  RulesEngineOutput,
  PreventiveCareResult,
} from './types';
import { RULES_ENGINE_VERSION } from './constants';

// Safety layer
import {
  validateInput,
  validateOutput,
  sanitizeOutput,
  validateCompleteOutput,
  getSafetySummary,
} from './safetyRules';

// Rule modules
import { evaluateHealthCheckEligibility } from './healthCheckEligibility';
import { evaluateQRiskReadiness } from './qriskReadiness';
import {
  evaluateScreeningEligibility,
  getEligibleScreenings,
} from './screeningEligibility';

import {
  identifyMissingMeasurements,
  categorizeMissingMeasurements,
} from './missingMeasurements';

import {
  generateRecommendations,
  getLifestyleRecommendations,
} from './recommendations';

import { generateGPSummary, generateSummaryText } from './gpSummary';
import { assessPreventiveRoute } from './assessPreventiveRoute';

/**
 * Main entry point: evaluate patient preventive care status
 *
 * This function:
 * 1. Validates input data
 * 2. Runs all rule modules
 * 3. Combines results
 * 4. Assesses routing
 * 5. Validates output
 * 6. Returns structured result
 */
export function evaluatePreventiveCare(input: RulesEngineInput): RulesEngineOutput {
  const startTime = Date.now();

  // Step 1: Validate input
  const inputValidation = validateInput(input);
  if (!inputValidation.isValid) {
    throw new Error(`Invalid input: ${getSafetySummary(inputValidation)}`);
  }

  // Step 2: Evaluate eligibility across all domains
  const healthCheckEligibility = evaluateHealthCheckEligibility(input);
  const qriskReadiness = evaluateQRiskReadiness(input);
  const screeningEligibilities = evaluateScreeningEligibility(input);

  const allEligibilityResults = [
    healthCheckEligibility,
    qriskReadiness,
    ...screeningEligibilities,
  ];

  // Step 3: Identify missing measurements
  const missingMeasurements = identifyMissingMeasurements(input);

  // Step 4: Generate recommendations
  const recommendations = generateRecommendations(
    input,
    allEligibilityResults,
    missingMeasurements
  );

  // Add lifestyle recommendations
  const lifestyleRecs = getLifestyleRecommendations(input);
  recommendations.push(...lifestyleRecs);

  // Step 5: Generate GP summary
  const gpSummary = generateGPSummary(
    input,
    allEligibilityResults,
    missingMeasurements
  );

  // Step 6: Assess preventive care route
  const route = assessPreventiveRoute(
    input,
    allEligibilityResults,
    missingMeasurements,
    inputValidation
  );

  // Step 7: Build complete result
  const result: PreventiveCareResult = {
    patientId: input.patientId,
    assessmentDate: new Date().toISOString().split('T')[0],
    eligibility: allEligibilityResults,
    recommendations,
    gpSummary,
    missingMeasurements,
    route,
  };

  // Step 8: Validate output
  const outputValidation = validateOutput(result);

  // Step 9: Sanitize if needed
  const finalResult = outputValidation.isValid
    ? result
    : sanitizeOutput(result);

  // Step 10: Build final output
  const output: RulesEngineOutput = {
    result: finalResult,
    safetyValidation: outputValidation,
    meta: {
      version: RULES_ENGINE_VERSION,
      evaluatedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
    },
  };

  // Step 11: Validate complete output structure
  const completeValidation = validateCompleteOutput(output);
  if (!completeValidation.isValid) {
    throw new Error(`Output validation failed: ${getSafetySummary(completeValidation)}`);
  }

  return output;
}

/**
 * Quick eligibility check for a single screening type
 */
export function checkEligibility(input: RulesEngineInput, screeningType: string) {
  const output = evaluatePreventiveCare(input);
  return output.result.eligibility.find(e => e.screeningType === screeningType);
}

/**
 * Get eligible screenings only
 */
export function getEligibleScreeningsForPatient(input: RulesEngineInput) {
  const output = evaluatePreventiveCare(input);
  return output.result.eligibility.filter(e => e.status === 'eligible');
}

/**
 * Get missing measurements only
 */
export function getMissingMeasurementsForPatient(input: RulesEngineInput) {
  const output = evaluatePreventiveCare(input);
  const { critical, recommended, optional } = categorizeMissingMeasurements(input);
  return { critical, recommended, optional };
}

/**
 * Get recommendations for patient
 */
export function getRecommendationsForPatient(input: RulesEngineInput) {
  const output = evaluatePreventiveCare(input);
  return output.result.recommendations;
}

/**
 * Get GP summary for patient
 */
export function getGPSummaryForPatient(input: RulesEngineInput) {
  const output = evaluatePreventiveCare(input);
  return {
    items: output.result.gpSummary,
    summary: generateSummaryText(
      output.result.gpSummary,
      output.result.missingMeasurements,
      output.result.eligibility
    ),
  };
}

/**
 * Get route recommendation for patient
 */
export function getRouteForPatient(input: RulesEngineInput) {
  const output = evaluatePreventiveCare(input);
  return output.result.route;
}

/**
 * Validate input without running full evaluation
 */
export function validateRulesEngineInput(input: RulesEngineInput) {
  return validateInput(input);
}

/**
 * Get rules engine version
 */
export function getRulesEngineVersion(): string {
  return RULES_ENGINE_VERSION;
}

// Re-export types for external use
export type {
  RulesEngineInput,
  RulesEngineOutput,
  PreventiveCareResult,
  EligibilityResult,
  Recommendation,
  GPSummaryItem,
  PreventiveRoute,
  SafetyValidation,
  SafetyViolation,
  PatientDemographics,
  RiskFactors,
  BloodPressureReading,
  BloodTestResult,
  Measurement,
  ScreeningType,
  UrgencyLevel,
  EligibilityStatus,
  RecommendationAction,
};

// Re-export constants for external use
export {
  AGE_THRESHOLDS,
  SCREENING_INTERVALS,
  CLINICAL_THRESHOLDS,
  DATA_FRESHNESS,
  PREREQUISITES,
  SAFETY_CONSTRAINTS,
  ROUTING_THRESHOLDS,
  RULES_ENGINE_VERSION,
} from './constants';

// Re-export safety functions for external use
export {
  validateInput,
  validateOutput,
  sanitizeOutput,
  validateCompleteOutput,
  requiresSafetyReview,
  getSafetySummary,
} from './safetyRules';