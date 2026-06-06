/**
 * Safety layer for the PreventPath rules engine
 *
 * This module validates inputs and outputs to ensure:
 * - Required fields are present
 * - Data values are within acceptable ranges
 * - No clinical diagnosis or treatment advice is generated
 * - Timeframes are respected
 *
 * The safety layer is deterministic and has no side effects.
 */

import type {
  RulesEngineInput,
  RulesEngineOutput,
  SafetyValidation,
  SafetyViolation,
  PreventiveCareResult,
} from './types';
import { SAFETY_CONSTRAINTS, RULES_ENGINE_VERSION } from './constants';

/**
 * Validate input data meets minimum safety requirements
 */
export function validateInput(input: RulesEngineInput): SafetyValidation {
  const violations: SafetyViolation[] = [];

  // Check required fields
  for (const field of SAFETY_CONSTRAINTS.REQUIRED_FIELDS) {
    if (input.demographics[field as keyof typeof input.demographics] === undefined) {
      violations.push({
        type: 'missing_required_data',
        severity: 'error',
        field,
        message: `Required field '${field}' is missing from demographics`,
        recommendation: 'Provide complete demographic information',
      });
    }
  }

  // Validate age range
  if (input.demographics.age !== undefined) {
    if (input.demographics.age < 0 || input.demographics.age > 150) {
      violations.push({
        type: 'data_out_of_range',
        severity: 'error',
        field: 'age',
        message: `Age ${input.demographics.age} is outside valid range (0-150)`,
      });
    }
  }

  // Validate sex
  if (input.demographics.sex && !['male', 'female'].includes(input.demographics.sex)) {
    violations.push({
      type: 'data_out_of_range',
      severity: 'error',
      field: 'sex',
      message: `Sex '${input.demographics.sex}' is not a valid value`,
    });
  }

  // Validate blood pressure readings
  if (input.bloodPressureHistory) {
    for (let i = 0; i < input.bloodPressureHistory.length; i++) {
      const reading = input.bloodPressureHistory[i];
      if (reading.systolic < 50 || reading.systolic > 300) {
        violations.push({
          type: 'data_out_of_range',
          severity: 'warning',
          field: `bloodPressureHistory[${i}].systolic`,
          message: `Systolic value ${reading.systolic} is outside expected range (50-300)`,
        });
      }
      if (reading.diastolic < 30 || reading.diastolic > 200) {
        violations.push({
          type: 'data_out_of_range',
          severity: 'warning',
          field: `bloodPressureHistory[${i}].diastolic`,
          message: `Diastolic value ${reading.diastolic} is outside expected range (30-200)`,
        });
      }
    }
  }

  // Validate blood test results
  if (input.bloodTestHistory) {
    for (let i = 0; i < input.bloodTestHistory.length; i++) {
      const result = input.bloodTestHistory[i];
      if (result.value < 0) {
        violations.push({
          type: 'data_out_of_range',
          severity: 'warning',
          field: `bloodTestHistory[${i}].value`,
          message: `Test value ${result.value} cannot be negative`,
        });
      }
    }
  }

  // Validate measurements
  if (input.measurements) {
    for (let i = 0; i < input.measurements.length; i++) {
      const measurement = input.measurements[i];
      if (measurement.value < 0) {
        violations.push({
          type: 'data_out_of_range',
          severity: 'warning',
          field: `measurements[${i}].value`,
          message: `Measurement value ${measurement.value} cannot be negative`,
        });
      }

      // Specific validation for BMI
      if (measurement.type === 'bmi' && measurement.unit === 'kg/m²') {
        if (measurement.value < 10 || measurement.value > 70) {
          violations.push({
            type: 'data_out_of_range',
            severity: 'warning',
            field: `measurements[${i}].value`,
            message: `BMI ${measurement.value} is outside expected range (10-70)`,
          });
        }
      }
    }
  }

  // Check for contraindications (flag for clinician review)
  if (input.existingConditions) {
    const sensitiveConditions = [
      'pregnancy',
      'cancer_treatment',
      'terminal_illness',
      'recent_surgery',
    ];
    const hasSensitiveCondition = input.existingConditions.some(condition =>
      sensitiveConditions.some(sensitive =>
        condition.toLowerCase().includes(sensitive)
      )
    );
    if (hasSensitiveCondition) {
      violations.push({
        type: 'contraindication',
        severity: 'info',
        field: 'existingConditions',
        message: 'Patient has condition that may affect preventive care recommendations',
        recommendation: 'Clinician review recommended before scheduling screenings',
      });
    }
  }

  return {
    isValid: violations.filter(v => v.severity === 'error').length === 0,
    violations,
    requiresReview: violations.length > 0,
  };
}

/**
 * Validate output does not contain clinical advice
 */
export function validateOutput(output: PreventiveCareResult): SafetyValidation {
  const violations: SafetyViolation[] = [];

  // Check recommendations for prohibited patterns
  const prohibitedPatterns = [
    'diagnos',
    'treatment',
    'prescribe',
    'medication',
    'therapy',
    'cure',
    'heal',
  ];

  for (const rec of output.recommendations) {
    const combined = `${rec.title} ${rec.description}`.toLowerCase();
    for (const pattern of prohibitedPatterns) {
      if (combined.includes(pattern)) {
        violations.push({
          type: 'contraindication',
          severity: 'error',
          field: `recommendation:${rec.id}`,
          message: `Recommendation contains prohibited term: '${pattern}'`,
          recommendation: 'Rephrase to focus on eligibility and screening, not treatment',
        });
      }
    }
  }

  // Ensure no clinical scoring in recommendations
  for (const rec of output.recommendations) {
    if (/\d+% risk/i.test(rec.description)) {
      violations.push({
        type: 'data_out_of_range',
        severity: 'error',
        field: `recommendation:${rec.id}`,
        message: 'Recommendation contains quantitative risk score',
        recommendation: 'Use qualitative language only; AI layer can explain scores',
      });
    }
  }

  // Check GP summary for prohibited content
  for (const item of output.gpSummary) {
    const combined = `${item.title} ${item.details}`.toLowerCase();
    for (const pattern of prohibitedPatterns) {
      if (combined.includes(pattern)) {
        violations.push({
          type: 'contraindication',
          severity: 'error',
          field: `gpSummary:${item.category}`,
          message: `GP summary contains prohibited term: '${pattern}'`,
        });
      }
    }
  }

  return {
    isValid: violations.filter(v => v.severity === 'error').length === 0,
    violations,
    requiresReview: violations.length > 0,
  };
}

/**
 * Sanitize output to ensure safety compliance
 */
export function sanitizeOutput(output: PreventiveCareResult): PreventiveCareResult {
  // Deep clone to avoid mutating original
  const sanitized = JSON.parse(JSON.stringify(output)) as PreventiveCareResult;

  // Remove any quantitative risk scores from descriptions
  for (const rec of sanitized.recommendations) {
    rec.description = rec.description.replace(/\d+(\.\d+)?% risk/gi, '[risk score]');
  }

  return sanitized;
}

/**
 * Validate complete rules engine output
 */
export function validateCompleteOutput(output: RulesEngineOutput): SafetyValidation {
  const inputViolations: SafetyViolation[] = [];
  const outputViolations: SafetyViolation[] = [];

  // Validate metadata
  if (output.meta.version !== RULES_ENGINE_VERSION) {
    inputViolations.push({
      type: 'data_out_of_range',
      severity: 'warning',
      field: 'meta.version',
      message: `Rules engine version mismatch: expected ${RULES_ENGINE_VERSION}, got ${output.meta.version}`,
    });
  }

  if (output.meta.processingTimeMs < 0) {
    inputViolations.push({
      type: 'data_out_of_range',
      severity: 'error',
      field: 'meta.processingTimeMs',
      message: 'Processing time cannot be negative',
    });
  }

  // Validate result structure
  if (!output.result.patientId) {
    outputViolations.push({
      type: 'missing_required_data',
      severity: 'error',
      field: 'result.patientId',
      message: 'Patient ID is missing from result',
    });
  }

  if (!output.result.assessmentDate) {
    outputViolations.push({
      type: 'missing_required_data',
      severity: 'error',
      field: 'result.assessmentDate',
      message: 'Assessment date is missing from result',
    });
  }

  // Validate route structure
  if (!['self_serve', 'clinician_review', 'urgent_referral'].includes(output.result.route.primaryRoute)) {
    outputViolations.push({
      type: 'data_out_of_range',
      severity: 'error',
      field: 'result.route.primaryRoute',
      message: `Invalid primary route: ${output.result.route.primaryRoute}`,
    });
  }

  return {
    isValid: outputViolations.filter(v => v.severity === 'error').length === 0,
    violations: [...inputViolations, ...outputViolations],
    requiresReview: inputViolations.length > 0 || outputViolations.length > 0,
  };
}

/**
 * Check if safety review is required for given input
 */
export function requiresSafetyReview(input: RulesEngineInput): boolean {
  const validation = validateInput(input);
  return validation.requiresReview;
}

/**
 * Get safety summary for logging/auditing
 */
export function getSafetySummary(validation: SafetyValidation): string {
  const errors = validation.violations.filter(v => v.severity === 'error').length;
  const warnings = validation.violations.filter(v => v.severity === 'warning').length;
  const infos = validation.violations.filter(v => v.severity === 'info').length;

  if (errors > 0) {
    return `FAILED: ${errors} error(s), ${warnings} warning(s), ${infos} info message(s)`;
  }
  if (warnings > 0) {
    return `PASSED WITH WARNINGS: ${warnings} warning(s), ${infos} info message(s)`;
  }
  if (infos > 0) {
    return `PASSED: ${infos} info message(s)`;
  }
  return 'PASSED';
}