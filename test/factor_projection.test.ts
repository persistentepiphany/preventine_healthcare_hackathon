import { describe, expect, it } from "vitest";
import {
  projectFactors,
  summariseReadiness,
  type Factor,
  type FactorId,
} from "../src/rules/factor_projection.js";
import type { PatientInput } from "../src/contracts/patient_input.js";

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

function get(factors: Factor[], id: FactorId): Factor {
  const f = factors.find((x) => x.id === id);
  if (!f) throw new Error(`factor ${id} not in projection`);
  return f;
}

describe("projectFactors — shape and stability", () => {
  it("returns exactly 9 factors in stable order", () => {
    const factors = projectFactors(baseline());
    expect(factors.map((f) => f.id)).toEqual([
      "age",
      "blood_pressure",
      "cholesterol",
      "smoking",
      "bmi_or_waist",
      "cvd_history",
      "diabetes",
      "hypertension",
      "kidney_disease",
    ]);
  });
  it("is deterministic — same input twice gives identical output", () => {
    expect(projectFactors(baseline())).toEqual(projectFactors(baseline()));
  });
});

describe("projectFactors — age", () => {
  it("age is always recorded (schema requires it)", () => {
    expect(get(projectFactors(baseline({ age: 18 })), "age").status).toBe("recorded");
    expect(get(projectFactors(baseline({ age: 80 })), "age").status).toBe("recorded");
  });
});

describe("projectFactors — blood pressure", () => {
  it("both BP readings present → recorded", () => {
    expect(get(projectFactors(baseline()), "blood_pressure").status).toBe("recorded");
  });
  it("systolic missing → unknown", () => {
    const f = get(
      projectFactors(baseline({ systolicBp: undefined })),
      "blood_pressure",
    );
    expect(f.status).toBe("unknown");
  });
  it("diastolic missing → unknown", () => {
    const f = get(
      projectFactors(baseline({ diastolicBp: undefined })),
      "blood_pressure",
    );
    expect(f.status).toBe("unknown");
  });
  it("both missing → unknown", () => {
    const f = get(
      projectFactors(baseline({ systolicBp: undefined, diastolicBp: undefined })),
      "blood_pressure",
    );
    expect(f.status).toBe("unknown");
  });
});

describe("projectFactors — cholesterol", () => {
  it("both numerator and denominator present → recorded", () => {
    expect(get(projectFactors(baseline()), "cholesterol").status).toBe("recorded");
  });
  it("total missing → unknown", () => {
    expect(
      get(projectFactors(baseline({ totalCholesterol: undefined })), "cholesterol").status,
    ).toBe("unknown");
  });
  it("HDL missing → unknown", () => {
    expect(
      get(projectFactors(baseline({ hdlCholesterol: undefined })), "cholesterol").status,
    ).toBe("unknown");
  });
});

describe("projectFactors — smoking", () => {
  it("never → protective", () => {
    expect(get(projectFactors(baseline({ smokingStatus: "never" })), "smoking").status).toBe(
      "protective",
    );
  });
  it("former → protective (engine treats quitting as favourable)", () => {
    expect(
      get(projectFactors(baseline({ smokingStatus: "former" })), "smoking").status,
    ).toBe("protective");
  });
  it("current → recorded (not protective)", () => {
    expect(
      get(projectFactors(baseline({ smokingStatus: "current" })), "smoking").status,
    ).toBe("recorded");
  });
  it("undefined → unknown", () => {
    expect(
      get(projectFactors(baseline({ smokingStatus: undefined })), "smoking").status,
    ).toBe("unknown");
  });
});

describe("projectFactors — BMI or waist (either-or)", () => {
  it("BMI only present → recorded", () => {
    expect(
      get(projectFactors(baseline({ waistCircumferenceCm: undefined })), "bmi_or_waist").status,
    ).toBe("recorded");
  });
  it("waist only present → recorded", () => {
    expect(get(projectFactors(baseline({ bmi: undefined })), "bmi_or_waist").status).toBe(
      "recorded",
    );
  });
  it("both missing → unknown", () => {
    expect(
      get(
        projectFactors(baseline({ bmi: undefined, waistCircumferenceCm: undefined })),
        "bmi_or_waist",
      ).status,
    ).toBe("unknown");
  });
});

describe("projectFactors — binary comorbidities", () => {
  const cases: { field: keyof PatientInput; factorId: FactorId }[] = [
    { field: "hasCvd", factorId: "cvd_history" },
    { field: "hasDiabetes", factorId: "diabetes" },
    { field: "hasHypertension", factorId: "hypertension" },
    { field: "hasChronicKidneyDisease", factorId: "kidney_disease" },
  ];
  for (const { field, factorId } of cases) {
    it(`${String(field)} false → ${factorId} protective`, () => {
      expect(
        get(projectFactors(baseline({ [field]: false } as Partial<PatientInput>)), factorId).status,
      ).toBe("protective");
    });
    it(`${String(field)} true → ${factorId} recorded`, () => {
      expect(
        get(projectFactors(baseline({ [field]: true } as Partial<PatientInput>)), factorId).status,
      ).toBe("recorded");
    });
  }
});

describe("summariseReadiness", () => {
  it("all-favourable baseline → 7 protective (5 binary + smoking + age recorded + BP/chol recorded)", () => {
    const r = summariseReadiness(projectFactors(baseline()));
    expect(r.total).toBe(9);
    expect(r.unknown).toBe(0);
    expect(r.percent).toBe(100);
  });
  it("missing BP and cholesterol → unknown=2, percent < 100", () => {
    const r = summariseReadiness(
      projectFactors(
        baseline({
          systolicBp: undefined,
          diastolicBp: undefined,
          totalCholesterol: undefined,
          hdlCholesterol: undefined,
        }),
      ),
    );
    expect(r.unknown).toBe(2);
    expect(r.percent).toBeLessThan(100);
  });
  it("everything unknown → percent floor", () => {
    const r = summariseReadiness(
      projectFactors(
        baseline({
          systolicBp: undefined,
          diastolicBp: undefined,
          totalCholesterol: undefined,
          hdlCholesterol: undefined,
          bmi: undefined,
          waistCircumferenceCm: undefined,
          smokingStatus: undefined,
          // comorbidities are required booleans — set all to true so even
          // those factors are recorded (no false→protective), maximising
          // unknown count.
          hasCvd: true,
          hasDiabetes: true,
          hasHypertension: true,
          hasChronicKidneyDisease: true,
        }),
      ),
    );
    // age is always recorded; 4 comorbidities recorded (true); 4 unknowns
    // (BP, chol, smoking, BMI). percent = 5/9 ≈ 56.
    expect(r.unknown).toBe(4);
    expect(r.recorded).toBe(5);
    expect(r.protective).toBe(0);
    expect(r.percent).toBe(56);
  });
});
