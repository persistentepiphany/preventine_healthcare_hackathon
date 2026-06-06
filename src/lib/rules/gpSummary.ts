/**
 * GP Summary generation module
 *
 * Generates a concise summary for clinician review.
 * Highlights gaps, urgencies, and areas requiring attention.
 */

import type {
  RulesEngineInput,
  GPSummaryItem,
  EligibilityResult,
  ScreeningType,
  UrgencyLevel,
} from './types';

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
 * Determine urgency from eligibility results
 */
function determineUrgency(eligibilityResults: EligibilityResult[]): UrgencyLevel {
  const hasUrgent = eligibilityResults.some(e => e.urgency === 'urgent');
  if (hasUrgent) return 'urgent';

  const hasSoonest = eligibilityResults.some(e => e.urgency === 'soonest');
  if (hasSoonest) return 'soonest';

  const hasEligible = eligibilityResults.some(e => e.status === 'eligible');
  if (hasEligible) return 'routine';

  return 'none';
}

/**
 * Generate GP summary for data gaps
 */
function getDataGapsSummary(
  input: RulesEngineInput,
  missingMeasurements: ScreeningType[]
): GPSummaryItem[] {
  const items: GPSummaryItem[] = [];

  if (missingMeasurements.length === 0) {
    return items;
  }

  const critical = missingMeasurements.filter(m =>
    ['blood_pressure', 'cholesterol', 'bmi'].includes(m)
  );
  const other = missingMeasurements.filter(m => !critical.includes(m));

  if (critical.length > 0) {
    items.push({
      category: 'data_gaps',
      title: 'Critical measurements missing',
      details: `The following measurements are missing or out of date: ${critical.join(', ')}`,
      urgency: 'urgent',
      actionRequired: true,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  }

  if (other.length > 0) {
    items.push({
      category: 'data_gaps',
      title: 'Additional measurements missing',
      details: `The following measurements could be updated: ${other.join(', ')}`,
      urgency: 'routine',
      actionRequired: false,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  }

  return items;
}

/**
 * Generate GP summary for overdue screenings
 */
function getOverdueScreeningsSummary(
  eligibilityResults: EligibilityResult[]
): GPSummaryItem[] {
  const items: GPSummaryItem[] = [];

  const overdue = eligibilityResults.filter(e =>
    e.status === 'eligible' &&
    (e.urgency === 'urgent' || e.urgency === 'soonest')
  );

  if (overdue.length === 0) {
    return items;
  }

  const overdueTypes = overdue.map(e => {
    // Convert snake_case to readable format
    return e.screeningType.replace(/_/g, ' ');
  }).join(', ');

  items.push({
    category: 'overdue_screenings',
    title: 'Overdue screenings',
    details: `The following screenings are overdue: ${overdueTypes}`,
    urgency: overdue.some(e => e.urgency === 'urgent') ? 'urgent' : 'soonest',
    actionRequired: true,
    lastUpdated: new Date().toISOString().split('T')[0],
  });

  return items;
}

/**
 * Generate GP summary for risk factors
 */
function getRiskFactorsSummary(input: RulesEngineInput): GPSummaryItem[] {
  const items: GPSummaryItem[] = [];
  const { riskFactors } = input;

  const riskFactorsFound: string[] = [];

  if (riskFactors.familyHistory?.cardiovascularDisease) {
    riskFactorsFound.push('Family history of cardiovascular disease');
  }
  if (riskFactors.familyHistory?.diabetes) {
    riskFactorsFound.push('Family history of diabetes');
  }
  if (riskFactors.familyHistory?.hypertension) {
    riskFactorsFound.push('Family history of hypertension');
  }

  if (riskFactors.lifestyle?.smokingStatus === 'current') {
    riskFactorsFound.push('Current smoker');
  }

  if (riskFactors.lifestyle?.alcoholUnitsPerWeek &&
      riskFactors.lifestyle.alcoholUnitsPerWeek > 14) {
    riskFactorsFound.push('Alcohol consumption above lower-risk guidelines');
  }

  if (riskFactorsFound.length > 0) {
    items.push({
      category: 'risk_factors',
      title: 'Noted risk factors',
      details: riskFactorsFound.join('; '),
      urgency: 'routine',
      actionRequired: false,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  }

  return items;
}

/**
 * Generate GP summary for existing conditions
 */
function getExistingConditionsSummary(input: RulesEngineInput): GPSummaryItem[] {
  const items: GPSummaryItem[] = [];

  if (!input.existingConditions || input.existingConditions.length === 0) {
    return items;
  }

  items.push({
    category: 'existing_conditions',
    title: 'Existing conditions',
    details: input.existingConditions.join(', '),
    urgency: 'routine',
    actionRequired: false,
    lastUpdated: new Date().toISOString().split('T')[0],
  });

  return items;
}

/**
 * Generate GP summary for last NHS Health Check
 */
function getLastHealthCheckSummary(input: RulesEngineInput): GPSummaryItem[] {
  const items: GPSummaryItem[] = [];

  const lastHealthCheck = input.previousScreenings?.find(s => s.type === 'health_check');

  if (!lastHealthCheck) {
    items.push({
      category: 'preventive_care',
      title: 'NHS Health Check',
      details: 'No previous NHS Health Check recorded',
      urgency: 'routine',
      actionRequired: false,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  } else {
    const months = monthsSince(lastHealthCheck.dateCompleted);
    items.push({
      category: 'preventive_care',
      title: 'NHS Health Check',
      details: `Last completed ${months} months ago (${lastHealthCheck.dateCompleted})`,
      urgency: months > 72 ? 'urgent' : 'none',
      actionRequired: false,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  }

  return items;
}

/**
 * Generate complete GP summary
 */
export function generateGPSummary(
  input: RulesEngineInput,
  eligibilityResults: EligibilityResult[],
  missingMeasurements: ScreeningType[]
): GPSummaryItem[] {
  const summary: GPSummaryItem[] = [];

  // Add data gaps
  summary.push(...getDataGapsSummary(input, missingMeasurements));

  // Add overdue screenings
  summary.push(...getOverdueScreeningsSummary(eligibilityResults));

  // Add risk factors
  summary.push(...getRiskFactorsSummary(input));

  // Add existing conditions
  summary.push(...getExistingConditionsSummary(input));

  // Add last health check info
  summary.push(...getLastHealthCheckSummary(input));

  // Sort by urgency (urgent first, then soonest, then routine, then none)
  const urgencyOrder: Record<UrgencyLevel, number> = {
    urgent: 0,
    soonest: 1,
    routine: 2,
    none: 3,
  };

  summary.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return summary;
}

/**
 * Generate summary text for quick clinician overview
 */
export function generateSummaryText(
  gpSummary: GPSummaryItem[],
  missingMeasurements: ScreeningType[],
  eligibilityResults: EligibilityResult[]
): string {
  const parts: string[] = [];

  // Count urgent items
  const urgentCount = gpSummary.filter(s => s.urgency === 'urgent' && s.actionRequired).length;
  if (urgentCount > 0) {
    parts.push(`${urgentCount} urgent action(s) required`);
  }

  // Count missing measurements
  if (missingMeasurements.length > 0) {
    parts.push(`${missingMeasurements.length} measurement(s) missing or out of date`);
  }

  // Count eligible screenings
  const eligibleCount = eligibilityResults.filter(e => e.status === 'eligible').length;
  if (eligibleCount > 0) {
    parts.push(`${eligibleCount} screening(s) due`);
  }

  if (parts.length === 0) {
    return 'All measurements current, no urgent screenings due.';
  }

  return parts.join('. ');
}