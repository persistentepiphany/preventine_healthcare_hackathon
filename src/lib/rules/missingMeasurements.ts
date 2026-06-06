/**
 * Missing measurements identification module
 *
 * Identifies which measurements are missing for a complete
 * preventive care assessment before GP/pharmacy/NHS Health Check conversation.
 */

import type { PatientInput } from './types';

/**
 * Missing measurement with context
 */
export interface MissingMeasurementInternal {
  /** Unique identifier for the measurement */
  key: string;

  /** Human-readable label */
  label: string;

  /** Why this measurement matters for preventive care */
  whyItMatters: string;

  /** Suggested source for obtaining this measurement */
  suggestedSource: 'pharmacy' | 'nhs_health_check' | 'self_report' | 'gp_record';

  /** Priority level */
  priority: 'high' | 'medium' | 'low';
}

/**
 * Find missing measurements for a patient
 *
 * Identifies which preventive-care measurements are missing before
 * a proper GP/pharmacy/NHS Health Check conversation.
 */
export function findMissingMeasurements(input: PatientInput): MissingMeasurementInternal[] {
  const missing: MissingMeasurementInternal[] = [];

  // 1. Blood pressure - high priority
  if (!input.systolicBp || !input.diastolicBp) {
    missing.push({
      key: 'blood_pressure',
      label: 'Blood pressure reading',
      whyItMatters: 'Blood pressure is one of the key measurements used in preventive health discussions. Knowing your numbers can be useful when speaking with a healthcare provider about general health.',
      suggestedSource: 'pharmacy',
      priority: 'high',
    });
  }

  // 2. Cholesterol/HDL ratio - high priority
  if (input.cholesterolRatio === undefined) {
    missing.push({
      key: 'cholesterol_hdl_ratio',
      label: 'Cholesterol ratio',
      whyItMatters: 'The ratio of total cholesterol to HDL (good cholesterol) provides information about heart health. This measurement is typically included in an NHS Health Check.',
      suggestedSource: 'nhs_health_check',
      priority: 'high',
    });
  }

  // 3. BMI or waist measurement - medium priority (both missing)
  if (input.bmi === undefined && input.waistCm === undefined) {
    missing.push({
      key: 'bmi_or_waist',
      label: 'BMI or waist measurement',
      whyItMatters: 'Body measurements help assess overall health. BMI relates weight to height, while waist measurement can indicate excess fat around the midsection. Having at least one of these measurements is helpful for understanding general health.',
      suggestedSource: 'self_report',
      priority: 'medium',
    });
  }

  // 4. Smoking status - medium priority
  if (typeof input.smoker !== 'boolean') {
    missing.push({
      key: 'smoking_status',
      label: 'Smoking status',
      whyItMatters: 'Knowing whether someone smokes, used to smoke, or has never smoked is relevant for understanding overall health factors. This information helps healthcare providers provide appropriate guidance.',
      suggestedSource: 'self_report',
      priority: 'medium',
    });
  }

  // 5. Family history of cardiovascular disease - low priority
  if (typeof input.familyHistoryCvd !== 'boolean') {
    missing.push({
      key: 'family_history',
      label: 'Family history of heart or stroke conditions',
      whyItMatters: 'Family history can provide context about inherited health factors. This information helps healthcare providers understand the full picture when discussing preventive care.',
      suggestedSource: 'self_report',
      priority: 'low',
    });
  }

  return missing;
}

/**
 * Check if any high-priority measurements are missing
 */
export function hasHighPriorityMissing(input: PatientInput): boolean {
  return findMissingMeasurements(input).some(m => m.priority === 'high');
}

/**
 * Get count of missing measurements by priority
 */
export function countMissingByPriority(
  input: PatientInput
): { high: number; medium: number; low: number } {
  const missing = findMissingMeasurements(input);
  return {
    high: missing.filter(m => m.priority === 'high').length,
    medium: missing.filter(m => m.priority === 'medium').length,
    low: missing.filter(m => m.priority === 'low').length,
  };
}