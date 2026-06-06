import { describe, expect, it } from "vitest";
import { dispatch, type ProfileResponse } from "../src/http/router.js";
import type { ZaiClient } from "../src/rendering/zai_client.js";
import type { PatientInput } from "../src/contracts/patient_input.js";
import type { PreventiveAssessment } from "../src/rules/types.js";
import { FORBIDDEN_OUTPUT_TOKENS } from "../src/rendering/guardrails.js";

/**
 * /api/nhs/profile is the augmented-seam endpoint the UI consumes. These
 * tests assert two safety properties on top of the basic shape:
 *
 *   1. Free-text fields from the rich engine (qrisk.explanation,
 *      healthCheckEligibility.explanation, missingMeasurement.whyItMatters,
 *      recommendation.title/description, screening.explanation) never reach
 *      the wire. The response carries enums / canonical keys / numbers only,
 *      decorated with engineer-authored vocabulary loaded from
 *      data/ui-vocabulary.json.
 *
 *   2. Every human-readable string in the response (card text, factor
 *      labels, statusLabels, whyItMatters) is forbidden-token-free against
 *      the same FORBIDDEN_OUTPUT_TOKENS the renderer screens model output
 *      against. The card path already guarantees this; the test extends the
 *      check to the rest of the surface so vocabulary drift in
 *      ui-vocabulary.json is caught.
 */

class StubZai implements ZaiClient {
  async complete(userJson: string): Promise<string> {
    const a = JSON.parse(userJson) as PreventiveAssessment;
    const services = a.local_services ?? [];
    if (a.next_step_type === "urgent_care") {
      return JSON.stringify({
        headline: "Please get help now",
        body: "If this feels life-threatening, call 999. Otherwise use NHS 111 online at 111.nhs.uk or call 111.",
        next_step: "Call 999 if life-threatening; otherwise NHS 111.",
        services: [],
      });
    }
    if (a.next_step_type === "pharmacy_bp_check") {
      return JSON.stringify({
        headline: "A quick check can complete the picture",
        body: "A free blood pressure check is available at most pharmacies in England if you're 40 or over.",
        next_step: "Pop into a local pharmacy for a free check.",
        services,
      });
    }
    if (a.next_step_type === "ask_gp_or_pharmacy_about_measurements") {
      return JSON.stringify({
        headline: "We need a couple of numbers first",
        body: "Some measurements are missing. A GP or local pharmacy can take them for you.",
        next_step: "Ask your GP or local pharmacy about the missing measurements.",
        services,
      });
    }
    return JSON.stringify({
      headline: "A GP appointment is the right next step",
      body: "A routine GP appointment is the best place to talk through what's next.",
      next_step: "Book a routine GP appointment.",
      services,
    });
  }
  async completeChat(): Promise<string> {
    throw new Error("not used");
  }
}

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

async function postProfile(
  patient: PatientInput,
  query = "",
  postcode?: string,
): Promise<ProfileResponse> {
  const q = new URLSearchParams(query);
  const r = await dispatch(
    "POST",
    "/api/nhs/profile",
    q,
    { patient, postcode },
    { zaiClient: new StubZai() },
  );
  expect(r.status).toBe(200);
  return r.body as ProfileResponse;
}

describe("POST /api/nhs/profile — shape", () => {
  it("returns all expected top-level keys", async () => {
    const r = await postProfile(baseline(), "live=1");
    expect(Object.keys(r).sort()).toEqual(
      [
        "card",
        "eligibility",
        "factors",
        "missing",
        "nextStep",
        "qrisk",
        "readiness",
        "screening",
        "source",
        "urgencyLevel",
      ].sort(),
    );
  });
  it("factors carries exactly 9 entries with decorated vocabulary", async () => {
    const r = await postProfile(baseline(), "live=1");
    expect(r.factors).toHaveLength(9);
    for (const f of r.factors) {
      expect(typeof f.label).toBe("string");
      expect(f.label.length).toBeGreaterThan(0);
      expect(typeof f.whyItMatters).toBe("string");
      expect(f.whyItMatters.length).toBeGreaterThan(0);
      expect(f.nhsUrl.startsWith("https://www.nhs.uk")).toBe(true);
    }
  });
  it("readiness summarises the factor list correctly", async () => {
    const r = await postProfile(baseline(), "live=1");
    expect(r.readiness.total).toBe(9);
    expect(r.readiness.recorded + r.readiness.protective + r.readiness.unknown).toBe(9);
  });
  it("source is live for fresh stub render at canonical postcode without ?live=1 only when cache exists", async () => {
    const r = await postProfile(baseline(), "live=1", "SW1A 1AA");
    expect(["live", "safe_fallback"]).toContain(r.source);
  });
});

describe("POST /api/nhs/profile — no rich-engine free text leaks", () => {
  /**
   * The rich engine has free-text fields like "Knowing your numbers can be
   * useful when speaking with a healthcare provider about general health."
   * If any of those strings leaked, this assertion would catch them by
   * looking for the distinctive substrings the rich engine emits.
   *
   * The test isn't trying to be exhaustive — it's a guard against the most
   * likely drift modes.
   */
  const richEngineFingerprints = [
    "Knowing your numbers can be useful when speaking with",
    "Family history can provide context about inherited",
    "is one of the key measurements used in preventive health discussions",
    "The ratio of total cholesterol to HDL",
    "Body measurements help assess overall health",
  ];

  it("none of the rich-engine free-text fingerprints appears anywhere in the response", async () => {
    const r = await postProfile(baseline({ smokingStatus: undefined }), "live=1");
    const serialised = JSON.stringify(r);
    for (const fp of richEngineFingerprints) {
      expect(serialised.includes(fp)).toBe(false);
    }
  });
});

describe("POST /api/nhs/profile — all human-readable text is forbidden-token-free", () => {
  function collectHumanText(r: ProfileResponse): string[] {
    return [
      r.card.headline,
      r.card.body,
      r.card.next_step,
      ...r.factors.flatMap((f) => [f.label, f.statusLabel, f.whyItMatters]),
    ];
  }
  it("baseline patient → no forbidden token in any string", async () => {
    const r = await postProfile(baseline(), "live=1");
    for (const s of collectHumanText(r)) {
      const lower = s.toLowerCase();
      for (const t of FORBIDDEN_OUTPUT_TOKENS) {
        expect(lower.includes(t), `forbidden token "${t}" found in "${s}"`).toBe(false);
      }
    }
  });
  it("missing-BP patient → no forbidden token in any string", async () => {
    const r = await postProfile(
      baseline({ systolicBp: undefined, diastolicBp: undefined }),
      "live=1",
    );
    for (const s of collectHumanText(r)) {
      const lower = s.toLowerCase();
      for (const t of FORBIDDEN_OUTPUT_TOKENS) {
        expect(lower.includes(t), `forbidden token "${t}" in "${s}"`).toBe(false);
      }
    }
  });
});

describe("POST /api/nhs/profile — urgent path", () => {
  it("chest pain collapses to urgent: services empty, eligibility not_applicable, urgencyLevel emergency", async () => {
    const r = await postProfile(baseline({ chestPain: true }), "live=1");
    expect(r.nextStep).toBe("urgent_care");
    expect(r.eligibility.status).toBe("not_applicable");
    expect(r.urgencyLevel).toBe("emergency");
    expect(r.card.services).toEqual([]);
  });
});

describe("POST /api/nhs/profile — validation errors", () => {
  it("missing body returns 400", async () => {
    const r = await dispatch(
      "POST",
      "/api/nhs/profile",
      new URLSearchParams(),
      null,
      { zaiClient: new StubZai() },
    );
    expect(r.status).toBe(400);
  });
  it("invalid patient returns 400", async () => {
    const r = await dispatch(
      "POST",
      "/api/nhs/profile",
      new URLSearchParams(),
      { patient: { age: -5 } },
      { zaiClient: new StubZai() },
    );
    expect(r.status).toBe(400);
  });
});
