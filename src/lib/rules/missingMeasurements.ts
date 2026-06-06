/**
 * Missing measurements identification module
 *
 * Identifies which measurements are missing or out of date
 * for a complete preventive care assessment.
 */

import type {
  RulesEngineInput,
  ScreeningType,
} from './types';
import { DATA_FRESHNESS } from './constants';

/**
 * Calculate months since a given date
 */
function monthsSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const months = (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth());
  return months;
}

/**
 * Get latest date from a set of date-recorded items
 */
function getLatestDate<T extends { dateRecorded: string }>(
  items: T[] | undefined
): Date | null {
  if (!items || items.length === 0) return null;
  return items.reduce((latest, item) => {
    const itemDate = new Date(item.dateRecorded);
    return itemDate > latest ? itemDate : latest;
  }, new Date(0));
}

/**
 * Identify missing or stale measurements
 */
export function identifyMissingMeasurements(input: RulesEngineInput): ScreeningType[] {
  const missing: ScreeningType[] = [];

  // Check blood pressure
  const latestBP = getLatestDate(input.bloodPressureHistory);
  if (!latestBP || monthsSince(latestBP.toISOString()) > DATA_FRESHNESS.BLOOD_PRESSURE_MONTHS) {
    missing.push('blood_pressure');
  }

  // Check cholesterol
  const latestCholesterol = getLatestDate(
    input.bloodTestHistory?.filter(b => b.type === 'cholesterol')
  );
  if (!latestCholesterol || monthsSince(latestCholesterol.toISOString()) > DATA_FRESHNESS.CHOLESTEROL_MONTHS) {
    missing.push('cholesterol');
  }

  // Check HbA1c (age and risk dependent)
  const latestHbA1c = getLatestDate(
    input.bloodTestHistory?.filter(b => b.type === 'hba1c')
  );
  const needsHbA1c = input.demographics.age >= 40 ||
    input.riskFactors.familyHistory?.diabetes ||
    input.riskFactors.comorbidities?.some(c =>
      c.toLowerCase().includes('diabetes') ||
      c.toLowerCase().includes('prediabetes')
    );

  if (needsHbA1c && (!latestHbA1c || monthsSince(latestHbA1c.toISOString()) > DATA_FRESHNESS.HBA1C_MONTHS)) {
    missing.push('hba1c');
  }

  // Check BMI
  const latestBMI = getLatestDate(input.measurements?.filter(m => m.type === 'bmi'));
  if (!latestBMI || monthsSince(latestBMI.toISOString()) > DATA_FRESHNESS.BMI_MONTHS) {
    missing.push('bmi');
  }

  // Check smoking status (from risk factors)
  if (!input.riskFactors.lifestyle?.smokingStatus) {
    missing.push('smoking_review');
  }

  // Check alcohol status (from risk factors)
  if (input.riskFactors.lifestyle?.alcoholUnitsPerWeek === undefined) {
    missing.push('alcohol_review');
  }

  return missing;
}

/**
 * Check if a specific measurement type is missing or stale
 */
export function isMeasurementMissing(
  input: RulesEngineInput,
  measurementType: ScreeningType
): boolean {
  const missing = identifyMissingMeasurements(input);
  return missing.includes(measurementType);
}

/**
 * Get priority order for completing missing measurements
 */
export function getMeasurementPriorityOrder(): ScreeningType[] {
  return [
    'blood_pressure',
    'cholesterol',
    'bmi',
    'hba1c',
    'smoking_review',
    'alcohol_review',
  ];
}

/**
 * Categorize missing measurements by criticality
 */
export function categorizeMissingMeasurements(
  input: RulesEngineInput
): { critical: ScreeningType[]; recommended: ScreeningType[]; optional: ScreeningType[] } {
  const missing = identifyMissingMeasurements(input);

  const critical: ScreeningType[] = [];
  const recommended: ScreeningType[] = [];
  const optional: ScreeningType[] = [];

  for (const measurement of missing) {
    if (['blood_pressure', 'cholesterol', 'bmi'].includes(measurement)) {
      critical.push(measurement);
    } else if (['smoking_review', 'alcohol_review'].includes(measurement)) {
      recommended.push(measurement);
    } else {
      optional.push(measurement);
    }
  }

  return { critical, recommended, optional };
}