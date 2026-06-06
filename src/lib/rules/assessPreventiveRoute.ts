/**
 * Preventive care routing module
 *
 * Determines the appropriate route for preventive care:
 * - self_serve: Patient can manage through digital tools
 * - clinician_review: Requires clinician input/review
 * - urgent_referral: Needs urgent attention
 *
 * Routing is based on urgency, data completeness, and safety validation.
 */

import type {
  RulesEngineInput,
  EligibilityResult,
  GPSummaryItem,
  ScreeningType,
  PreventiveRoute,
  SafetyValidation,
} from './types';
import { ROUTING_THRESHOLDS } from './constants';

/**
 * Count high urgency items
 */
function countHighUrgency(eligibilityResults: EligibilityResult[]): number {
  return eligibilityResults.filter(e => e.status === 'eligible' && e.urgency === 'urgent').length;
}

/**
 * Count medium urgency items
 */
function countMediumUrgency(eligibilityResults: EligibilityResult[]): number {
  return eligibilityResults.filter(e => e.status === 'eligible' && e.urgency === 'soonest').length;
}

/**
 * Count missing critical data items
 */
function countMissingCriticalData(missingMeasurements: ScreeningType[]): number {
  return missingMeasurements.filter(m =>
    ['blood_pressure', 'cholesterol', 'bmi'].includes(m)
  ).length;
}

/**
 * Assess route based on urgency
 */
function assessRouteByUrgency(
  eligibilityResults: EligibilityResult[],
  missingMeasurements: ScreeningType[]
): PreventiveRoute['primaryRoute'] {
  const highUrgency = countHighUrgency(eligibilityResults);
  const mediumUrgency = countMediumUrgency(eligibilityResults);
  const missingCritical = countMissingCriticalData(missingMeasurements);

  // Check urgent thresholds
  if (highUrgency >= ROUTING_THRESHOLDS.HIGH_URGENCY_THRESHOLD) {
    return 'urgent_referral';
  }

  // Check if missing critical data requires clinician involvement
  if (missingCritical >= ROUTING_THRESHOLDS.MISSING_CRITICAL_DATA_THRESHOLD) {
    return 'clinician_review';
  }

  // Check medium urgency threshold
  if (mediumUrgency >= ROUTING_THRESHOLDS.MEDIUM_URGENCY_THRESHOLD) {
    return 'clinician_review';
  }

  return 'self_serve';
}

/**
 * Generate reason for routing decision
 */
function generateRouteReason(
  route: PreventiveRoute['primaryRoute'],
  eligibilityResults: EligibilityResult[],
  missingMeasurements: ScreeningType[],
  safetyValidation: SafetyValidation
): string {
  const parts: string[] = [];

  const highUrgency = countHighUrgency(eligibilityResults);
  const mediumUrgency = countMediumUrgency(eligibilityResults);
  const missingCritical = countMissingCriticalData(missingMeasurements);

  if (highUrgency > 0) {
    parts.push(`${highUrgency} urgent screening(s) due`);
  }

  if (mediumUrgency > 0) {
    parts.push(`${mediumUrgency} screening(s) due at earliest opportunity`);
  }

  if (missingCritical > 0) {
    parts.push(`${missingCritical} critical measurement(s) missing`);
  }

  if (safetyValidation.requiresReview) {
    const errorCount = safetyValidation.violations.filter(v => v.severity === 'error').length;
    if (errorCount > 0) {
      parts.push(`Data quality issues detected (${errorCount} error(s))`);
    }
  }

  if (route === 'urgent_referral') {
    return 'Urgent referral: ' + (parts.length > 0 ? parts.join(', ') : 'clinical review required');
  }

  if (route === 'clinician_review') {
    return 'Clinician review required: ' + (parts.length > 0 ? parts.join(', ') : 'needs assessment');
  }

  if (parts.length > 0) {
    return 'Patient can self-serve: ' + parts.join(', ');
  }

  return 'Patient can self-serve: measurements current, no urgent screenings due';
}

/**
 * Determine if safety layer review is required
 */
function requiresSafetyLayerReview(
  safetyValidation: SafetyValidation,
  input: RulesEngineInput
): boolean {
  // Safety violations require review
  if (safetyValidation.requiresReview) {
    return true;
  }

  // Check for conditions that require clinician review
  const sensitiveConditions = [
    'pregnancy',
    'cancer',
    'terminal',
  ];

  if (input.existingConditions) {
    const hasSensitiveCondition = input.existingConditions.some(condition =>
      sensitiveConditions.some(sensitive =>
        condition.toLowerCase().includes(sensitive)
      )
    );
    if (hasSensitiveCondition) {
      return true;
    }
  }

  return false;
}

/**
 * Assess secondary route (optional follow-up)
 */
function assessSecondaryRoute(
  primaryRoute: PreventiveRoute['primaryRoute'],
  eligibilityResults: EligibilityResult[]
): PreventiveRoute['primaryRoute'] | undefined {
  if (primaryRoute === 'urgent_referral') {
    return undefined; // No secondary needed for urgent
  }

  if (primaryRoute === 'clinician_review') {
    // If some items are low urgency, they could potentially be self-served
    const lowUrgencyEligible = eligibilityResults.filter(e =>
      e.status === 'eligible' && e.urgency === 'routine'
    );
    if (lowUrgencyEligible.length > 0) {
      return 'self_serve';
    }
    return undefined;
  }

  // Primary is self_serve - check if any items need clinician review later
  const soonestEligible = eligibilityResults.filter(e =>
    e.status === 'eligible' && e.urgency === 'soonest'
  );
  if (soonestEligible.length > 0) {
    return 'clinician_review';
  }

  return undefined;
}

/**
 * Main routing assessment function
 */
export function assessPreventiveRoute(
  input: RulesEngineInput,
  eligibilityResults: EligibilityResult[],
  missingMeasurements: ScreeningType[],
  safetyValidation: SafetyValidation
): PreventiveRoute {
  const primaryRoute = assessRouteByUrgency(eligibilityResults, missingMeasurements);
  const secondaryRoute = assessSecondaryRoute(primaryRoute, eligibilityResults);
  const reason = generateRouteReason(primaryRoute, eligibilityResults, missingMeasurements, safetyValidation);
  const requiresSafetyLayerReview = requiresSafetyLayerReview(safetyValidation, input);

  return {
    primaryRoute,
    secondaryRoute,
    reason,
    requiresSafetyLayerReview,
  };
}

/**
 * Check if a specific route is recommended for given input
 */
export function isRouteRecommended(
  route: PreventiveRoute['primaryRoute'],
  preventiveRoute: PreventiveRoute
): boolean {
  if (preventiveRoute.primaryRoute === route) {
    return true;
  }
  if (preventiveRoute.secondaryRoute === route) {
    return true;
  }
  return false;
}

/**
 * Get route description for display
 */
export function getRouteDescription(route: PreventiveRoute['primaryRoute']): string {
  const descriptions: Record<PreventiveRoute['primaryRoute'], string> = {
    self_serve: 'Patient can manage through digital tools and self-booking',
    clinician_review: 'Requires clinician input, review, or scheduling',
    urgent_referral: 'Requires urgent clinical attention',
  };

  return descriptions[route];
}