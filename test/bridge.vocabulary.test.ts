import { describe, expect, it } from "vitest";
import { assessViaSafetyEngine } from "../src/rules/safety_bridge.js";
import {
  FORBIDDEN_OUTPUT_TOKENS,
  containsForbiddenToken,
} from "../src/rendering/guardrails.js";
import type { PatientInput } from "../src/contracts/patient_input.js";

/**
 * Mirror of seam 2 (test/seam.test.ts §367) — but applied to the BRIDGE.
 *
 * The bridge maintains its own ALWAYS_FORBIDDEN list (`src/rules/safety_bridge.ts`
 * line 152). It's identical to the seam engine's list today, but identical
 * by-hand-edit, not by code. If a future change to the bridge's list ever
 * widens it past what FORBIDDEN_OUTPUT_TOKENS can catch — and someone then
 * wires the bridge into the renderer instead of the seam engine — the
 * guardrail would silently fail to screen one of the bridge's claims.
 *
 * This test enumerates the bridge's full forbidden_claims vocabulary across
 * the cases that drive the seam test and asserts every claim is catchable by
 * an existing token. Same defence-in-depth model, scoped to the bridge.
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

const CASES: PatientInput[] = [
  baseline(),
  baseline({ chestPain: true }),
  baseline({ strokeSymptoms: true }),
  baseline({ severeBreathlessness: true }),
  baseline({ systolicBp: undefined, diastolicBp: undefined }),
  baseline({ totalCholesterol: undefined, hdlCholesterol: undefined }),
  baseline({ hasHypertension: true }),
  baseline({ hasDiabetes: true }),
  baseline({ age: 39 }),
  baseline({ age: 75 }),
];

describe("bridge vocabulary cross-check", () => {
  const vocabulary = new Set<string>();
  for (const input of CASES) {
    const { assessment } = assessViaSafetyEngine(input);
    for (const claim of assessment.forbidden_claims) vocabulary.add(claim);
  }

  it("emits at least one forbidden claim across the test cases", () => {
    expect(vocabulary.size).toBeGreaterThan(0);
  });

  it("FORBIDDEN_OUTPUT_TOKENS list is non-empty", () => {
    expect(FORBIDDEN_OUTPUT_TOKENS.length).toBeGreaterThan(0);
  });

  for (const claim of vocabulary) {
    it(`bridge claim "${claim}" is catchable by some FORBIDDEN_OUTPUT_TOKEN`, () => {
      const matching = containsForbiddenToken(claim);
      expect(
        matching,
        matching === null
          ? `BRIDGE SEAM GAP: bridge emits forbidden claim "${claim}" but FORBIDDEN_OUTPUT_TOKENS has no substring that would catch it.`
          : "",
      ).not.toBeNull();
    });
  }
});
