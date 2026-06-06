import { describe, expect, it, vi, afterEach } from "vitest";
import { dispatch } from "../src/http/router.js";
import { assessPreventiveRoute } from "../src/rules/engine.js";
import { renderAssessment } from "../src/rendering/render.js";
import { parsePatientInput } from "../src/contracts/patient_input.js";
import { SAFE_FALLBACK_CARD } from "../src/rendering/safe_fallback.js";
import type { ZaiClient } from "../src/rendering/zai_client.js";
import type { PreventiveAssessment } from "../src/rules/types.js";

afterEach(() => vi.restoreAllMocks());

/**
 * Context-aware stub. Mirrors the well-behaved client from the rendering
 * adversarial tests so we can prove the full chain end-to-end without paying
 * a live z.ai round-trip.
 */
class WellBehavedClient implements ZaiClient {
  async complete(userJson: string): Promise<string> {
    const a = JSON.parse(userJson) as PreventiveAssessment;
    const services = a.local_services ?? [];

    if (a.next_step_type === "urgent_care") {
      return JSON.stringify({
        headline: "Please get help now",
        body: "Based on what you've told us, you should speak to a clinician straight away. If this feels life-threatening, call 999. Otherwise use NHS 111 online at 111.nhs.uk or call 111.",
        next_step: "Call 999 if life-threatening; otherwise NHS 111.",
        services: [],
      });
    }
    if (a.next_step_type === "pharmacy_bp_check") {
      return JSON.stringify({
        headline: "A quick check can complete the picture",
        body: "A free blood pressure check is available at most pharmacies in England if you're 40 or over — no appointment needed. Knowing your numbers will help complete your assessment.",
        next_step: "Pop into a local pharmacy for a free blood pressure check.",
        services,
      });
    }
    if (a.next_step_type === "ask_gp_or_pharmacy_about_measurements") {
      return JSON.stringify({
        headline: "We need a couple of numbers first",
        body: "Some measurements are missing from your information. A GP or local pharmacy can take them for you, which will complete the picture.",
        next_step: "Ask your GP or local pharmacy about the missing measurements.",
        services,
      });
    }
    return JSON.stringify({
      headline: "A GP appointment is the right next step",
      body: "Based on your information, a routine GP appointment is the best place to talk through what's next.",
      next_step: "Book a routine GP appointment.",
      services,
    });
  }
  async completeChat(): Promise<string> {
    throw new Error("completeChat not used in this test");
  }
}

const baselinePatient = {
  age: 52,
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

  // BP intentionally missing — drives pharmacy_bp_check.
  bpCheckedLast6Months: false,

  totalCholesterol: 4.8,
  hdlCholesterol: 1.2,
  bmi: 26,
  waistCircumferenceCm: 92,
  smokingStatus: "former" as const,

  chestPain: false,
  strokeSymptoms: false,
  severeBreathlessness: false,
};

describe("end-to-end integration: PatientInput → engine → render → card", () => {
  it("missing-BP demo case routes to pharmacy_bp_check and renders a valid card with services", async () => {
    const parsed = parsePatientInput(baselinePatient);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const assessment = assessPreventiveRoute(parsed.value, {
      localServices: [
        { name: "Boots Pharmacy, Wilmslow Road", type: "pharmacy" },
      ],
    });
    expect(assessment.next_step_type).toBe("pharmacy_bp_check");
    expect(assessment.missing_measurements).toContain("blood pressure");

    const card = await renderAssessment(assessment, {
      client: new WellBehavedClient(),
    });
    expect(card.headline).not.toBe(SAFE_FALLBACK_CARD.headline);
    expect(card.services.length).toBe(1);
    expect(card.services[0]?.name).toContain("Boots");
  });

  it("urgent-care case ends up with empty services and no Health Check framing", async () => {
    const parsed = parsePatientInput({ ...baselinePatient, chestPain: true });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const assessment = assessPreventiveRoute(parsed.value, {
      localServices: [
        { name: "Boots Pharmacy, Wilmslow Road", type: "pharmacy" },
      ],
    });
    expect(assessment.next_step_type).toBe("urgent_care");
    expect(assessment.local_services).toEqual([]);

    const card = await renderAssessment(assessment, {
      client: new WellBehavedClient(),
    });
    expect(card.services).toEqual([]);
    expect(
      `${card.headline} ${card.body} ${card.next_step}`.toLowerCase(),
    ).not.toContain("health check");
  });
});

describe("HTTP router — endpoints surface the right contracts", () => {
  it("GET /api/nhs/context returns LocalPreventiveContext shape", async () => {
    // Postcode source down — still expect a usable bundle.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );

    const r = await dispatch(
      "GET",
      "/api/nhs/context",
      new URLSearchParams("postcode=M13%209PL"),
      undefined,
    );
    expect(r.status).toBe(200);
    const body = r.body as Record<string, unknown>;
    expect(body.inputPostcode).toBe("M13 9PL");
    expect(body.dataQuality).toBeDefined();
    expect(Array.isArray(body.services)).toBe(true);
    expect(Array.isArray(body.officialContent)).toBe(true);
  });

  it("GET /api/nhs/context returns 400 on missing postcode", async () => {
    const r = await dispatch(
      "GET",
      "/api/nhs/context",
      new URLSearchParams(),
      undefined,
    );
    expect(r.status).toBe(400);
  });

  it("POST /api/nhs/gp-summary with valid patient renders a card", async () => {
    const r = await dispatch(
      "POST",
      "/api/nhs/gp-summary",
      new URLSearchParams("live=1"),
      { patient: baselinePatient, postcode: "OX1 1AA" },
      { zaiClient: new WellBehavedClient() },
    );
    expect(r.status).toBe(200);
    const body = r.body as { card: { headline: string }; source: string };
    expect(body.source).toBe("live");
    expect(body.card.headline).not.toBe(SAFE_FALLBACK_CARD.headline);
  });

  it("POST /api/nhs/gp-summary with invalid patient returns 400", async () => {
    const r = await dispatch(
      "POST",
      "/api/nhs/gp-summary",
      new URLSearchParams(),
      { patient: { age: "not a number" } },
      { zaiClient: new WellBehavedClient() },
    );
    expect(r.status).toBe(400);
  });

  it("GET /api/nhs/services returns status-reporting shape (cached for demo)", async () => {
    const r = await dispatch(
      "GET",
      "/api/nhs/services",
      new URLSearchParams("postcode=M13%209PL"),
      undefined,
    );
    expect(r.status).toBe(200);
    const body = r.body as { services: unknown[]; status: string };
    expect(body.status).toBe("cached");
    expect(body.services.length).toBeGreaterThan(0);
  });

  it("GET /api/nhs/waiting-times → cached + isPersonalPrediction=false", async () => {
    const r = await dispatch(
      "GET",
      "/api/nhs/waiting-times",
      new URLSearchParams(),
      undefined,
    );
    expect(r.status).toBe(200);
    const body = r.body as { data: { isPersonalPrediction: boolean } };
    expect(body.data.isPersonalPrediction).toBe(false);
  });

  it("unknown path → 404", async () => {
    const r = await dispatch("GET", "/nope", new URLSearchParams(), undefined);
    expect(r.status).toBe(404);
  });
});

describe("HTTP router — new z.ai surfaces", () => {
  it("POST /api/nhs/factor-explain → explanation payload", async () => {
    class FactorClient implements ZaiClient {
      async complete(): Promise<string> {
        throw new Error("complete not used");
      }
      async completeChat(): Promise<string> {
        return JSON.stringify({
          headline: "Why waist matters",
          body: "Your waist measurement is one of the things a GP looks at when getting an overall picture of your health.",
        });
      }
    }
    const r = await dispatch(
      "POST",
      "/api/nhs/factor-explain",
      new URLSearchParams("live=1"),
      { patient: baselinePatient, factorKey: "waistCircumferenceCm", postcode: "OX1 1AA" },
      { zaiClient: new FactorClient() },
    );
    expect(r.status).toBe(200);
    const body = r.body as { explanation: { headline: string; body: string }; source: string };
    expect(body.source).toBe("live");
    expect(body.explanation.headline.length).toBeGreaterThan(0);
  });

  it("POST /api/nhs/factor-explain with unknown factor → 400", async () => {
    const r = await dispatch(
      "POST",
      "/api/nhs/factor-explain",
      new URLSearchParams(),
      { patient: baselinePatient, factorKey: "doesNotExist" },
      { zaiClient: new WellBehavedClient() },
    );
    expect(r.status).toBe(400);
  });

  it("POST /api/nhs/questions-to-ask → 3–4 questions", async () => {
    class QClient implements ZaiClient {
      async complete(): Promise<string> {
        throw new Error("complete not used");
      }
      async completeChat(): Promise<string> {
        return JSON.stringify({
          questions: [
            "Could we talk through the missing blood pressure reading?",
            "Is a free pharmacy check the easiest next step for me?",
            "What would you like me to bring next time?",
          ],
        });
      }
    }
    const r = await dispatch(
      "POST",
      "/api/nhs/questions-to-ask",
      new URLSearchParams("live=1"),
      { patient: baselinePatient },
      { zaiClient: new QClient() },
    );
    expect(r.status).toBe(200);
    const body = r.body as { questions: string[]; source: string };
    expect(body.questions.length).toBeGreaterThanOrEqual(3);
    expect(body.questions.length).toBeLessThanOrEqual(4);
  });

  it("POST /api/nhs/gp-summary with tone='simple' goes through the tone path", async () => {
    class ToneClient implements ZaiClient {
      sawSystem = "";
      async complete(): Promise<string> {
        throw new Error("complete not used");
      }
      async completeChat(messages: { role: string; content: string }[]): Promise<string> {
        const sys = messages.find((m) => m.role === "system");
        this.sawSystem = sys?.content ?? "";
        return JSON.stringify({
          headline: "A pharmacy can help",
          body: "A free blood pressure check is available at most pharmacies in England if you're 40 or over.",
          next_step: "Pop into a local pharmacy for a free blood pressure check.",
          services: [],
        });
      }
    }
    const client = new ToneClient();
    const r = await dispatch(
      "POST",
      "/api/nhs/gp-summary",
      new URLSearchParams("live=1"),
      { patient: baselinePatient, tone: "simple" },
      { zaiClient: client },
    );
    expect(r.status).toBe(200);
    expect(client.sawSystem).toContain("TONE OVERRIDE (simple)");
  });

  it("POST /api/nhs/unlock-narration with no resolution → no-change without LLM call", async () => {
    class NoLLMClient implements ZaiClient {
      async complete(): Promise<string> {
        throw new Error("must not be called");
      }
      async completeChat(): Promise<string> {
        throw new Error("must not be called");
      }
    }
    // baselinePatient is missing systolicBp → engine will still report blood
    // pressure as missing → previouslyMissing=["blood pressure"] does not
    // resolve.
    const r = await dispatch(
      "POST",
      "/api/nhs/unlock-narration",
      new URLSearchParams(),
      {
        patient: baselinePatient,
        previouslyMissing: ["blood pressure"],
      },
      { zaiClient: new NoLLMClient() },
    );
    expect(r.status).toBe(200);
    const body = r.body as { narration: string | null; source: string };
    expect(body.source).toBe("no-change");
    expect(body.narration).toBeNull();
  });

  it("POST /api/nhs/unlock-narration with a resolved measurement → narration via LLM", async () => {
    class UnlockClient implements ZaiClient {
      async complete(): Promise<string> {
        throw new Error("complete not used");
      }
      async completeChat(): Promise<string> {
        return JSON.stringify({
          narration:
            "Now that your blood pressure is in, more of the picture is clear — your GP can talk this through with you.",
        });
      }
    }
    const filled = { ...baselinePatient, systolicBp: 122, diastolicBp: 78 };
    const r = await dispatch(
      "POST",
      "/api/nhs/unlock-narration",
      new URLSearchParams("live=1"),
      {
        patient: filled,
        previouslyMissing: ["blood pressure"],
      },
      { zaiClient: new UnlockClient() },
    );
    expect(r.status).toBe(200);
    const body = r.body as { narration: string | null; resolved: string[]; source: string };
    expect(body.source).toBe("live");
    expect(body.resolved).toEqual(["blood pressure"]);
    expect(body.narration).not.toBeNull();
  });
});
