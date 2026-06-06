/**
 * Safety and urgency assessment for PreventPath
 *
 * This module runs BEFORE all routine prevention logic.
 * Identifies red-flag symptoms requiring immediate medical attention.
 */

import type { PatientInput, UrgencyAssessment } from './types';

/**
 * Emergency red flags requiring 999 or A&E
 */
const EMERGENCY_RED_FLAGS = new Set([
  'chest_pain',
  'severe_breathlessness',
  'sudden_weakness_or_numbness',
  'face_drooping',
  'speech_difficulty',
  'loss_of_consciousness',
  'severe_bleeding',
  'self_harm_immediate_risk',
] as const);

/**
 * Urgent red flags requiring NHS 111 or urgent care
 */
const URGENT_RED_FLAGS = new Set([
  'worsening_shortness_of_breath',
  'fainting_or_blackouts',
  'sudden_severe_headache',
  'confusion',
  'new_vision_changes',
  'persistent_high_fever',
  'rapidly_worsening_symptoms',
] as const);

/**
 * Assess urgency level based on red-flag symptoms
 *
 * @param input - Patient input data
 * @returns Urgency assessment with level and recommended action
 */
export function assessUrgency(input: PatientInput): UrgencyAssessment {
  // Safely get red flags - empty array if missing or invalid
  const redFlags = Array.isArray(input.redFlags)
    ? input.redFlags.filter(flag => typeof flag === 'string')
    : [];

  const emergencyFlags = redFlags.filter(flag => EMERGENCY_RED_FLAGS.has(flag as never)) ?? [];
  const urgentFlags = redFlags.filter(flag => URGENT_RED_FLAGS.has(flag as never)) ?? [];

  if (emergencyFlags.length > 0) {
    return {
      level: 'emergency',
      reason: `Emergency red flag(s) detected: ${emergencyFlags.join(', ')}`,
      requiresEmergencyServices: true,
      timeToAction: 'Immediate',
    };
  }

  if (urgentFlags.length > 0) {
    return {
      level: 'urgent',
      reason: `Urgent red flag(s) detected: ${urgentFlags.join(', ')}`,
      requiresEmergencyServices: false,
      timeToAction: 'Same day',
    };
  }

  return {
    level: 'routine',
    reason: 'No red flags detected. Proceed with routine preventive-care assessment.',
    requiresEmergencyServices: false,
    timeToAction: 'Within routine timeframe',
  };
}

/**
 * Get human-readable action guidance based on urgency level
 *
 * @param level - Urgency level
 * @returns Action guidance text
 */
export function getUrgencyAction(level: UrgencyAssessment['level']): string {
  switch (level) {
    case 'emergency':
      return 'If you think it is an emergency, call 999 or go to A&E.';
    case 'urgent':
      return 'Use NHS 111 or contact urgent care for advice.';
    case 'routine':
      return 'Continue with routine preventive-care assessment.';
    case 'soon':
      return 'Consider discussing with your GP soon.';
  }
}

/**
 * Export red flag sets for testing and validation
 */
export const RED_FLAGS = {
  EMERGENCY: EMERGENCY_RED_FLAGS,
  URGENT: URGENT_RED_FLAGS,
} as const;