/**
 * GP summary builder - copyable text for clinical review
 *
 * Generates a short, factual summary the user can show to a GP,
 * pharmacist, or prevention service.
 *
 * Tone: factual, short, safe, first person.
 * No diagnosis, medication advice, treatment advice, or fake appointments.
 */

import type {
  PatientInput,
  HealthCheckEligibility,
  ScreeningMatch,
  LocalContext,
  MissingMeasurement,
} from './types';

/**
 * Build GP summary string
 *
 * Creates copyable text for user to share with healthcare professionals.
 *
 * Includes:
 * - Age
 * - Postcode (if available)
 * - Smoking status (if available)
 * - Family history of CVD (if reported)
 * - Possible NHS Health Check eligibility
 * - Missing measurements
 * - Flagged screening routes
 * - Local authority/area (if available)
 * - Disclaimer: not a diagnosis or treatment recommendation
 */
export function buildGpSummary(
  input: PatientInput,
  eligibility: HealthCheckEligibility,
  screening: ScreeningMatch[],
  missing: MissingMeasurement[],
  context: LocalContext
): string {
  const parts: string[] = [];

  // Defensive: Handle missing or invalid age
  const age = input.age;
  const hasValidAge = age !== undefined && age !== null && !isNaN(age) && age >= 0 && age <= 150;
  if (hasValidAge) {
    parts.push(`I am ${age} years old.`);
  } else {
    parts.push('My age information is missing or invalid.');
  }

  // Postcode
  if (input.postcode) {
    parts.push(`My postcode is ${input.postcode}.`);
  }

  // Smoking status
  if (input.smoker !== undefined) {
    parts.push(input.smoker
      ? 'I smoke.'
      : 'I do not smoke.'
    );
  }

  // Family history of cardiovascular disease
  if (input.familyHistoryCvd === true) {
    parts.push('I have a family history of cardiovascular disease.');
  }

  // NHS Health Check eligibility
  if (eligibility.status === 'possibly_eligible' && eligibility.ageEligible) {
    parts.push('A health tool suggested I may be eligible for an NHS Health Check.');
  }

  // Missing measurements
  if (missing.length > 0) {
    const missingNames = missing.map(m => {
      // Support both key (internal) and measurementType (external) for compatibility
      const key = (m as any).key || m.measurementType;
      const names: Record<string, string> = {
        blood_pressure: 'blood pressure',
        cholesterol_hdl_ratio: 'cholesterol',
        cholesterol: 'cholesterol',
        bmi_or_waist: 'BMI or waist measurement',
        smoking_status: 'smoking status',
        family_history: 'family history of heart or stroke conditions',
      };
      return names[key as string] || (m as any).label || key;
    }).join(', ');
    parts.push(`The following measurements may be missing or out of date: ${missingNames}.`);
  }

  // Screening routes flagged
  const flaggedScreenings = screening
    .filter(s => s.status === 'possibly_eligible')
    .map(s => {
      const names: Record<string, string> = {
        cervical_screening: 'cervical screening',
        breast_screening: 'breast screening',
        colorectal_screening: 'bowel screening',
        diabetic_eye_screening: 'diabetic eye screening',
      };
      return names[s.screeningType] || s.screeningType;
    });

  if (flaggedScreenings.length > 0) {
    parts.push(`Possible screening routes were flagged: ${flaggedScreenings.join(', ')}.`);
  }

  // Local authority/area
  if (context.localAuthority) {
    parts.push(`My local authority is ${context.localAuthority}.`);
  } else if (context.nhsRegion) {
    parts.push(`My NHS region is ${context.nhsRegion}.`);
  }

  // Disclaimer - mandatory final sentence
  parts.push('This is not a diagnosis or treatment recommendation.');

  return parts.join(' ');
}