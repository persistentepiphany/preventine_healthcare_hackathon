import { loadConfig, type RenderConfig } from "../config.js";
import { SYSTEM_PROMPT } from "./system_prompt.js";
import { FEW_SHOT_MESSAGES } from "./few_shot.js";

export interface ZaiClient {
  complete(userJson: string): Promise<string>;
}

export class ZaiHttpClient implements ZaiClient {
  constructor(private readonly config: RenderConfig = loadConfig()) {
    if (!config.apiKey) {
      throw new Error("ZAI_API_KEY is not set");
    }
  }

  async complete(userJson: string): Promise<string> {
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...FEW_SHOT_MESSAGES,
      { role: "user", content: userJson },
    ];

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
