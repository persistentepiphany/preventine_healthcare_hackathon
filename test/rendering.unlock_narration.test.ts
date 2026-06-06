import { describe, expect, it } from "vitest";
import {
  UNLOCK_SAFE_FALLBACK,
  renderUnlockNarration,
  type NarrationJson,
  type UnlockNarrationInput,
} from "../src/rendering/unlock_narration.js";
import type { ZaiClient, ZaiMessage } from "../src/rendering/zai_client.js";

class WellBehavedClient implements ZaiClient {
  async complete(): Promise<string> {
    throw new Error("complete not used in this test");
  }
  async completeChat(_messages: ZaiMessage[]): Promise<string> {
    return JSON.stringify({
      narration:
        "Now that your blood pressure and cholesterol are in, more of the picture is clear — your GP can talk this through with you.",
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

const validInput: UnlockNarrationInput = {
  assessment: {
    risk_band: "incomplete",
    next_step_type: "gp_review",
    missing_measurements: [],
    forbidden_claims: ["your CVD risk is X%"],
  },
  resolved_measurements: ["blood pressure", "cholesterol"],
};

function isFallback(n: NarrationJson): boolean {
  return n.narration === UNLOCK_SAFE_FALLBACK.narration;
}

describe("unlock-narration renderer", () => {
  it("well-behaved → returns a narration string", async () => {
    const out = await renderUnlockNarration(validInput, { client: new WellBehavedClient() });
    expect(out.narration.length).toBeGreaterThan(0);
    expect(isFallback(out)).toBe(false);
  });

  it("client throws → safe fallback", async () => {
    const out = await renderUnlockNarration(validInput, { client: new ThrowingClient() });
    expect(isFallback(out)).toBe(true);
  });

  it("invalid JSON → safe fallback", async () => {
    const out = await renderUnlockNarration(validInput, { client: new StringClient("???") });
    expect(isFallback(out)).toBe(true);
  });

  it("forbidden token (percentage) → safe fallback", async () => {
    const out = await renderUnlockNarration(validInput, {
      client: new StringClient(
        JSON.stringify({
          narration: "Your CVD risk is now 12%, so things are clearer.",
        }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });

  it("forbidden token (drug name) → safe fallback", async () => {
    const out = await renderUnlockNarration(validInput, {
      client: new StringClient(
        JSON.stringify({
          narration: "More of the picture is in — your GP may suggest a statin.",
        }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });

  it("extra top-level field → safe fallback", async () => {
    const out = await renderUnlockNarration(validInput, {
      client: new StringClient(
        JSON.stringify({
          narration: "More of the picture is in.",
          extra: "nope",
        }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });

  it("narration too long → safe fallback", async () => {
    const out = await renderUnlockNarration(validInput, {
      client: new StringClient(
        JSON.stringify({
          narration: "More of the picture is in. ".repeat(20),
        }),
      ),
    });
    expect(isFallback(out)).toBe(true);
  });
});
