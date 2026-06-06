/**
 * QRISK assessment readiness rules
 *
 * Determines whether patient has sufficient data for QRISK calculation.
 * QRISK requires: age, sex, blood pressure, cholesterol, smoking status,
 * ethnicity, postcode (for deprivation index), and relevant comorbidities.
 *
 * Note: This module only checks data completeness. Actual QRISK calculation
 * is done separately using the validated data.
 */

import type {
  RulesEngineInput,
  EligibilityResult,
} from './types';
import { AGE_THRESHOLDS, PREREQUISITES, DATA_FRESHNESS } from './constants';

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
 * Get latest date from blood pressure history
 */
function getLatestBloodPressureDate(input: RulesEngineInput): Date | null {
  if (!input.bloodPressureHistory || input.bloodPressureHistory.length === 0) return null;
  return input.bloodPressureHistory.reduce((latest, reading) => {
    const readingDate = new Date(reading.dateRecorded);
    return readingDate > latest ? readingDate : latest;
  }, new Date(0));
}

/**
 * Get latest date from cholesterol history
 */
function getLatestCholesterolDate(input: RulesEngineInput): Date | null {
  const cholesterolTests = input.bloodTestHistory?.filter(b => b.type === 'cholesterol');
  if (!cholesterolTests || cholesterolTests.length === 0) return null;
  return cholesterolTests.reduce((latest, test) => {
    const testDate = new Date(test.dateRecorded);
    return testDate > latest ? testDate : latest;
  }, new Date(0));
}

/**
 * Evaluate QRISK assessment readiness
 */
export function evaluateQRiskReadiness(input: RulesEngineInput): EligibilityResult {
  const { demographics, riskFactors } = input;
  const age = demographics.age;
  const sex = demographics.sex;

  const prerequisites: string[] = PREREQUISITES.qrisk;
  const blockedBy: string[] = [];

  // Check age eligibility
  if (age < AGE_THRESHOLDS.QRISK.MIN) {
    return {
      screeningType: 'qrisk',
      status: 'not_eligible',
      reason: `Below minimum age for QRISK assessment (${AGE_THRESHOLDS.QRISK.MIN})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  if (age > AGE_THRESHOLDS.QRISK.MAX) {
    return {
      screeningType: 'qrisk',
      status: 'not_eligible',
      reason: `Above maximum age for QRISK assessment (${AGE_THRESHOLDS.QRISK.MAX})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  // Check sex (QRISK validated for both male and female)
  if (!['male', 'female'].includes(sex)) {
    blockedBy.push('Sex must be specified as male or female');
  }

  // Check blood pressure data
  const latestBPDate = getLatestBloodPressureDate(input);
  if (!latestBPDate) {
    blockedBy.push('No blood pressure readings available');
  } else if (monthsSince(latestBPDate.toISOString()) > DATA_FRESHNESS.BLOOD_PRESSURE_MONTHS) {
    blockedBy.push(`Blood pressure data is stale (${Math.floor(monthsSince(latestBPDate.toISOString()))} months old)`);
  }

  // Check cholesterol data
  const latestCholesterolDate = getLatestCholesterolDate(input);
  if (!latestCholesterolDate) {
    blockedBy.push('No cholesterol test results available');
  } else if (monthsSince(latestCholesterolDate.toISOString()) > DATA_FRESHNESS.CHOLESTEROL_MONTHS) {
    blockedBy.push(`Cholesterol data is stale (${Math.floor(monthsSince(latestCholesterolDate.toISOString()))} months old)`);
  }

  // Check smoking status
  if (!riskFactors.lifestyle?.smokingStatus) {
    blockedBy.push('Smoking status not recorded');
  }

  // Check comorbidities (required for QRISK adjustment)
  const requiredComorbidities = [
    'type 1 diabetes',
    'type 2 diabetes',
    'chronic kidney disease',
    'atrial fibrillation',
    'rheumatoid arthritis',
  ];
  const hasComorbidityData = input.existingConditions !== undefined;

  // Determine eligibility status
  let status: 'eligible' | 'not_eligible' | 'unsure' = 'eligible';
  let urgency: 'none' | 'routine' | 'soonest' | 'urgent' = 'routine';

  if (blockedBy.length > 0) {
    status = 'unsure';
    urgency = 'none';

    // If only missing comorbidity data, still potentially ready
    const nonComorbidityBlocks = blockedBy.filter(b => !b.includes('comorbidity'));
    if (nonComorbidityBlocks.length === 0 && !hasComorbidityData) {
      blockedBy.length = 0; // Remove comorbidity block
      status = 'eligible';
    }
  }

  // Build reason
  let reason = 'Patient has sufficient data for QRISK assessment';
  if (status === 'unsure') {
    reason = `QRISK assessment requires: ${blockedBy.join(', ')}`;
  }

  return {
    screeningType: 'qrisk',
    status,
    reason,
    urgency,
    prerequisites,
    blockedBy,
  };
}

/**
 * Check if QRISK data is current
 */
export function hasCurrentQRiskData(input: RulesEngineInput): boolean {
  const readiness = evaluateQRiskReadiness(input);
  return readiness.status === 'eligible';
}

/**
 * Get QRISK required data fields
 */
export function getQRiskRequiredFields(): string[] {
  return [
    'age',
    'sex',
    'blood_pressure',
    'cholesterol',
    'smoking_status',
    'ethnicity',
    'postcode',
    'comorbidities',
  ];
}