import { describe, expect, it } from "vitest";
import {
  FACTOR_EXPLAIN_SAFE_FALLBACK,
  renderFactorExplain,
  type FactorExplainInput,
  type FactorExplanation,
} from "../src/rendering/factor_explain.js";
import type { ZaiClient, ZaiMessage } from "../src/rendering/zai_client.js";

class WellBehavedClient implements ZaiClient {
  lastMessages: ZaiMessage[] = [];
  async complete(): Promise<string> {
    throw new Error("complete not used in this test");
  }
  async completeChat(messages: ZaiMessage[]): Promise<string> {
    this.lastMessages = messages;
    return JSON.stringify({
      headline: "Why this measurement matters",
      body: "Your waist measurement is one of the things a GP looks at as part of an overall picture. It can be useful alongside the other measurements when you next speak to them.",
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

const validInput: FactorExplainInput = {
  factor: { key: "waistCircumferenceCm", label: "Raised waist measurement", value: "102 cm" },
  assessment: {
    risk_band: "incomplete",
    next_step_type: "pharmacy_bp_check",
    missing_measurements: ["blood pressure"],
    forbidden_claims: ["you have hypertension"],
  },
};

function isFallback(e: FactorExplanation): boolean {
  return (
    e.headline === FACTOR_EXPLAIN_SAFE_FALLBACK.headline &&
    e.body === FACTOR_EXPLAIN_SAFE_FALLBACK.body
  );
}

describe("factor-explain renderer", () => {
  it("well-behaved client → returns schema-valid explanation", async () => {
    const client = new WellBehavedClient();
    const out = await renderFactorExplain(validInput, { client });
    expect(out.headline.length).toBeGreaterThan(0);
    expect(out.body.length).toBeGreaterThan(0);
    expect(isFallback(out)).toBe(false);
    // The system prompt must be the first message — and only one system message.
    expect(client.lastMessages[0]?.role).toBe("system");
    const systemCount = client.lastMessages.filter((m) => m.role === "system").length;
    expect(systemCount).toBe(1);
  });

  it("client throws → safe fallback", async () => {
    const out = await renderFactorExplain(validInput, { client: new ThrowingClient() });
    expect(isFallback(out)).toBe(true);
  });

  it("invalid JSON → safe fallback", async () => {
    const out = await renderFactorExplain(validInput, {
      client: new StringClient("not json"),
    });
    expect(isFallback(out)).toBe(true);
  });

  it("extra top-level field → safe fallback", async () => {
    const out = await renderFactorExplain(validInput, {
      client: new StringClient(
        JSON.stringify({
          headline: "Why this matters",
          body: "Some plain explanation here.",
          extra: "not allowed",
        }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });

  it("forbidden token in body → safe fallback", async () => {
    const out = await renderFactorExplain(validInput, {
      client: new StringClient(
        JSON.stringify({
          headline: "Why this matters",
          body: "You should start a statin to reduce your risk.",
        }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });

  it("headline over char limit → safe fallback", async () => {
    const out = await renderFactorExplain(validInput, {
      client: new StringClient(
        JSON.stringify({
          headline: "x".repeat(200),
          body: "Some plain explanation here.",
        }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });

  it("body over char limit → safe fallback", async () => {
    const out = await renderFactorExplain(validInput, {
      client: new StringClient(
        JSON.stringify({
          headline: "Why this matters",
          body: "x".repeat(400),
        }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });
});
