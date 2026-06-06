import { describe, expect, it } from "vitest";
import {
  QUESTIONS_SAFE_FALLBACK,
  renderQuestions,
  type QuestionsInput,
  type QuestionsJson,
} from "../src/rendering/questions.js";
import type { ZaiClient, ZaiMessage } from "../src/rendering/zai_client.js";

class WellBehavedClient implements ZaiClient {
  async complete(): Promise<string> {
    throw new Error("complete not used in this test");
  }
  async completeChat(_messages: ZaiMessage[]): Promise<string> {
    return JSON.stringify({
      questions: [
        "Could we talk through what the missing blood pressure reading would change?",
        "Is a free pharmacy blood pressure check the easiest next step for me?",
        "What would you like me to keep an eye on before our next appointment?",
      ],
    });
  }
}

class ThrowingClient implements ZaiClient {
  async complete(): Promise<string> {
    throw new Error("upstream down");
  }
  async completeChat(): Promise<string> {
    throw new Error("upstream down");
  }
}

class StringClient implements ZaiClient {
  constructor(private readonly response: string) {}
  async complete(): Promise<string> {
    return this.response;
  }
  async completeChat(): Promise<string> {
    return this.response;
  }
}

const validInput: QuestionsInput = {
  assessment: {
    risk_band: "incomplete",
    next_step_type: "pharmacy_bp_check",
    missing_measurements: ["blood pressure"],
    eligible_for_health_check: "possibly",
    forbidden_claims: ["you have hypertension"],
  },
  factors: [
    { key: "age", label: "Aged 40–74 (NHS Health Check age range)", value: "52" },
    { key: "smokingStatus", label: "Ex-smoker", value: "" },
  ],
};

function isFallback(q: QuestionsJson): boolean {
  return JSON.stringify(q.questions) === JSON.stringify(QUESTIONS_SAFE_FALLBACK.questions);
}

describe("questions-to-ask renderer", () => {
  it("well-behaved → 3–4 questions, no forbidden tokens", async () => {
    const out = await renderQuestions(validInput, { client: new WellBehavedClient() });
    expect(out.questions.length).toBeGreaterThanOrEqual(3);
    expect(out.questions.length).toBeLessThanOrEqual(4);
    expect(isFallback(out)).toBe(false);
  });

  it("client throws → safe fallback", async () => {
    const out = await renderQuestions(validInput, { client: new ThrowingClient() });
    expect(isFallback(out)).toBe(true);
  });

  it("invalid JSON → safe fallback", async () => {
    const out = await renderQuestions(validInput, { client: new StringClient("nope") });
    expect(isFallback(out)).toBe(true);
  });

  it("only 2 questions → safe fallback (below min)", async () => {
    const out = await renderQuestions(validInput, {
      client: new StringClient(
        JSON.stringify({ questions: ["one?", "two?"] }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });

  it("5 questions → safe fallback (above max)", async () => {
    const out = await renderQuestions(validInput, {
      client: new StringClient(
        JSON.stringify({
          questions: ["one?", "two?", "three?", "four?", "five?"],
        }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });

  it("forbidden token in any question → safe fallback", async () => {
    const out = await renderQuestions(validInput, {
      client: new StringClient(
        JSON.stringify({
          questions: [
            "Should I start taking a statin?",
            "Anything I should watch for?",
            "Anything to bring next time?",
          ],
        }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });

  it("extra top-level field → safe fallback", async () => {
    const out = await renderQuestions(validInput, {
      client: new StringClient(
        JSON.stringify({
          questions: ["one?", "two?", "three?"],
          extra: "nope",
        }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });
});
