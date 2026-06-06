import { loadConfig, type RenderConfig } from "../config.js";
import { SYSTEM_PROMPT } from "./system_prompt.js";
import { FEW_SHOT_MESSAGES } from "./few_shot.js";

export interface ZaiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ZaiClient {
  /**
   * GP-summary path. Hard-coded to SYSTEM_PROMPT + FEW_SHOT_MESSAGES — preserved
   * so existing callers and existing test stubs do not break.
   */
  complete(userJson: string): Promise<string>;

  /**
   * Generic chat path used by the additional surfaces (factor-explain,
   * questions-to-ask, tone toggle, unlock-narration). Each caller supplies its
   * own system prompt and optional few-shot examples — the post-LLM safety net
   * lives in each renderer.
   */
  completeChat(messages: ZaiMessage[]): Promise<string>;
}

export class ZaiHttpClient implements ZaiClient {
  constructor(private readonly config: RenderConfig = loadConfig()) {
    if (!config.apiKey) {
      throw new Error("ZAI_API_KEY is not set");
    }
  }

  async complete(userJson: string): Promise<string> {
    return this.completeChat([
      { role: "system", content: SYSTEM_PROMPT },
      ...FEW_SHOT_MESSAGES,
      { role: "user", content: userJson },
    ]);
  }

  async completeChat(messages: ZaiMessage[]): Promise<string> {
    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`z.ai HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("z.ai response missing choices[0].message.content");
    }
    return content;
  }
}
