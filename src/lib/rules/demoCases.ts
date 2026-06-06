/**
 * Demo test cases for the PreventPath rules engine
 *
 * These cases demonstrate expected behavior for common scenarios.
 * Each case includes input and expected high-level outputs.
 *
 * Usage:
 * import { runDemoCase } from './demoCases';
 * const result = runDemoCase('standardNhsHealthCheck');
 */

import type { PatientInput } from './types';
import {
  assessUrgency,
  assessHealthCheckEligibility,
  assessQriskReadiness,
  findMissingMeasurements,
  assessScreeningEligibility,
} from './index';
import { buildRecommendations } from './recommendations';
import { buildUrgentAssessment } from './assessPreventiveRoute';

// ============================================================================
// DEMO INPUTS
// ============================================================================

/**
 * Standard NHS Health Check candidate
 * - Age 45
 * - No known conditions
 * - Missing BP and cholesterol
 */
export const demoInputs = {
  standardNhsHealthCheck: {
    age: 45,
    smoker: false,
    hasCvd: false,
    hasDiabetes: false,
    hasKidneyDisease: false,
    hasHypertension: false,
    onStatins: false,
    // systolicBp and cholesterolRatio are intentionally undefined (missing)
  } as PatientInput,

  /**
   * Too young for NHS Health Check
   * - Age 28
   */
  tooYoung: {
    age: 28,
  } as PatientInput,

  /**
   * Existing diabetes
   * - Age 55
   * - hasDiabetes true
   */
  existingDiabetes: {
    age: 55,
    hasDiabetes: true,
  } as PatientInput,

  /**
   * Smoker with missing BP
   * - Age 50
   * - smoker true
   * - BP missing
   */
  smokerWithMissingBp: {
    age: 50,
    smoker: true,
    // systolicBp missing
  } as PatientInput,

  /**
   * Emergency red flag
   * - chest_pain selected
   */
  emergencyRedFlag: {
    age: 50,
    redFlags: ['chest_pain'],
  } as PatientInput,

  /**
   * Urgent red flag
   * - sudden_severe_headache selected
   */
  urgentRedFlag: {
    age: 50,
    redFlags: ['sudden_severe_headache'],
  } as PatientInput,

  /**
   * Cervical screening route
   * - Age 30
   * - hasCervix true
   */
  cervicalScreeningRoute: {
    age: 30,
    hasCervix: true,
  } as PatientInput,

  /**
   * QRISK incomplete
   * - Missing cholesterol
   */
  qriskIncomplete: {
    age: 45,
    systolicBp: 120,
    // cholesterolRatio missing
  } as PatientInput,
} as const;

// ============================================================================
// EXPECTED OUTPUTS
// ============================================================================

/**
 * Expected high-level outputs for each demo case
 */
export const expectedOutputs = {
  standardNhsHealthCheck: {
    urgency: {
      level: 'routine' as const,
      requiresEmergencyServices: false,
    },
    healthCheckEligibility: {
      status: 'possibly_eligible' as const,
      ageEligible: true,
    },
    missingMeasurements: {
      hasBloodPressure: false,
      hasCholesterol: false,
    },
  },

  tooYoung: {
    urgency: {
      level: 'routine' as const,
      requiresEmergencyServices: false,
    },
    healthCheckEligibility: {
      status: 'not_eligible' as const,
      ageEligible: false,
    },
  },

  existingDiabetes: {
    urgency: {
      level: 'routine' as const,
      requiresEmergencyServices: false,
    },
    healthCheckEligibility: {
      status: 'not_eligible' as const,
      ageEligible: true,
    },
    screeningMatches: {
      hasDiabeticEyeScreening: true,
    },
  },

  smokerWithMissingBp: {
    urgency: {
      level: 'routine' as const,
      requiresEmergencyServices: false,
    },
    healthCheckEligibility: {
      status: 'possibly_eligible' as const,
      ageEligible: true,
    },
    missingMeasurements: {
      hasBloodPressure: false,
    },
  },

  emergencyRedFlag: {
    urgency: {
      level: 'emergency' as const,
      requiresEmergencyServices: true,
    },
  },

  urgentRedFlag: {
    urgency: {
      level: 'urgent' as const,
      requiresEmergencyServices: false,
    },
  },

  cervicalScreeningRoute: {
    screeningMatches: {
      hasCervicalScreening: true,
    },
  },

  qriskIncomplete: {
    qrisk: {
      ready: false,
    },
  },
} as const;

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Run a demo case and return results
 */
export function runDemoCase(caseName: keyof typeof demoInputs) {
  const input = demoInputs[caseName];

  const urgency = assessUrgency(input);
  const healthCheckEligibility = assessHealthCheckEligibility(input);
  const qrisk = assessQriskReadiness(input);
  const missing = findMissingMeasurements(input);
  const screening = assessScreeningEligibility(input);
  const recommendations = buildRecommendations(
    input,
    healthCheckEligibility,
    screening,
    missing,
    qrisk
  );
  const urgentAssessment = buildUrgentAssessment(input);

  return {
    input,
    results: {
      urgency,
      healthCheckEligibility,
      qrisk,
      missing,
      screening,
      recommendations,
      urgentAssessment,
    },
  };
}

/**
 * Assert a demo case matches expected outputs
 */
export function assertDemoCase(caseName: keyof typeof demoInputs): {
  passed: boolean;
  failures: string[];
} {
  const { results } = runDemoCase(caseName);
  const expected = expectedOutputs[caseName];
  const failures: string[] = [];

  if (!expected) {
    return { passed: false, failures: [`No expected outputs for case: ${caseName}`] };
  }

  // Urgency checks
  if (expected.urgency) {
    if (results.urgency.level !== expected.urgency.level) {
      failures.push(
        `Urgency level: expected ${expected.urgency.level}, got ${results.urgency.level}`
      );
    }
    if (results.urgency.requiresEmergencyServices !== expected.urgency.requiresEmergencyServices) {
      failures.push(
        `Emergency services: expected ${expected.urgency.requiresEmergencyServices}, got ${results.urgency.requiresEmergencyServices}`
      );
    }
  }

  // Health check eligibility checks
  if (expected.healthCheckEligibility) {
    if (results.healthCheckEligibility.status !== expected.healthCheckEligibility.status) {
      failures.push(
        `Health check status: expected ${expected.healthCheckEligibility.status}, got ${results.healthCheckEligibility.status}`
      );
    }
    if (results.healthCheckEligibility.ageEligible !== expected.healthCheckEligibility.ageEligible) {
      failures.push(
        `Age eligible: expected ${expected.healthCheckEligibility.ageEligible}, got ${results.healthCheckEligibility.ageEligible}`
      );
    }
  }

  // Missing measurements checks
  if (expected.missingMeasurements) {
    const hasBp = !results.missing.some(m => m.measurementType === 'blood_pressure');
    const hasChol = !results.missing.some(m => m.measurementType === 'cholesterol');

    if (expected.missingMeasurements.hasBloodPressure !== hasBp) {
      failures.push(
        `Blood pressure present: expected ${expected.missingMeasurements.hasBloodPressure}, got ${hasBp}`
      );
    }
    if (expected.missingMeasurements.hasCholesterol !== hasChol) {
      failures.push(
        `Cholesterol present: expected ${expected.missingMeasurements.hasCholesterol}, got ${hasChol}`
      );
    }
  }

  // Screening matches checks
  if (expected.screeningMatches?.hasCervicalScreening) {
    const hasCervical = results.screening.some(
      m => m.screeningType === 'cervical_screening' && m.status === 'possibly_eligible'
    );
    if (!hasCervical) {
      failures.push('Cervical screening: expected match, but none found');
    }
  }

  if (expected.screeningMatches?.hasDiabeticEyeScreening) {
    const hasEye = results.screening.some(
      m => m.screeningType === 'diabetic_eye_screening' && m.status === 'possibly_eligible'
    );
    if (!hasEye) {
      failures.push('Diabetic eye screening: expected match, but none found');
    }
  }

  // QRISK checks
  if (expected.qrisk) {
    if (results.qrisk.ready !== expected.qrisk.ready) {
      failures.push(`QRISK ready: expected ${expected.qrisk.ready}, got ${results.qrisk.ready}`);
    }
  }

  return { passed: failures.length === 0, failures };
}

/**
 * Run all demo cases
 */
export function runAllDemoCases() {
  const results: Record<string, { passed: boolean; failures: string[] }> = {};

  for (const caseName of Object.keys(demoInputs) as (keyof typeof demoInputs)[]) {
    results[caseName] = assertDemoCase(caseName);
  }

  const totalCases = Object.keys(results).length;
  const passedCases = Object.values(results).filter(r => r.passed).length;

  return {
    results,
    summary: {
      total: totalCases,
      passed: passedCases,
      failed: totalCases - passedCases,
    },
  };
}

// ============================================================================
// DEMO DESCRIPTIONS
// ============================================================================

/**
 * Human-readable descriptions of each demo case
 */
export const demoCaseDescriptions = {
  standardNhsHealthCheck:
    'Standard NHS Health Check candidate: Age 45, no known conditions, missing BP and cholesterol. Expected: routine urgency, possibly_eligible for NHS Health Check, missing blood pressure and cholesterol.',
  tooYoung:
    'Too young: Age 28. Expected: not eligible for NHS Health Check, routine urgency.',
  existingDiabetes:
    'Existing diabetes: Age 55, hasDiabetes true. Expected: not eligible for standard NHS Health Check, diabetic eye screening possible if age 12+, GP/prevention monitoring suggested.',
  smokerWithMissingBp:
    'Smoker with missing BP: Age 50, smoker true, BP missing. Expected: NHS Health Check possible, pharmacy BP check, stop-smoking support recommendation.',
  emergencyRedFlag:
    'Emergency red flag: chest_pain selected. Expected: emergency urgency, routine prevention paused, 999/A&E message.',
  urgentRedFlag:
    'Urgent red flag: sudden_severe_headache selected. Expected: urgent urgency, NHS 111/urgent care message.',
  cervicalScreeningRoute:
    'Cervical screening route: Age 30, hasCervix true. Expected: possible cervical screening match.',
  qriskIncomplete:
    'QRISK incomplete: Missing cholesterol. Expected: qrisk status incomplete and no score calculated.',
} as const;