import type { PreventiveAssessment } from "../rules/types.js";
import type { CardJson } from "./card_schema.js";
import {
  DEFAULT_FEW_SHOT,
  DEFAULT_SYSTEM_PROMPT,
  renderCardFromMessages,
  type RenderOptions,
} from "./render.js";
import type { ZaiMessage } from "./zai_client.js";

/**
 * Tone toggle for the GP-summary card. We do NOT swap out the system prompt —
 * we append a short register clause so all the existing safety rules remain
 * literally in force. The post-LLM guard chain in render.ts is reused
 * verbatim via renderCardFromMessages.
 *
 * - "simple"   → reading-age-12 register, plainer words, shorter sentences.
 * - "detailed" → one extra sentence per field where it adds value, no extra
 *                claims or numbers.
 * - undefined  → caller should use the default renderAssessment path; this
 *                module does not provide a no-op.
 */
export type Tone = "simple" | "detailed";

export const SIMPLE_TONE_INSTRUCTION = `

TONE OVERRIDE (simple): Aim for a reading age of around 12. Use the shortest plain words. Cap sentences at about 12 words each. Do not change which NHS framing rule applies; do not add or drop information; do not introduce any new claim. The character limits and JSON output format above still apply.`;

export const DETAILED_TONE_INSTRUCTION = `

TONE OVERRIDE (detailed): Where it adds value, add one extra plain-English sentence of context to the body, without exceeding the body character limit. Do not introduce any new claim, number, condition name, or treatment. The JSON output format and all other constraints above still apply.`;

function toneInstruction(tone: Tone): string {
  return tone === "simple" ? SIMPLE_TONE_INSTRUCTION : DETAILED_TONE_INSTRUCTION;
}

export async function renderAssessmentWithTone(
  assessment: PreventiveAssessment,
  tone: Tone,
  options: RenderOptions = {},
): Promise<CardJson> {
  const systemPrompt = DEFAULT_SYSTEM_PROMPT + toneInstruction(tone);
  const fewShot: ZaiMessage[] = DEFAULT_FEW_SHOT.slice();
  return renderCardFromMessages(assessment, systemPrompt, fewShot, options);
}

export function isTone(value: unknown): value is Tone {
  return value === "simple" || value === "detailed";
}
