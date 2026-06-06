/**
 * Input validation helper for PreventPath rules engine
 *
 * Provides simple defensive validation for patient input.
 * Prevents crashes from missing or invalid data.
 */

import type { PatientInput } from './types';

/**
 * Validate and safely get age
 *
 * Returns validated age or null if invalid.
 * Rejects: undefined, null, negative, > 150 (unrealistic), NaN
 */
export function getSafeAge(input: PatientInput): number | null {
  if (input.age === undefined || input.age === null) {
    return null;
  }
  const age = Number(input.age);
  if (isNaN(age) || age < 0 || age > 150) {
    return null;
  }
  return age;
}

/**
 * Validate and safely get red flags array
 *
 * Returns array of red flags (empty if missing or invalid)
 */
export function getSafeRedFlags(input: PatientInput): string[] {
  if (!input.redFlags || !Array.isArray(input.redFlags)) {
    return [];
  }
  return input.redFlags.filter(flag => typeof flag === 'string' && flag.length > 0);
}

/**
 * Validate and safely get symptoms array
 *
 * Returns array of symptoms (empty if missing or invalid)
 */
export function getSafeSymptoms(input: PatientInput): string[] {
  if (!input.symptoms || !Array.isArray(input.symptoms)) {
    return [];
  }
  return input.symptoms.filter(symptom => typeof symptom === 'string' && symptom.length > 0);
}

/**
 * Check if patient input has sufficient data for basic assessment
 *
 * Age is required for most rules. Returns false if age is invalid.
 */
export function hasMinimumData(input: PatientInput): boolean {
  return getSafeAge(input) !== null;
}

/**
 * Get boolean value safely (returns undefined if not a boolean)
 *
 * Use this instead of `input.field ?? false` to distinguish between
 * false and unknown.
 */
export function getSafeBoolean(
  input: PatientInput,
  field: keyof PatientInput
): boolean | undefined {
  const value = input[field];
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * Get numeric value safely (returns undefined if invalid)
 */
export function getSafeNumber(
  input: PatientInput,
  field: keyof PatientInput
): number | undefined {
  const value = input[field];
  if (value === undefined || value === null) {
    return undefined;
  }
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? undefined : num;
}

/**
 * Validate age for NHS Health Check (40-74)
 *
 * Returns object indicating if in range and why not.
 */
export function validateAgeForHealthCheck(input: PatientInput): {
  valid: boolean;
  age: number | null;
  reason?: string;
} {
  const age = getSafeAge(input);

  if (age === null) {
    return {
      valid: false,
      age: null,
      reason: 'Age is missing or invalid',
    };
  }

  if (age < 40) {
    return {
      valid: false,
      age,
      reason: `Age ${age} is below the NHS Health Check age range (40–74)`,
    };
  }

  if (age > 74) {
    return {
      valid: false,
      age,
      reason: `Age ${age} is above the NHS Health Check age range (40–74)`,
    };
  }

  return {
    valid: true,
    age,
  };
}