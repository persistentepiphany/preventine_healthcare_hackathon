/**
 * Recommendation generation module
 *
 * Generates actionable recommendations based on eligibility results
 * and identified missing measurements.
 *
 * Principles:
 * - Recommendations are actionable and clear
 * - No diagnosis or treatment advice
 * - Focus on data collection and screening scheduling
 */

import type {
  RulesEngineInput,
  Recommendation,
  RecommendationAction,
  EligibilityResult,
  ScreeningType,
} from './types';
import { SAFETY_CONSTRAINTS } from './constants';

/**
 * Generate a unique ID for recommendations
 */
function generateId(category: ScreeningType, action: string): string {
  const timestamp = Date.now().toString(36);
  return `${category}_${action}_${timestamp}`;
}

/**
 * Determine priority from urgency level
 */
function priorityFromUrgency(urgency: 'none' | 'routine' | 'soonest' | 'urgent'): 'low' | 'medium' | 'high' {
  switch (urgency) {
    case 'urgent':
      return 'high';
    case 'soonest':
      return 'high';
    case 'routine':
      return 'medium';
    default:
      return 'low';
  }
}

/**
 * Create recommendation for missing measurements
 */
function createMeasurementRecommendation(
  measurementType: ScreeningType,
  critical: boolean
): Recommendation {
  const action: RecommendationAction = 'update_measurements';
  const priority = critical ? 'high' : 'medium';

  const titles: Record<ScreeningType, string> = {
    health_check: 'Update NHS Health Check data',
    qrisk: 'Complete QRISK assessment data',
    blood_pressure: 'Record blood pressure',
    cholesterol: 'Request cholesterol blood test',
    hba1c: 'Request HbA1c blood test',
    bmi: 'Update height and weight',
    smoking_review: 'Update smoking status',
    alcohol_review: 'Update alcohol consumption',
    cervical_screening: 'Review cervical screening records',
    breast_screening: 'Review breast screening records',
    colorectal_screening: 'Review colorectal screening records',
    abdominal_aortic_aneurysm: 'Review AAA screening records',
    diabetic_eye_screening: 'Review diabetic eye screening records',
  };

  const descriptions: Record<ScreeningType, string> = {
    health_check: 'Complete NHS Health Check questionnaire and measurements',
    qrisk: 'Provide data required for cardiovascular risk assessment',
    blood_pressure: 'Blood pressure reading needed for accurate risk assessment',
    cholesterol: 'Cholesterol test result needed for preventive care planning',
    hba1c: 'HbA1c test needed for diabetes risk assessment',
    bmi: 'Height and weight needed to calculate BMI',
    smoking_review: 'Current smoking status required for risk assessment',
    alcohol_review: 'Weekly alcohol consumption required for risk assessment',
    cervical_screening: 'Check records for previous cervical screening results',
    breast_screening: 'Check records for previous breast screening results',
    colorectal_screening: 'Check records for previous bowel screening results',
    abdominal_aortic_aneurysm: 'Check records for previous AAA screening',
    diabetic_eye_screening: 'Check records for previous diabetic eye screening',
  };

  return {
    id: generateId(measurementType, action),
    action,
    priority,
    category: measurementType,
    title: titles[measurementType],
    description: descriptions[measurementType],
    applicableSince: new Date().toISOString().split('T')[0],
  };
}

/**
 * Create recommendation for eligible screening
 */
function createScreeningRecommendation(eligibility: EligibilityResult): Recommendation {
  const action: RecommendationAction = 'book_appointment';
  const priority = priorityFromUrgency(eligibility.urgency);

  const titles: Record<ScreeningType, string> = {
    health_check: 'Book NHS Health Check',
    qrisk: 'Complete QRISK assessment',
    blood_pressure: 'Schedule blood pressure check',
    cholesterol: 'Schedule cholesterol test',
    hba1c: 'Schedule HbA1c test',
    bmi: 'Update BMI measurements',
    smoking_review: 'Review smoking status with clinician',
    alcohol_review: 'Review alcohol consumption with clinician',
    cervical_screening: 'Book cervical screening appointment',
    breast_screening: 'Book breast screening appointment',
    colorectal_screening: 'Request bowel screening kit',
    abdominal_aortic_aneurysm: 'Book AAA screening appointment',
    diabetic_eye_screening: 'Book diabetic eye screening',
  };

  const urgencyText: Record<typeof eligibility.urgency, string> = {
    none: '',
    routine: 'Routine',
    soonest: 'Schedule at earliest opportunity',
    urgent: 'Urgent - book as soon as possible',
  };

  const description = eligibility.dueDate
    ? `${urgencyText[eligibility.urgency]}. Due by ${eligibility.dueDate}.`
    : urgencyText[eligibility.urgency] || eligibility.reason;

  return {
    id: generateId(eligibility.screeningType, action),
    action,
    priority,
    category: eligibility.screeningType,
    title: titles[eligibility.screeningType],
    description,
    applicableSince: new Date().toISOString().split('T')[0],
  };
}

/**
 * Create recommendation for clinician review
 */
function createClinicianReviewRecommendation(reason: string): Recommendation {
  return {
    id: generateId('review', 'clinician'),
    action: 'review_with_clinician',
    priority: 'high',
    category: 'health_check',
    title: 'Review with clinician',
    description: reason,
    applicableSince: new Date().toISOString().split('T')[0],
  };
}

/**
 * Generate recommendations from eligibility results
 */
export function generateRecommendations(
  input: RulesEngineInput,
  eligibilityResults: EligibilityResult[],
  missingMeasurements: ScreeningType[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Priority 1: Urgent and soonest eligible screenings
  const urgentEligible = eligibilityResults.filter(e =>
    e.status === 'eligible' &&
    (e.urgency === 'urgent' || e.urgency === 'soonest')
  );

  for (const eligibility of urgentEligible) {
    recommendations.push(createScreeningRecommendation(eligibility));
  }

  // Priority 2: Critical missing measurements
  const criticalMeasurements = missingMeasurements.filter(m =>
    ['blood_pressure', 'cholesterol', 'bmi'].includes(m)
  );

  for (const measurement of criticalMeasurements) {
    recommendations.push(createMeasurementRecommendation(measurement, true));
  }

  // Priority 3: Routine eligible screenings
  const routineEligible = eligibilityResults.filter(e =>
    e.status === 'eligible' && e.urgency === 'routine'
  );

  for (const eligibility of routineEligible) {
    recommendations.push(createScreeningRecommendation(eligibility));
  }

  // Priority 4: Recommended missing measurements
  const recommendedMeasurements = missingMeasurements.filter(m =>
    !criticalMeasurements.includes(m)
  );

  for (const measurement of recommendedMeasurements) {
    recommendations.push(createMeasurementRecommendation(measurement, false));
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Enforce maximum recommendations
  return recommendations.slice(0, SAFETY_CONSTRAINTS.MAX_RECOMMENDATIONS);
}

/**
 * Get lifestyle recommendations based on risk factors
 */
export function getLifestyleRecommendations(
  input: RulesEngineInput
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const { riskFactors } = input;

  // Smoking-related
  if (riskFactors.lifestyle?.smokingStatus === 'current') {
    recommendations.push({
      id: generateId('smoking', 'lifestyle'),
      action: 'lifestyle_consideration',
      priority: 'medium',
      category: 'smoking_review',
      title: 'Smoking cessation support',
      description: 'Support available for stopping smoking. Discuss with clinician or pharmacist.',
      applicableSince: new Date().toISOString().split('T')[0],
    });
  }

  // Alcohol-related
  if (riskFactors.lifestyle?.alcoholUnitsPerWeek &&
      riskFactors.lifestyle.alcoholUnitsPerWeek > 14) {
    const isHighRisk = riskFactors.lifestyle.alcoholUnitsPerWeek > 50;
    recommendations.push({
      id: generateId('alcohol', 'lifestyle'),
      action: 'lifestyle_consideration',
      priority: isHighRisk ? 'high' : 'medium',
      category: 'alcohol_review',
      title: 'Alcohol consumption review',
      description: isHighRisk
        ? 'Current alcohol consumption exceeds recommended limits. Clinician review recommended.'
        : 'Current alcohol consumption above lower-risk guidelines. Consider reducing intake.',
      applicableSince: new Date().toISOString().split('T')[0],
    });
  }

  // Family history
  if (riskFactors.familyHistory?.cardiovascularDisease) {
    recommendations.push({
      id: generateId('family_cv', 'info'),
      action: 'information_only',
      priority: 'low',
      category: 'health_check',
      title: 'Cardiovascular risk awareness',
      description: 'Family history of cardiovascular disease noted. Regular monitoring recommended.',
      applicableSince: new Date().toISOString().split('T')[0],
    });
  }

  return recommendations;
}