/**
 * QRISK assessment readiness rules
 *
 * Determines whether patient has sufficient data for an educational
 * cardiovascular risk estimate. This does NOT calculate QRISK.
 *
 * The prototype provides readiness information only. No clinical risk
 * scoring is performed here.
 */

import type { PatientInput, QriskReadiness } from './types.js';

const DISCLAIMER = [
  'This is a prototype for educational purposes only.',
  'No clinical risk score is calculated.',
  'This does not provide clinical decision support.',
  'Any future estimate would be informational only.',
];

/**
 * Assess QRISK readiness from patient input
 *
 * Checks if sufficient data exists for an educational cardiovascular
 * risk estimate. Does not perform any risk calculation.
 */
export function assessQriskReadiness(input: PatientInput): QriskReadiness {
  const missingData: string[] = [];
  const staleData: string[] = [];

  // 1. If existing CVD reported, primary prevention-style estimates are not appropriate
  // Defensive: Only check if explicitly true, not if undefined (unknown)
  if (input.hasCvd === true) {
    return {
      ready: false,
      missingData: [],
      staleData: [],
      status: 'not_calculated',
      explanation: buildExplanation('not_calculated', missingData),
    };
  }

  // 2. Check required inputs
  // Defensive: Validate numeric values are actual numbers, not NaN
  const systolicBpValid = typeof input.systolicBp === 'number' && !isNaN(input.systolicBp) && isFinite(input.systolicBp);
  const cholesterolRatioValid = typeof input.cholesterolRatio === 'number' && !isNaN(input.cholesterolRatio) && isFinite(input.cholesterolRatio);
  const bmiValid = typeof input.bmi === 'number' && !isNaN(input.bmi) && isFinite(input.bmi);

  const requiredChecks = [
    { field: 'systolicBp', label: 'Blood pressure (systolic)', present: systolicBpValid },
    { field: 'cholesterolRatio', label: 'Cholesterol ratio', present: cholesterolRatioValid },
    { field: 'smoker', label: 'Smoking status', present: typeof input.smoker === 'boolean' },
    { field: 'bmi', label: 'Body mass index (BMI)', present: bmiValid },
    { field: 'sexAtBirth', label: 'Sex at birth', present: input.sexAtBirth !== undefined },
  ];

  for (const check of requiredChecks) {
    if (!check.present) {
      missingData.push(check.label);
    }
  }

  // 3. Determine readiness
  if (missingData.length > 0) {
    return {
      ready: false,
      missingData,
      staleData,
      status: 'incomplete',
      explanation: buildExplanation('incomplete', missingData),
    };
  }

  return {
    ready: true,
    missingData: [],
    staleData,
    status: 'ready_for_estimate',
    explanation: buildExplanation('ready_for_estimate', missingData),
  };
}

/**
 * Build explanation with appropriate disclaimer
 */
function buildExplanation(status: string, missingData: string[]): string {
  const disclaimerText = DISCLAIMER.join(' ');

  if (status === 'not_calculated') {
    return `${disclaimerText} Cardiovascular risk estimates designed for primary prevention are not used when existing cardiovascular disease is reported. This information would be discussed with a healthcare provider.`;
  }

  if (status === 'incomplete') {
    return `${disclaimerText} Additional information is needed: ${missingData.join(', ')}. When these are available, an educational estimate may be shown. This is for information only, not clinical decision support.`;
  }

  if (status === 'ready_for_estimate') {
    return `${disclaimerText} Sufficient information is available for an educational cardiovascular risk estimate. This is informational only and does not provide clinical decision support or medical advice.`;
  }

  return disclaimerText;
}

/**
 * Check if a specific field is missing for QRISK readiness
 */
export function isMissingForQrisk(input: PatientInput, field: keyof PatientInput): boolean {
  if (input.hasCvd === true) return false;

  // Helper to check if numeric value is valid
  const isValidNumber = (val: unknown): val is number =>
    typeof val === 'number' && !isNaN(val) && isFinite(val);

  if (field === 'systolicBp') return !isValidNumber(input.systolicBp);
  if (field === 'cholesterolRatio') return !isValidNumber(input.cholesterolRatio);
  if (field === 'smoker') return typeof input.smoker !== 'boolean';
  if (field === 'bmi') return !isValidNumber(input.bmi);
  if (field === 'sexAtBirth') return input.sexAtBirth === undefined;
  return false;
}