/**
 * Screening eligibility assessment - route hints only
 *
 * Returns possible screening routes based on basic demographic factors.
 * Does NOT confirm eligibility - these are hints to check NHS invitation status.
 *
 * Cautious wording: "possible route", "may match", "check invitation status".
 * Replaces definitive statements with possibility language.
 */

import type {
  PatientInput,
  ScreeningMatch,
} from './types.js';

/**
 * Assess screening eligibility - route hints only
 *
 * Returns possible screening routes based on age, sex, and health factors.
 * Each result indicates a possible match - not definitive eligibility.
 *
 * IMPORTANT: This is for information only. Do not replace NHS invitation
 * systems or GP advice. Always check actual invitation status.
 */
export function assessScreeningEligibility(
  input: PatientInput
): ScreeningMatch[] {
  const matches: ScreeningMatch[] = [];

  // Defensive: Return empty matches if age is missing or invalid
  const age = input.age;
  const hasValidAge = age !== undefined && age !== null && !isNaN(age) && age >= 0 && age <= 150;

  if (!hasValidAge) {
    return matches;
  }

  // Cervical screening: hasCervix true, age 25-64
  if (input.hasCervix === true && age >= 25 && age <= 64) {
    matches.push({
      screeningType: 'cervical_screening',
      status: 'possibly_eligible',
      urgency: 'routine',
      explanation: 'Possible cervical screening route. Age 25-64 and has cervix. Check NHS invitation status for confirmation.',
      sources: ['patient_reported'],
      prerequisites: [],
      blockedBy: [],
    });
  }

  // Bowel screening: age 50-74
  if (age >= 50 && age <= 74) {
    matches.push({
      screeningType: 'colorectal_screening',
      status: 'possibly_eligible',
      urgency: 'routine',
      explanation: 'Possible bowel screening route. Age 50-74. Check NHS invitation status for confirmation.',
      sources: ['calculated'],
      prerequisites: [],
      blockedBy: [],
    });
  }

  // Breast screening: sexAtBirth female, age 50-70
  if (input.sexAtBirth === 'female' && age >= 50 && age <= 70) {
    matches.push({
      screeningType: 'breast_screening',
      status: 'possibly_eligible',
      urgency: 'routine',
      explanation: 'Possible breast screening route. Female at birth, age 50-70. Check NHS invitation status for confirmation.',
      sources: ['patient_reported'],
      prerequisites: [],
      blockedBy: [],
    });
  }

  // Diabetic eye screening: hasDiabetes true, age 12+
  if (input.hasDiabetes === true && age >= 12) {
    matches.push({
      screeningType: 'diabetic_eye_screening',
      status: 'possibly_eligible',
      urgency: 'routine',
      explanation: 'Possible diabetic eye screening route. Age 12+ with diabetes. Check NHS invitation status for confirmation.',
      sources: ['patient_reported'],
      prerequisites: [],
      blockedBy: [],
    });
  }

  return matches;
}