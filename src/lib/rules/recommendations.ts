/**
 * Recommendation builder - converts assessment to frontend cards
 *
 * Generates actionable, cautious recommendations from rules-engine output.
 * Does NOT diagnose, prescribe, or state what the user definitely needs.
 *
 * Each recommendation includes:
 * - title
 * - priority
 * - serviceType (routing to: NHS Health Check | Pharmacy | GP | Screening)
 * - message (careful wording)
 */

import type {
  PatientInput,
  Recommendation,
  HealthCheckEligibility,
  ScreeningMatch,
  MissingMeasurement,
  QriskReadiness,
  ScreeningType,
} from './types';

/**
 * Service routing types for frontend
 */
export type ServiceType =
  | 'nhs_health_check'
  | 'pharmacy'
  | 'gp'
  | 'screening'
  | 'emergency'
  | 'nhs_111';

/**
 * Frontend-friendly recommendation card
 */
export interface RecommendationCard {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  serviceType: ServiceType;
  message: string;
  target: 'patient' | 'clinician' | 'both';
}

/**
 * Generate unique ID for recommendation
 */
function generateId(category: string, action: string): string {
  const timestamp = Date.now().toString(36);
  return `${category}_${action}_${timestamp}`;
}

/**
 * Convert service type to routing string
 */
function serviceTypeToRouting(service: ServiceType): string {
  switch (service) {
    case 'nhs_health_check':
      return 'NHS Health Check';
    case 'pharmacy':
      return 'Pharmacy';
    case 'gp':
      return 'GP';
    case 'screening':
      return 'Screening';
  }
}

/**
 * Map screening type to category
 */
function screeningTypeToCategory(type: ScreeningType): ScreeningType {
  return type;
}

/**
 * Build recommendations from assessment data
 *
 * Rules:
 * 1. NHS Health Check possibly_eligible → high priority, ask GP
 * 2. Missing blood pressure → high priority, pharmacy
 * 3. Missing cholesterol/HDL → high priority, GP
 * 4. Smoker → medium priority, pharmacy (stop-smoking support)
 * 5. Screening matches → medium priority, screening
 * 6. QRISK incomplete → medium priority, GP (explain, no score)
 *
 * All messaging uses cautious wording. No definitive statements.
 */
export function buildRecommendations(
  input: PatientInput,
  eligibility: HealthCheckEligibility,
  screening: ScreeningMatch[],
  missing: MissingMeasurement[],
  qrisk: QriskReadiness
): RecommendationCard[] {
  const recommendations: RecommendationCard[] = [];

  // Rule 1: NHS Health Check eligibility
  if (eligibility.status === 'possibly_eligible' && eligibility.ageEligible) {
    recommendations.push({
      id: generateId('health_check', 'ask'),
      title: 'Ask about an NHS Health Check',
      priority: 'high',
      serviceType: 'nhs_health_check',
      message: 'This prototype suggests you may be eligible for an NHS Health Check. This is a free health check-up for adults aged 40-74. Consider asking your GP practice about accessing this service.',
      target: 'patient',
    });
  }

  // Rule 2: Missing blood pressure
  if (missing.some(m => m.key === 'blood_pressure' || m.measurementType === 'blood_pressure')) {
    recommendations.push({
      id: generateId('blood_pressure', 'check'),
      title: 'Consider a blood pressure check',
      priority: 'high',
      serviceType: 'pharmacy',
      message: 'Blood pressure readings may be helpful for preventive health discussions. Many pharmacies offer checks. Consider asking about getting a reading.',
      target: 'patient',
    });
  }

  // Rule 3: Missing cholesterol/HDL ratio
  if (missing.some(m => m.key === 'cholesterol_hdl_ratio' || m.measurementType === 'cholesterol')) {
    recommendations.push({
      id: generateId('cholesterol', 'test'),
      title: 'Ask about cholesterol testing',
      priority: 'high',
      serviceType: 'gp',
      message: 'Cholesterol levels may be relevant for preventive care planning. Ask your GP about whether testing might be appropriate.',
      target: 'patient',
    });
  }

  // Rule 4: Current smoker (only if explicitly true, not if unknown)
  if (input.smoker === true) {
    recommendations.push({
      id: generateId('smoking', 'support'),
      title: 'Ask about stop-smoking support',
      priority: 'medium',
      serviceType: 'pharmacy',
      message: 'Stopping smoking may benefit health. Support is available through pharmacies, GPs, and NHS services. Ask about options.',
      target: 'patient',
    });
  }
  // Do NOT assume non-smoker if input.smoker is undefined
  // Only add recommendation if we know they smoke

  // Rule 5: Screening matches
  for (const match of screening) {
    if (match.status === 'possibly_eligible') {
      const titles: Record<ScreeningType, string> = {
        health_check: 'Ask about NHS Health Check',
        qrisk: 'Ask about cardiovascular health discussion',
        blood_pressure: 'Ask about blood pressure check',
        cholesterol: 'Ask about cholesterol test',
        hba1c: 'Ask about HbA1c test',
        bmi: 'Ask about BMI assessment',
        smoking_review: 'Ask about smoking review',
        alcohol_review: 'Ask about alcohol review',
        cervical_screening: 'Ask about cervical screening',
        breast_screening: 'Ask about breast screening',
        colorectal_screening: 'Ask about bowel screening',
        abdominal_aortic_aneurysm: 'Ask about AAA screening',
        diabetic_eye_screening: 'Ask about diabetic eye screening',
      };

      recommendations.push({
        id: generateId(match.screeningType, 'screening'),
        title: titles[match.screeningType],
        priority: 'medium',
        serviceType: 'screening',
        message: match.explanation || 'This may be a possible screening route. Check NHS invitation status or ask your GP.',
        target: 'patient',
      });
    }
  }

  // Rule 6: QRISK incomplete
  if (!qrisk.ready && qrisk.missingData.length > 0) {
    recommendations.push({
      id: generateId('qrisk', 'complete'),
      title: 'Complete health information for health discussion',
      priority: 'medium',
      serviceType: 'gp',
      message: `Some information may be needed before any cardiovascular health discussion can be considered: ${qrisk.missingData.join(', ')}. Discuss with your GP.`,
      target: 'patient',
    });
  }

  // Sort by priority: critical > high > medium > low
  const priorityOrder: Record<RecommendationCard['priority'], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Convert RecommendationCard to Recommendation type (for compatibility)
 */
export function toRecommendation(
  card: RecommendationCard,
  category: ScreeningType
): Recommendation {
  const actionMap: Record<ServiceType, Recommendation['action']> = {
    nhs_health_check: 'book_appointment',
    pharmacy: 'self_monitor',
    gp: 'review_with_clinician',
    screening: 'book_appointment',
  };

  return {
    id: card.id,
    action: actionMap[card.serviceType],
    priority: card.priority,
    category,
    title: card.title,
    description: card.message,
    applicableSince: new Date().toISOString().split('T')[0],
    target: card.target,
  };
}