import { describe, expect, it } from "vitest";
import {
  assessHealthCheckEligibility,
  assessPreventiveRoute,
  bpCheckRoute,
  detectMissingMeasurements,
} from "../src/rules/engine.js";
import type { PatientInput } from "../src/contracts/patient_input.js";

/**
 * Baseline = healthy 50yo in England, all measurements present, no exclusions,
 * BP not recently checked, no red flags. Tests perturb this baseline.
 */
function baseline(overrides: Partial<PatientInput> = {}): PatientInput {
  return {
    age: 50,
    livesInEngland: true,

    hasCvd: false,
    hasChronicKidneyDisease: false,
    hasDiabetes: false,
    hasHypertension: false,
    hasAtrialFibrillation: false,
    hasStrokeOrTia: false,
    hasFamilialHypercholesterolaemia: false,
    hasHeartFailure: false,
    hasPeripheralArterialDisease: false,
    onStatins: false,
    previousHighCvdRisk: false,

    systolicBp: 122,
    diastolicBp: 78,
    totalCholesterol: 5.0,
    hdlCholesterol: 1.3,
    bmi: 24,
    waistCircumferenceCm: 88,
    smokingStatus: "never",

    bpCheckedLast6Months: false,

    chestPain: false,
    strokeSymptoms: false,
    severeBreathlessness: false,

    ...overrides,
  };
}

describe("assessHealthCheckEligibility — age boundaries", () => {
  it("39 → not_age_eligible", () => {
    expect(assessHealthCheckEligibility(baseline({ age: 39 }))).toBe(
      "not_age_eligible",
    );
  });
  it("40 → possibly", () => {
    expect(assessHealthCheckEligibility(baseline({ age: 40 }))).toBe("possibly");
  });
  it("74 → possibly", () => {
    expect(assessHealthCheckEligibility(baseline({ age: 74 }))).toBe("possibly");
  });
  it("75 → not_age_eligible", () => {
    expect(assessHealthCheckEligibility(baseline({ age: 75 }))).toBe(
      "not_age_eligible",
    );
  });
});

describe("assessHealthCheckEligibility — existing-condition exclusions", () => {
  it.each([
    "hasCvd",
    "hasChronicKidneyDisease",
    "hasDiabetes",
    "hasHypertension",
    "hasAtrialFibrillation",
    "hasStrokeOrTia",
    "hasFamilialHypercholesterolaemia",
    "hasHeartFailure",
    "hasPeripheralArterialDisease",
    "onStatins",
    "previousHighCvdRisk",
  ] as const)("%s = true → not_eligible_existing_condition", (flag) => {
    const input = baseline({ [flag]: true } as Partial<PatientInput>);
    expect(assessHealthCheckEligibility(input)).toBe(
      "not_eligible_existing_condition",
    );
  });
});

describe("bpCheckRoute — NHS pharmacy BP rule", () => {
  it("40+, England, no hypertension, not checked in 6mo → true", () => {
    expect(bpCheckRoute(baseline({ age: 45 }))).toBe(true);
  });
  it("under 40 → false", () => {
    expect(bpCheckRoute(baseline({ age: 39 }))).toBe(false);
  });
  it("not in England → false", () => {
    expect(bpCheckRoute(baseline({ livesInEngland: false }))).toBe(false);
  });
  it("already has hypertension → false", () => {
    expect(bpCheckRoute(baseline({ hasHypertension: true }))).toBe(false);
  });
  it("BP checked in last 6 months → false", () => {
    expect(bpCheckRoute(baseline({ bpCheckedLast6Months: true }))).toBe(false);
  });
});

describe("detectMissingMeasurements", () => {
  it("all present → []", () => {
    expect(detectMissingMeasurements(baseline())).toEqual([]);
  });
  it("no BP → lists 'blood pressure'", () => {
    const m = detectMissingMeasurements(baseline({ systolicBp: undefined }));
    expect(m).toContain("blood pressure");
  });
  it("no total cholesterol → lists 'cholesterol'", () => {
    const m = detectMissingMeasurements(
      baseline({ totalCholesterol: undefined }),
    );
    expect(m).toContain("cholesterol");
  });
  it("no BMI and no waist → lists 'BMI or waist circumference'", () => {
    const m = detectMissingMeasurements(
      baseline({ bmi: undefined, waistCircumferenceCm: undefined }),
    );
    expect(m).toContain("BMI or waist circumference");
  });
  it("BMI present, waist missing → does NOT list", () => {
    const m = detectMissingMeasurements(
      baseline({ waistCircumferenceCm: undefined }),
    );
    expect(m).not.toContain("BMI or waist circumference");
  });
  it("no smoking status → lists 'smoking status'", () => {
    const m = detectMissingMeasurements(baseline({ smokingStatus: undefined }));
    expect(m).toContain("smoking status");
  });
});

describe("assessPreventiveRoute — urgent precedence", () => {
  it("chest pain wins over everything (even with services), eligibility pinned to not_applicable", () => {
    const a = assessPreventiveRoute(
      baseline({ chestPain: true, age: 50 }),
      { localServices: [{ name: "Some pharmacy", type: "pharmacy" }] },
    );
    expect(a.next_step_type).toBe("urgent_care");
    expect(a.local_services).toEqual([]);
    expect(a.eligible_for_health_check).toBe("not_applicable");
  });
  it("stroke symptoms → urgent_care", () => {
    expect(
      assessPreventiveRoute(baseline({ strokeSymptoms: true })).next_step_type,
    ).toBe("urgent_care");
  });
  it("severe breathlessness → urgent_care", () => {
    expect(
      assessPreventiveRoute(baseline({ severeBreathlessness: true }))
        .next_step_type,
    ).toBe("urgent_care");
  });
  it("urgent with missing measurements still goes to urgent_care, no missing list", () => {
    const a = assessPreventiveRoute(
      baseline({ chestPain: true, systolicBp: undefined }),
    );
    expect(a.next_step_type).toBe("urgent_care");
    expect(a.missing_measurements).toEqual([]);
  });
});

describe("assessPreventiveRoute — missing-data routing", () => {
  it("missing BP + eligible for pharmacy BP → pharmacy_bp_check", () => {
    const a = assessPreventiveRoute(baseline({ systolicBp: undefined }));
    expect(a.next_step_type).toBe("pharmacy_bp_check");
    expect(a.missing_measurements).toContain("blood pressure");
    expect(a.risk_band).toBe("incomplete");
  });

  it("missing BP but ineligible for pharmacy BP (hypertension) → ask_gp_or_pharmacy_about_measurements", () => {
    const a = assessPreventiveRoute(
      baseline({ systolicBp: undefined, hasHypertension: true }),
    );
    expect(a.next_step_type).toBe("ask_gp_or_pharmacy_about_measurements");
    expect(a.missing_measurements).toContain("blood pressure");
  });

  it("missing smoking status only → ask_gp_or_pharmacy_about_measurements", () => {
    const a = assessPreventiveRoute(baseline({ smokingStatus: undefined }));
    expect(a.next_step_type).toBe("ask_gp_or_pharmacy_about_measurements");
    expect(a.missing_measurements).toEqual(["smoking status"]);
  });

  it("INVARIANT: ask_gp_or_pharmacy_about_measurements is never paired with empty missing[] (the E3 bug)", () => {
    // Drive the engine through every path that could conceivably hit this
    // branch and confirm the invariant holds.
    const variants: Partial<PatientInput>[] = [
      { systolicBp: undefined, hasHypertension: true },
      { smokingStatus: undefined },
      { totalCholesterol: undefined, hdlCholesterol: undefined },
      { bmi: undefined, waistCircumferenceCm: undefined },
    ];
    for (const v of variants) {
      const a = assessPreventiveRoute(baseline(v));
      if (a.next_step_type === "ask_gp_or_pharmacy_about_measurements") {
        expect(a.missing_measurements.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("assessPreventiveRoute — eligibility + bp routing combinations", () => {
  it("everything present, no exclusions → gp_review, incomplete risk_band", () => {
    const a = assessPreventiveRoute(baseline());
    expect(a.next_step_type).toBe("gp_review");
    expect(a.risk_band).toBe("incomplete");
    expect(a.missing_measurements).toEqual([]);
    expect(a.eligible_for_health_check).toBe("possibly");
  });

  it("age-ineligible + no exclusions + all measurements → gp_review, not_age_eligible", () => {
    const a = assessPreventiveRoute(baseline({ age: 35 }));
    expect(a.next_step_type).toBe("gp_review");
    expect(a.eligible_for_health_check).toBe("not_age_eligible");
  });

  it("existing condition + all measurements → gp_review, not_eligible_existing_condition", () => {
    const a = assessPreventiveRoute(baseline({ hasDiabetes: true }));
    expect(a.next_step_type).toBe("gp_review");
    expect(a.eligible_for_health_check).toBe("not_eligible_existing_condition");
  });
});

describe("forbidden_claims producer", () => {
  it("urgent_care does NOT add urgent-only forbidden_claims (handled by render.ts urgent-text guard)", () => {
    const a = assessPreventiveRoute(baseline({ chestPain: true }));
    // The urgent-only bans live in src/rendering/render.ts as a post-LLM
    // scoped text sweep; they are no longer carried in forbidden_claims to
    // keep the engine's vocabulary screenable by global guardrail tokens.
    expect(a.forbidden_claims).not.toContain("preventive advice");
    expect(a.forbidden_claims).not.toContain("NHS Health Check is available");
  });

  it("every assessment forbids the always-on diagnosis/prescription claims", () => {
    const a = assessPreventiveRoute(baseline());
    expect(a.forbidden_claims).toContain("you have hypertension");
    expect(a.forbidden_claims).toContain("you have diabetes");
    expect(a.forbidden_claims).toContain("your CVD risk is X%");
  });

  it("forbidden_claims is never empty", () => {
    const a = assessPreventiveRoute(baseline());
    expect(a.forbidden_claims.length).toBeGreaterThan(0);
  });
});
