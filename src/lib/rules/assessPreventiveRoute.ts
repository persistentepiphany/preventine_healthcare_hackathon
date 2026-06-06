/**
 * Main orchestrator for preventive care assessment
 *
 * Coordinates all rule modules in a deterministic sequence.
 * No LLM, database, API, frontend, or service matcher calls.
 * Pure function: input → structured output.
 */

import type {
  PatientInput,
  LocalContext,
  PreventiveAssessment,
  Recommendation,
  Source,
  SafetyNotice,
  GPSummaryItem,
  UrgencyLevel,
} from './types';
import {
  SOURCE_LABELS,
  AI_GUARDRAILS,
  SAFETY_NOTICE,
  RULES_ENGINE_VERSION,
} from './constants';
import { assessUrgency } from './safetyRules';
import { assessHealthCheckEligibility } from './healthCheckEligibility';
import { assessScreeningEligibility } from './screeningEligibility';
import { findMissingMeasurements } from './missingMeasurements';
import { assessQriskReadiness } from './qriskReadiness';
import { buildRecommendations as buildRecommendationCards, toRecommendation } from './recommendations';
import { buildGpSummary as buildGpSummaryText } from './gpSummary';

/**
 * Build urgent assessment when red flags are detected
 *
 * This helper is used when assessUrgency returns 'urgent' or 'emergency'.
 * Returns a PreventiveAssessment with:
 * - No routine prevention recommendations
 * - healthCheckEligibility set to not_applicable
 * - title: "Routine prevention paused"
 * - Explanation of urgent/emergency warning signs
 * - No screening matches
 * - No missing measurements
 * - QRISK status: not_calculated
 * - One high-priority recommendation
 * - GP summary listing red flags and suggested action
 */
function buildUrgentAssessment(
  input: PatientInput,
  urgencyLevel: UrgencyLevel,
  redFlags: string[]
): PreventiveAssessment {
  const today = new Date().toISOString().split('T')[0];
  const isEmergency = urgencyLevel === 'emergency';

  const urgency = {
    level: urgencyLevel,
    reason: `${urgencyLevel === 'emergency' ? 'Emergency' : 'Urgent'} red flag(s) detected: ${redFlags.join(', ')}`,
    timeToAction: isEmergency ? 'Immediate' : 'Same day',
    requiresEmergencyServices: isEmergency,
  };

  const recommendation: Recommendation = {
    id: `urgent_assessment_${urgencyLevel}_${Date.now()}`,
    action: isEmergency ? 'contact_emergency' : 'review_with_clinician',
    priority: 'critical',
    category: 'health_check',
    title: isEmergency ? 'Seek emergency care immediately' : 'Contact NHS 111 for advice',
    description: isEmergency
      ? 'Call 999 or go to A&E immediately. Do not delay.'
      : 'Use NHS 111 online or call 111 for urgent medical advice. Do not wait for a routine appointment.',
    applicableSince: today,
    target: 'patient',
    timeToAction: isEmergency ? 'Immediate' : 'Same day',
  };

  const gpSummary: GPSummaryItem[] = [
    {
      category: 'urgency',
      title: 'Routine prevention paused',
      details: `${urgencyLevel === 'emergency' ? 'Emergency' : 'Urgent'} red flag(s) reported: ${redFlags.join(', ')}. ${isEmergency ? 'Contact 999 or A&E immediately.' : 'Contact NHS 111 for advice.'} Routine preventive care assessment paused.`,
      urgency: urgencyLevel,
      actionRequired: true,
      lastUpdated: today,
    },
  ];

  const safetyNotices: SafetyNotice[] = [
    {
      type: 'prohibited',
      category: 'clinical',
      message: 'Routine preventive care assessment paused. Urgent or emergency symptoms take priority.',
      avoid: ['routine prevention advice', 'screening recommendations', 'health check advice'],
      recommended: ['prioritise immediate care', 'contact appropriate emergency service'],
    },
  ];

  const aiGuardrails = {
    safetyNotices,
    prohibitedTopics: ['routine prevention'],
    deferToClinician: ['all non-urgent matters'],
    maxRiskDisclosure: 'none' as const,
  };

  const sources: Source[] = [
    {
      label: 'patient_reported',
      description: SOURCE_LABELS.patient_reported.label,
      retrievedAt: new Date().toISOString(),
      confidence: 'medium',
    },
    {
      label: 'calculated',
      description: SOURCE_LABELS.calculated.label,
      retrievedAt: new Date().toISOString(),
      confidence: 'medium',
    },
  ];

  return {
    urgency,
    healthCheckEligibility: {
      status: 'not_applicable',
      ageEligible: false,
      explanation: 'Routine NHS Health Check assessment paused due to urgent or emergency symptoms.',
    },
    screeningMatches: [],
    missingMeasurements: [],
    qrisk: {
      ready: false,
      missingData: [],
      staleData: [],
      status: 'not_calculated',
      explanation: 'QRISK assessment not performed. Routine cardiovascular health discussion paused due to urgent or emergency symptoms.',
    },
    recommendations: [recommendation],
    gpSummary,
    safetyNotice: safetyNotices,
    aiGuardrails,
    sources,
    meta: {
      version: RULES_ENGINE_VERSION,
      assessedAt: new Date().toISOString(),
      processingTimeMs: 0,
      validationPassed: true,
    },
  };
}

/**
 * Assess preventive care route and generate complete assessment
 *
 * Orchestrates all rule modules in order:
 * 1. assessUrgency(input)
 * 2. If urgency is emergency or urgent, immediately return buildUrgentAssessment(...)
 * 3. assessHealthCheckEligibility(input)
 * 4. assessScreeningEligibility(input)
 * 5. findMissingMeasurements(input)
 * 6. assessQriskReadiness(input)
 * 7. buildRecommendations(...)
 * 8. buildGpSummary(...)
 * 9. Return the full PreventiveAssessment object
 *
 * Deterministic: same input always produces same output.
 * No external calls, no side effects.
 */
export function assessPreventiveRoute(
  input: PatientInput,
  context: LocalContext
): PreventiveAssessment {
  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];

  // 1. Assess urgency first (safety gate)
  const urgency = assessUrgency(input);

  // 2. Early return for emergency or urgent
  if (urgency.level === 'emergency' || urgency.level === 'urgent') {
    // Defensive: Safely get red flags (empty array if missing/invalid)
    const redFlags = Array.isArray(input.redFlags)
      ? input.redFlags.filter(flag => typeof flag === 'string')
      : [];
    return buildUrgentAssessment(input, urgency.level, redFlags);
  }

  // 3. Assess NHS Health Check eligibility
  const healthCheckEligibility = assessHealthCheckEligibility(input);

  // 4. Assess population screening eligibility (route hints)
  const screeningMatches = assessScreeningEligibility(input);

  // 5. Find missing measurements
  const missingMeasurements = findMissingMeasurements(input);

  // 6. Assess QRISK readiness (educational estimate only)
  const qrisk = assessQriskReadiness(input);

  // 7. Build recommendations
  const recommendationCards = buildRecommendationCards(
    input,
    healthCheckEligibility,
    screeningMatches,
    missingMeasurements,
    qrisk
  );

  // Convert RecommendationCard[] to Recommendation[]
  const recommendations: Recommendation[] = recommendationCards.map(card => {
    const categoryMap = {
      nhs_health_check: 'health_check' as const,
      pharmacy: 'health_check' as const,
      gp: 'health_check' as const,
      screening: 'health_check' as const,
      emergency: 'health_check' as const,
      nhs_111: 'health_check' as const,
    };
    return toRecommendation(card, categoryMap[card.serviceType]);
  });

  // 8. Build GP summary text and convert to GPSummaryItem[]
  const gpSummaryText = buildGpSummaryText(
    input,
    healthCheckEligibility,
    screeningMatches,
    missingMeasurements,
    context
  );

  const gpSummary: GPSummaryItem[] = [
    {
      category: 'preventive_care',
      title: 'Preventive care summary',
      details: gpSummaryText,
      urgency: urgency.level,
      actionRequired: recommendations.some(r => r.priority === 'high' || r.priority === 'critical'),
      lastUpdated: today,
    },
  ];

  // 9. Build safety notices
  const safetyNotice: SafetyNotice[] = [
    {
      type: 'warning',
      category: 'boundary',
      message: SAFETY_NOTICE,
      avoid: AI_GUARDRAILS,
    },
  ];

  // 10. Build AI guardrails
  const aiGuardrails = {
    safetyNotices: safetyNotice,
    prohibitedTopics: AI_GUARDRAILS,
    deferToClinician: ['all clinical decisions'],
    maxRiskDisclosure: 'qualitative_only' as const,
  };

  // 11. Build data sources
  const sources: Source[] = [
    {
      label: 'patient_reported',
      description: SOURCE_LABELS.patient_reported.label,
      retrievedAt: new Date().toISOString(),
      confidence: 'medium',
    },
    {
      label: 'calculated',
      description: SOURCE_LABELS.calculated.label,
      retrievedAt: new Date().toISOString(),
      confidence: 'medium',
    },
  ];

  // 12. Return complete PreventiveAssessment
  return {
    urgency,
    healthCheckEligibility,
    screeningMatches,
    missingMeasurements,
    qrisk,
    recommendations,
    gpSummary,
    safetyNotice,
    aiGuardrails,
    sources,
    meta: {
      version: RULES_ENGINE_VERSION,
      assessedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      validationPassed: true,
    },
  };
}

/**
 * Re-export buildUrgentAssessment for direct use if needed
 */
export { buildUrgentAssessment };