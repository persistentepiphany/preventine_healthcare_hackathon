/**
 * General screening eligibility rules
 *
 * Evaluates eligibility for population screening programmes:
 * - Cervical screening (females)
 * - Breast screening (females)
 * - Colorectal screening (bowel)
 * - Abdominal Aortic Aneurysm screening (males)
 * - Diabetic eye screening
 */

import type {
  RulesEngineInput,
  EligibilityResult,
  ScreeningType,
} from './types';
import {
  AGE_THRESHOLDS,
  SCREENING_INTERVALS,
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
 * Evaluate cervical screening eligibility
 */
function evaluateCervicalScreening(
  input: RulesEngineInput
): EligibilityResult {
  const { demographics, previousScreenings } = input;
  const age = demographics.age;

  const prerequisites: string[] = [];
  const blockedBy: string[] = [];

  // Sex-based eligibility
  if (demographics.sex !== 'female') {
    return {
      screeningType: 'cervical_screening',
      status: 'not_eligible',
      reason: 'Cervical screening is for females only',
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  // Age-based eligibility
  if (age < AGE_THRESHOLDS.CERVICAL_SCREENING_START) {
    return {
      screeningType: 'cervical_screening',
      status: 'not_eligible',
      reason: `Below minimum age for cervical screening (${AGE_THRESHOLDS.CERVICAL_SCREENING_START})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  if (age > AGE_THRESHOLDS.CERVICAL_SCREENING_MAX) {
    return {
      screeningType: 'cervical_screening',
      status: 'not_eligible',
      reason: `Above maximum age for cervical screening (${AGE_THRESHOLDS.CERVICAL_SCREENING_MAX})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  // Check previous screenings
  const lastScreening = previousScreenings?.find(s => s.type === 'cervical_screening');

  let status: 'eligible' | 'not_eligible' | 'unsure' = 'eligible';
  let urgency: 'none' | 'routine' | 'soonest' | 'urgent' = 'routine';
  let dueDate: string | undefined;

  const interval = age <= 49
    ? SCREENING_INTERVALS.CERVICAL_YOUNG_MONTHS
    : SCREENING_INTERVALS.CERVICAL_OLDER_MONTHS;

  if (lastScreening) {
    const monthsSinceLast = monthsSince(lastScreening.dateCompleted);
    if (monthsSinceLast < interval) {
      status = 'not_eligible';
      const monthsRemaining = interval - monthsSinceLast;
      dueDate = new Date(
        new Date(lastScreening.dateCompleted).getTime() +
        interval * 30 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0];
      return {
        screeningType: 'cervical_screening',
        status,
        reason: `Last cervical screening ${monthsSinceLast} months ago. Next due in ${monthsRemaining} months.`,
        dueDate,
        urgency: 'none',
        prerequisites,
        blockedBy,
      };
    } else if (monthsSinceLast > interval + 6) {
      urgency = 'soonest';
    } else if (monthsSinceLast > interval + 12) {
      urgency = 'urgent';
    }
  }

  return {
    screeningType: 'cervical_screening',
    status,
    reason: lastScreening
      ? `Due for cervical screening (${interval / 12} year interval)`
      : 'No cervical screening recorded - baseline screening recommended',
    urgency,
    prerequisites,
    blockedBy,
  };
}

/**
 * Evaluate breast screening eligibility
 */
function evaluateBreastScreening(
  input: RulesEngineInput
): EligibilityResult {
  const { demographics, previousScreenings } = input;
  const age = demographics.age;

  const prerequisites: string[] = [];
  const blockedBy: string[] = [];

  // Sex-based eligibility
  if (demographics.sex !== 'female') {
    return {
      screeningType: 'breast_screening',
      status: 'not_eligible',
      reason: 'Breast screening is for females only',
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  // Age-based eligibility
  if (age < AGE_THRESHOLDS.BREAST_SCREENING.MIN) {
    return {
      screeningType: 'breast_screening',
      status: 'not_eligible',
      reason: `Below minimum age for breast screening (${AGE_THRESHOLDS.BREAST_SCREENING.MIN})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  if (age > AGE_THRESHOLDS.BREAST_SCREENING.MAX) {
    return {
      screeningType: 'breast_screening',
      status: 'not_eligible',
      reason: `Above maximum age for breast screening (${AGE_THRESHOLDS.BREAST_SCREENING.MAX})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  // Check previous screenings
  const lastScreening = previousScreenings?.find(s => s.type === 'breast_screening');

  let status: 'eligible' | 'not_eligible' | 'unsure' = 'eligible';
  let urgency: 'none' | 'routine' | 'soonest' | 'urgent' = 'routine';

  if (lastScreening) {
    const monthsSinceLast = monthsSince(lastScreening.dateCompleted);
    if (monthsSinceLast < SCREENING_INTERVALS.BREAST_SCREENING_MONTHS) {
      status = 'not_eligible';
      const monthsRemaining = SCREENING_INTERVALS.BREAST_SCREENING_MONTHS - monthsSinceLast;
      const dueDate = new Date(
        new Date(lastScreening.dateCompleted).getTime() +
        SCREENING_INTERVALS.BREAST_SCREENING_MONTHS * 30 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0];
      return {
        screeningType: 'breast_screening',
        status,
        reason: `Last breast screening ${monthsSinceLast} months ago. Next due in ${monthsRemaining} months.`,
        dueDate,
        urgency: 'none',
        prerequisites,
        blockedBy,
      };
    } else if (monthsSinceLast > SCREENING_INTERVALS.BREAST_SCREENING_MONTHS + 6) {
      urgency = 'soonest';
    } else if (monthsSinceLast > SCREENING_INTERVALS.BREAST_SCREENING_MONTHS + 12) {
      urgency = 'urgent';
    }
  }

  return {
    screeningType: 'breast_screening',
    status,
    reason: lastScreening
      ? 'Due for breast screening (3 year interval)'
      : 'No breast screening recorded - baseline screening recommended',
    urgency,
    prerequisites,
    blockedBy,
  };
}

/**
 * Evaluate colorectal screening eligibility
 */
function evaluateColorectalScreening(
  input: RulesEngineInput
): EligibilityResult {
  const { demographics, previousScreenings } = input;
  const age = demographics.age;

  const prerequisites: string[] = [];
  const blockedBy: string[] = [];

  // Age-based eligibility
  if (age < AGE_THRESHOLDS.COLORECTAL_SCREENING.START) {
    return {
      screeningType: 'colorectal_screening',
      status: 'not_eligible',
      reason: `Below minimum age for colorectal screening (${AGE_THRESHOLDS.COLORECTAL_SCREENING.START})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  if (age > AGE_THRESHOLDS.COLORECTAL_SCREENING.STOP) {
    return {
      screeningType: 'colorectal_screening',
      status: 'not_eligible',
      reason: `Above maximum age for colorectal screening (${AGE_THRESHOLDS.COLORECTAL_SCREENING.STOP})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  // Check previous screenings
  const lastScreening = previousScreenings?.find(s => s.type === 'colorectal_screening');

  let status: 'eligible' | 'not_eligible' | 'unsure' = 'eligible';
  let urgency: 'none' | 'routine' | 'soonest' | 'urgent' = 'routine';

  if (lastScreening) {
    const monthsSinceLast = monthsSince(lastScreening.dateCompleted);
    if (monthsSinceLast < SCREENING_INTERVALS.COLORECTAL_SCREENING_MONTHS) {
      status = 'not_eligible';
      const monthsRemaining = SCREENING_INTERVALS.COLORECTAL_SCREENING_MONTHS - monthsSinceLast;
      const dueDate = new Date(
        new Date(lastScreening.dateCompleted).getTime() +
        SCREENING_INTERVALS.COLORECTAL_SCREENING_MONTHS * 30 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0];
      return {
        screeningType: 'colorectal_screening',
        status,
        reason: `Last colorectal screening ${monthsSinceLast} months ago. Next due in ${monthsRemaining} months.`,
        dueDate,
        urgency: 'none',
        prerequisites,
        blockedBy,
      };
    } else if (monthsSinceLast > SCREENING_INTERVALS.COLORECTAL_SCREENING_MONTHS + 6) {
      urgency = 'soonest';
    } else if (monthsSinceLast > SCREENING_INTERVALS.COLORECTAL_SCREENING_MONTHS + 12) {
      urgency = 'urgent';
    }
  }

  return {
    screeningType: 'colorectal_screening',
    status,
    reason: lastScreening
      ? 'Due for colorectal screening (2 year interval)'
      : 'No colorectal screening recorded - baseline screening recommended',
    urgency,
    prerequisites,
    blockedBy,
  };
}

/**
 * Evaluate abdominal aortic aneurysm screening eligibility
 */
function evaluateAAAScreening(
  input: RulesEngineInput
): EligibilityResult {
  const { demographics, previousScreenings } = input;
  const age = demographics.age;

  const prerequisites: string[] = [];
  const blockedBy: string[] = [];

  // Sex-based eligibility (males only)
  if (demographics.sex !== 'male') {
    return {
      screeningType: 'abdominal_aortic_aneurysm',
      status: 'not_eligible',
      reason: 'AAA screening is for males only',
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  // Age-based eligibility
  if (age < AGE_THRESHOLDS.ABDOMINAL_AORTIC_ANEURYSM.MIN) {
    return {
      screeningType: 'abdominal_aortic_aneurysm',
      status: 'not_eligible',
      reason: `Below minimum age for AAA screening (${AGE_THRESHOLDS.ABDOMINAL_AORTIC_ANEURYSM.MIN})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  if (age > AGE_THRESHOLDS.ABDOMINAL_AORTIC_ANEURYSM.MAX) {
    return {
      screeningType: 'abdominal_aortic_aneurysm',
      status: 'not_eligible',
      reason: `Above maximum age for AAA screening (${AGE_THRESHOLDS.ABDOMINAL_AORTIC_ANEURYSM.MAX})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  // Check previous screenings (one-time screening)
  const lastScreening = previousScreenings?.find(s => s.type === 'abdominal_aortic_aneurysm');

  if (lastScreening) {
    return {
      screeningType: 'abdominal_aortic_aneurysm',
      status: 'not_eligible',
      reason: 'AAA screening is a one-time test, previously completed',
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  return {
    screeningType: 'abdominal_aortic_aneurysm',
    status: 'eligible',
    reason: 'Eligible for one-time AAA screening',
    urgency: 'routine',
    prerequisites,
    blockedBy,
  };
}

/**
 * Evaluate diabetic eye screening eligibility
 */
function evaluateDiabeticEyeScreening(
  input: RulesEngineInput
): EligibilityResult {
  const { demographics, previousScreenings, existingConditions } = input;

  const prerequisites: string[] = [];
  const blockedBy: string[] = [];

  // Check for diabetes diagnosis
  const hasDiabetes = existingConditions?.some(c =>
    c.toLowerCase().includes('diabetes')
  );

  if (!hasDiabetes) {
    return {
      screeningType: 'diabetic_eye_screening',
      status: 'not_eligible',
      reason: 'Diabetic eye screening is for patients with diabetes only',
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  // Age-based eligibility
  if (demographics.age < AGE_THRESHOLDS.DIABETIC_EYE_SCREENING) {
    return {
      screeningType: 'diabetic_eye_screening',
      status: 'not_eligible',
      reason: `Below minimum age for diabetic eye screening (${AGE_THRESHOLDS.DIABETIC_EYE_SCREENING})`,
      urgency: 'none',
      prerequisites,
      blockedBy,
    };
  }

  // Check previous screenings
  const lastScreening = previousScreenings?.find(s => s.type === 'diabetic_eye_screening');

  let status: 'eligible' | 'not_eligible' | 'unsure' = 'eligible';
  let urgency: 'none' | 'routine' | 'soonest' | 'urgent' = 'routine';

  if (lastScreening) {
    const monthsSinceLast = monthsSince(lastScreening.dateCompleted);
    if (monthsSinceLast < SCREENING_INTERVALS.DIABETIC_EYE_MONTHS) {
      status = 'not_eligible';
      const monthsRemaining = SCREENING_INTERVALS.DIABETIC_EYE_MONTHS - monthsSinceLast;
      const dueDate = new Date(
        new Date(lastScreening.dateCompleted).getTime() +
        SCREENING_INTERVALS.DIABETIC_EYE_MONTHS * 30 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0];
      return {
        screeningType: 'diabetic_eye_screening',
        status,
        reason: `Last diabetic eye screening ${monthsSinceLast} months ago. Next due in ${monthsRemaining} months.`,
        dueDate,
        urgency: 'none',
        prerequisites,
        blockedBy,
      };
    } else if (monthsSinceLast > SCREENING_INTERVALS.DIABETIC_EYE_MONTHS + 3) {
      urgency = 'soonest';
    } else if (monthsSinceLast > SCREENING_INTERVALS.DIABETIC_EYE_MONTHS + 6) {
      urgency = 'urgent';
    }
  }

  return {
    screeningType: 'diabetic_eye_screening',
    status,
    reason: lastScreening
      ? 'Due for annual diabetic eye screening'
      : 'No diabetic eye screening recorded - baseline screening recommended',
    urgency,
    prerequisites,
    blockedBy,
  };
}

/**
 * Evaluate all screening programme eligibility
 */
export function evaluateScreeningEligibility(
  input: RulesEngineInput
): EligibilityResult[] {
  const results: EligibilityResult[] = [];

  results.push(evaluateCervicalScreening(input));
  results.push(evaluateBreastScreening(input));
  results.push(evaluateColorectalScreening(input));
  results.push(evaluateAAAScreening(input));
  results.push(evaluateDiabeticEyeScreening(input));

  return results;
}

/**
 * Get eligible screenings for a patient
 */
export function getEligibleScreenings(
  input: RulesEngineInput
): EligibilityResult[] {
  const allResults = evaluateScreeningEligibility(input);
  return allResults.filter(r => r.status === 'eligible');
}

/**
 * Get overdue screenings for a patient
 */
export function getOverdueScreenings(
  input: RulesEngineInput
): EligibilityResult[] {
  const allResults = evaluateScreeningEligibility(input);
  return allResults.filter(r =>
    r.status === 'eligible' &&
    (r.urgency === 'soonest' || r.urgency === 'urgent')
  );
}