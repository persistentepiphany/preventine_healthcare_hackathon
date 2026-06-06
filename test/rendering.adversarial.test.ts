import { describe, expect, it } from "vitest";
import { renderAssessment } from "../src/rendering/render.js";
import { SAFE_FALLBACK_CARD } from "../src/rendering/safe_fallback.js";
import { ADVERSARIAL_INPUTS } from "../src/rendering/adversarial.js";
import {
  FORBIDDEN_OUTPUT_TOKENS,
  validateAssessment,
} from "../src/rendering/guardrails.js";
import type { ZaiClient } from "../src/rendering/zai_client.js";
import type { PreventiveAssessment } from "../src/rules/types.js";

/**
 * Stub that returns a context-aware "good" card given a valid assessment.
 * Used to test the renderer's post-LLM safety wrapper when the model behaves.
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

    // gp_review (and anything else that somehow slips through)
    return JSON.stringify({
      headline: "A GP appointment is the right next step",
      body: "Based on your information, a routine GP appointment is the best place to talk through what's next. They can answer your questions and arrange anything further if needed.",
      next_step: "Book a routine GP appointment.",
      services,
    });
  }
  async completeChat(): Promise<string> {
    throw new Error("completeChat not used in this test");
  }
}

/** Stub that always throws — proves the LLM was never called. */
class NeverCalledClient implements ZaiClient {
  async complete(): Promise<string> {
    throw new Error("LLM should not have been called for this input");
  }
  async completeChat(): Promise<string> {
    throw new Error("LLM should not have been called for this input");
  }
}

/** Stub that returns intentionally unsafe output. */
class MisbehavingClient implements ZaiClient {
  constructor(private readonly response: string) {}
  async complete(): Promise<string> {
    return this.response;
  }
  async completeChat(): Promise<string> {
    return this.response;
  }
}

function isSafeFallback(card: unknown): boolean {
  return JSON.stringify(card) === JSON.stringify(SAFE_FALLBACK_CARD);
}

describe("guardrails — adversarial inputs that should never reach the LLM", () => {
  const guardrailCaught = ADVERSARIAL_INPUTS.filter((c) => c.expectSafeFallback);

  for (const tc of guardrailCaught) {
    it(`${tc.name} → safe fallback (LLM never called)`, async () => {
      const card = await renderAssessment(tc.input, { client: new NeverCalledClient() });
      expect(isSafeFallback(card)).toBe(true);
    });
  }
});

describe("rendering — adversarial inputs that pass guardrails", () => {
  const passThrough = ADVERSARIAL_INPUTS.filter((c) => !c.expectSafeFallback);

  for (const tc of passThrough) {
    it(`${tc.name} → schema-valid, no forbidden tokens`, async () => {
      const card = await renderAssessment(tc.input, { client: new WellBehavedClient() });

      // Global forbidden-token sweep on rendered text only (not service names).
      const text = `${card.headline}\n${card.body}\n${card.next_step}`.toLowerCase();
      for (const tok of FORBIDDEN_OUTPUT_TOKENS) {
        expect(text, `forbidden token "${tok}" appeared`).not.toContain(tok);
      }

      // Per-case extra assertions.
      if (tc.assert?.noTokens) {
        for (const tok of tc.assert.noTokens) {
          expect(text, `case-specific forbidden token "${tok}" appeared`).not.toContain(
            tok.toLowerCase(),
          );
        }
      }
      if (tc.assert?.noServices) {
        expect(card.services).toEqual([]);
      }
    });
  }
});

describe("rendering — post-LLM safety net catches misbehaving models", () => {
  const validAssessment = {
    risk_band: "moderate" as const,
    missing_measurements: [],
    eligible_for_health_check: "possibly" as const,
    next_step_type: "gp_review" as const,
    forbidden_claims: [],
  };

  it("model emits invalid JSON → safe fallback", async () => {
    const card = await renderAssessment(validAssessment, {
      client: new MisbehavingClient("not json at all"),
    });
    expect(isSafeFallback(card)).toBe(true);
  });

  it("model emits card with forbidden token → safe fallback", async () => {
    const card = await renderAssessment(validAssessment, {
      client: new MisbehavingClient(
        JSON.stringify({
          headline: "Take a statin",
          body: "Based on your risk you should start a statin today.",
          next_step: "Ask your GP for a statin prescription.",
          services: [],
        }),
      ),
    });
    expect(isSafeFallback(card)).toBe(true);
  });

  it("model emits extra top-level fields → safe fallback", async () => {
    const card = await renderAssessment(validAssessment, {
      client: new MisbehavingClient(
        JSON.stringify({
          headline: "A GP appointment is the right next step",
          body: "Book a GP appointment.",
          next_step: "Book a GP appointment.",
          services: [],
          extra_field: "should not be here",
        }),
      ),
    });
    expect(isSafeFallback(card)).toBe(true);
  });

  it("model emits services on urgent_care → safe fallback", async () => {
    const urgent = { ...validAssessment, next_step_type: "urgent_care" as const };
    const card = await renderAssessment(urgent, {
      client: new MisbehavingClient(
        JSON.stringify({
          headline: "Please get help now",
          body: "Call 999 or NHS 111.",
          next_step: "Call 999 if life-threatening; otherwise NHS 111.",
          services: [{ name: "Some pharmacy", type: "pharmacy" }],
        }),
      ),
    });
    expect(isSafeFallback(card)).toBe(true);
  });

  it("model throws → safe fallback", async () => {
    const card = await renderAssessment(validAssessment, {
      client: {
        complete: async () => {
          throw new Error("upstream down");
        },
        completeChat: async () => {
          throw new Error("upstream down");
        },
      },
    });
    expect(isSafeFallback(card)).toBe(true);
  });
});

describe("guardrails unit checks", () => {
  it("rejects array input", () => {
    const r = validateAssessment([]);
    expect(r.ok).toBe(false);
  });

  it("accepts a minimal valid assessment", () => {
    const r = validateAssessment({
      risk_band: "low",
      missing_measurements: [],
      eligible_for_health_check: "possibly",
      next_step_type: "gp_review",
      forbidden_claims: [],
    });
    expect(r.ok).toBe(true);
  });

  it("strips assessments carrying any clinical extra field", () => {
    const r = validateAssessment({
      risk_band: "moderate",
      missing_measurements: [],
      eligible_for_health_check: "possibly",
      next_step_type: "gp_review",
      forbidden_claims: [],
      diagnosis: "anything",
    });
    expect(r.ok).toBe(false);
  });
});
