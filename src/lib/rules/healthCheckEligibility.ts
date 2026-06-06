/**
 * NHS Health Check eligibility rules
 *
 * Determines eligibility for NHS Health Check based on age, GP registration,
 * and previous screening history.
 *
 * Reference: NHS Health Check programme guidelines
 */

import type {
  RulesEngineInput,
  EligibilityResult,
  UrgencyLevel,
} from './types';
import {
  AGE_THRESHOLDS,
  SCREENING_INTERVALS,
  DATA_FRESHNESS,
  SAFETY_CONSTRAINTS,
} from './constants';

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
 * Determine if patient is eligible for NHS Health Check
 */
export function evaluateHealthCheckEligibility(input: RulesEngineInput): EligibilityResult {
  const { demographics, previousScreenings } = input;
  const age = demographics.age;
  const hasGP = demographics.hasRegisteredGP;

  const violations: string[] = [];
  const prerequisites: string[] = [];
  const blockedBy: string[] = [];

  // Check age eligibility
  if (age < AGE_THRESHOLDS.HEALTH_CHECK.MIN) {
    return {
      screeningType: 'health_check',
      status: 'not_eligible',
      reason: `Below minimum age for NHS Health Check (${AGE_THRESHOLDS.HEALTH_CHECK.MIN})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  if (age > AGE_THRESHOLDS.HEALTH_CHECK.MAX) {
    return {
      screeningType: 'health_check',
      status: 'not_eligible',
      reason: `Above maximum age for NHS Health Check (${AGE_THRESHOLDS.HEALTH_CHECK.MAX})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  // Check GP registration requirement
  if (!hasGP) {
    blockedBy.push('No registered GP');
  }

  // Check previous Health Check
  const lastHealthCheck = previousScreenings?.find(s => s.type === 'health_check');

  let status: EligibilityStatus = 'eligible';
  let urgency: UrgencyLevel = 'routine';
  let dueDate: string | undefined;

  if (lastHealthCheck) {
    const monthsSinceLast = monthsSince(lastHealthCheck.dateCompleted);

    if (monthsSinceLast < SCREENING_INTERVALS.HEALTH_CHECK_MONTHS) {
      status = 'not_eligible';
      const monthsRemaining = SCREENING_INTERVALS.HEALTH_CHECK_MONTHS - monthsSinceLast;
      dueDate = new Date(
        new Date(lastHealthCheck.dateCompleted).getTime() +
        SCREENING_INTERVALS.HEALTH_CHECK_MONTHS * 30 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0];
      return {
        screeningType: 'health_check',
        status,
        reason: `Last NHS Health Check completed ${monthsSinceLast} months ago. Next due in ${monthsRemaining} months.`,
        dueDate,
        urgency: 'none',
        prerequisites,
        blockedBy,
      };
    }
  }

  // Determine urgency based on how overdue the check is
  if (lastHealthCheck) {
    const monthsSinceLast = monthsSince(lastHealthCheck.dateCompleted);
    if (monthsSinceLast > SAFETY_CONSTRAINTS.HEALTH_CHECK_OVERDUE_MONTHS) {
      urgency = 'urgent';
    } else if (monthsSinceLast > SCREENING_INTERVALS.HEALTH_CHECK_MONTHS + 12) {
      urgency = 'soonest';
    }
  } else {
    // Never had a Health Check - this is a baseline check
    urgency = 'routine';
  }

  // Calculate due date
  if (lastHealthCheck) {
    dueDate = new Date(
      new Date(lastHealthCheck.dateCompleted).getTime() +
      SCREENING_INTERVALS.HEALTH_CHECK_MONTHS * 30 * 24 * 60 * 60 * 1000
    ).toISOString().split('T')[0];
  } else {
    // No previous check - due now for eligible patients
    dueDate = new Date().toISOString().split('T')[0];
  }

  // Build reason string
  let reason = 'Eligible for NHS Health Check';
  if (!lastHealthCheck) {
    reason = 'No previous NHS Health Check recorded. Baseline check recommended.';
  } else {
    const monthsSinceLast = monthsSince(lastHealthCheck.dateCompleted);
    reason = `Last NHS Health Check completed ${monthsSinceLast} months ago. Due for review.`;
  }

  // If blocked by lack of GP registration
  if (blockedBy.length > 0) {
    status = 'unsure';
    reason = 'Patient may be eligible but requires GP registration.';
  }

  return {
    screeningType: 'health_check',
    status,
    reason,
    dueDate,
    urgency,
    prerequisites,
    blockedBy,
  };
}

/**
 * Check if Health Check data is current (for recommendations)
 */
export function hasCurrentHealthCheckData(input: RulesEngineInput): boolean {
  const lastHealthCheck = input.previousScreenings?.find(s => s.type === 'health_check');
  if (!lastHealthCheck) return false;

  const monthsSinceLast = monthsSince(lastHealthCheck.dateCompleted);
  return monthsSinceLast <= DATA_FRESHNESS.DEMOGRAPHIC_YEARS * 12;
}

/**
 * Get Health Check prerequisites
 */
export function getHealthCheckPrerequisites(): string[] {
  return [
    'blood_pressure',
    'cholesterol',
    'bmi',
    'smoking_review',
    'alcohol_review',
  ];
}