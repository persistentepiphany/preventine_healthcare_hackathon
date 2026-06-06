/**
 * NHS Health Check eligibility assessment (prototype)
 *
 * Determines whether a patient may be eligible for an NHS Health Check.
 * This is a prototype implementation and not clinical advice.
 *
 * Safety: Does not calculate risk, diagnose, or recommend medication.
 * Results indicate possible eligibility; confirm with healthcare provider.
 */

import type { PatientInput, HealthCheckEligibility } from './types';

/**
 * Assess NHS Health Check eligibility
 *
 * Rules:
 * - Age 40-74: continue checking exclusions
 * - Age < 40 or > 74: not eligible
 * - Exclusions: hasCvd, hasDiabetes, hasKidneyDisease, hasHypertension, onStatins
 * - Any exclusion true: not eligible, list exclusions
 * - Age 40-74 and no exclusions: possibly eligible
 *
 * Defensive: Returns 'insufficient_information' if age is missing or invalid.
 */
export function assessHealthCheckEligibility(input: PatientInput): HealthCheckEligibility {
  const { age, hasCvd, hasDiabetes, hasKidneyDisease, hasHypertension, onStatins } = input;

  // Defensive: Validate age before use
  if (age === undefined || age === null || isNaN(age) || age < 0 || age > 150) {
    return {
      status: 'insufficient_information',
      ageEligible: false,
      explanation: 'Age is missing or invalid. NHS Health Check eligibility cannot be determined without a valid age.',
    };
  }

  const exclusions: string[] = [];

  // Only add exclusions if explicitly true, not if unknown (undefined)
  if (hasCvd === true) exclusions.push('cardiovascular disease');
  if (hasDiabetes === true) exclusions.push('diabetes');
  if (hasKidneyDisease === true) exclusions.push('chronic kidney disease');
  if (hasHypertension === true) exclusions.push('hypertension');
  if (onStatins === true) exclusions.push('statins');

  // Age below 40
  if (age < 40) {
    return {
      status: 'not_eligible',
      ageEligible: false,
      explanation: `Age ${age} is below the NHS Health Check age range (40–74). This programme is for adults aged 40–74 who do not already have certain cardiovascular conditions.`,
    };
  }

  // Age above 74
  if (age > 74) {
    return {
      status: 'not_eligible',
      ageEligible: false,
      explanation: `Age ${age} is above the NHS Health Check age range (40–74). This programme is for adults aged 40–74 who do not already have certain cardiovascular conditions.`,
    };
  }

  // Has exclusions
  if (exclusions.length > 0) {
    const exclusionsList = exclusions.join(', ');
    return {
      status: 'not_eligible',
      ageEligible: true,
      explanation: `You may not be eligible for an NHS Health Check because you have reported ${exclusionsList}. The NHS Health Check is for people who do not already have these conditions. Speak with your GP or pharmacist about ongoing cardiovascular risk monitoring and prevention suitable for your situation.`,
    };
  }

  // Possibly eligible
  return {
    status: 'possibly_eligible',
    ageEligible: true,
    explanation: `You may be eligible for an NHS Health Check. Ask your GP practice, local authority, or pharmacy about accessing this service in your area. The NHS Health Check can help identify your risk of developing heart disease, stroke, kidney disease, type 2 diabetes, or certain types of dementia.`,
  };
}