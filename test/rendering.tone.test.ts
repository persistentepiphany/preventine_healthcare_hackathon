import { describe, expect, it } from "vitest";
import {
  DETAILED_TONE_INSTRUCTION,
  SIMPLE_TONE_INSTRUCTION,
  renderAssessmentWithTone,
} from "../src/rendering/tone.js";
import { SAFE_FALLBACK_CARD } from "../src/rendering/safe_fallback.js";
import type { ZaiClient, ZaiMessage } from "../src/rendering/zai_client.js";
import type { PreventiveAssessment } from "../src/rules/types.js";

class CapturingClient implements ZaiClient {
  lastMessages: ZaiMessage[] = [];
  async complete(): Promise<string> {
    throw new Error("complete should not be called for tone toggle");
  }
  async completeChat(messages: ZaiMessage[]): Promise<string> {
    this.lastMessages = messages;
    return JSON.stringify({
      headline: "A GP appointment is the right next step",
      body: "Based on your information, a routine GP appointment is the best place to talk through what's next.",
      next_step: "Book a routine GP appointment.",
      services: [],
    });
  }
}

const baseAssessment: PreventiveAssessment = {
  risk_band: "incomplete",
  missing_measurements: [],
  eligible_for_health_check: "possibly",
  next_step_type: "gp_review",
  local_services: [],
  forbidden_claims: [],
};

describe("tone toggle", () => {
  it("simple → tone clause is appended to the system prompt", async () => {
    const client = new CapturingClient();
    await renderAssessmentWithTone(baseAssessment, "simple", { client });
    const sys = client.lastMessages.find((m) => m.role === "system");
    expect(sys?.content).toContain(SIMPLE_TONE_INSTRUCTION.trim());
  });

  it("detailed → tone clause is appended to the system prompt", async () => {
    const client = new CapturingClient();
    await renderAssessmentWithTone(baseAssessment, "detailed", { client });
    const sys = client.lastMessages.find((m) => m.role === "system");
    expect(sys?.content).toContain(DETAILED_TONE_INSTRUCTION.trim());
  });

  it("simple → returns a valid card (post-LLM guard chain reused)", async () => {
    const out = await renderAssessmentWithTone(baseAssessment, "simple", {
      client: new CapturingClient(),
    });
    expect(out.headline).not.toBe(SAFE_FALLBACK_CARD.headline);
  });

  it("client throws → safe fallback (guard chain catches it)", async () => {
    const out = await renderAssessmentWithTone(baseAssessment, "simple", {
      client: {
        complete: async () => {
          throw new Error("not used");
        },
        completeChat: async () => {
          throw new Error("upstream down");
        },
      },
    });
    expect(out.headline).toBe(SAFE_FALLBACK_CARD.headline);
  });

  it("urgent_care + tone: rendered services on output → safe fallback", async () => {
    const urgent: PreventiveAssessment = {
      ...baseAssessment,
      next_step_type: "urgent_care",
      eligible_for_health_check: "not_applicable",
    };
    const out = await renderAssessmentWithTone(urgent, "simple", {
      client: {
        complete: async () => {
          throw new Error("not used");
        },
        completeChat: async () =>
          JSON.stringify({
            headline: "Please get help now",
            body: "Call 999 or NHS 111.",
            next_step: "Call 999 if life-threatening; otherwise NHS 111.",
            services: [{ name: "Some pharmacy", type: "pharmacy" }],
          }),
      },
    });
    expect(out.headline).toBe(SAFE_FALLBACK_CARD.headline);
  });
});
