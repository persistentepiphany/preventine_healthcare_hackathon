import type { PreventiveAssessment } from "../rules/types.js";
import { type CardJson, isCardJson } from "./card_schema.js";
import { containsForbiddenToken, validateAssessment } from "./guardrails.js";
import { SAFE_FALLBACK_CARD } from "./safe_fallback.js";
import { SYSTEM_PROMPT } from "./system_prompt.js";
import { FEW_SHOT_MESSAGES } from "./few_shot.js";
import { ZaiHttpClient, type ZaiClient, type ZaiMessage } from "./zai_client.js";

export interface RenderOptions {
  client?: ZaiClient;
}

export async function renderAssessment(
  input: unknown,
  options: RenderOptions = {},
): Promise<CardJson> {
  const validated = validateAssessment(input);
  if (!validated.ok) return cloneCard(SAFE_FALLBACK_CARD);

  const assessment: PreventiveAssessment = validated.value;

  if (assessment.next_step_type === "urgent_care") {
    if (assessment.local_services && assessment.local_services.length > 0) {
      assessment.local_services = [];
    }
  }

  const client = options.client ?? new ZaiHttpClient();

  let raw: string;
  try {
    raw = await client.complete(JSON.stringify(assessment));
  } catch {
    return cloneCard(SAFE_FALLBACK_CARD);
  }

  return applyCardGuardChain(raw, assessment);
}

/**
 * Render a CardJson from a custom system prompt (with optional few-shot). Used
 * by tone.ts to re-render the gp-summary card at a different register without
 * duplicating the post-LLM guard chain.
 *
 * The guard chain is identical to renderAssessment's: schema validation,
 * forbidden-token sweep, urgent-services strip, urgent-text leak guard.
 */
export async function renderCardFromMessages(
  assessment: PreventiveAssessment,
  systemPrompt: string,
  fewShot: ZaiMessage[],
  options: RenderOptions = {},
): Promise<CardJson> {
  // Caller is responsible for passing a validated assessment, but mirror the
  // urgent-services strip for safety.
  if (assessment.next_step_type === "urgent_care") {
    if (assessment.local_services && assessment.local_services.length > 0) {
      assessment.local_services = [];
    }
  }

  const client = options.client ?? new ZaiHttpClient();

  let raw: string;
  try {
    raw = await client.completeChat([
      { role: "system", content: systemPrompt },
      ...fewShot,
      { role: "user", content: JSON.stringify(assessment) },
    ]);
  } catch {
    return cloneCard(SAFE_FALLBACK_CARD);
  }

  return applyCardGuardChain(raw, assessment);
}

/** Re-exported so tone.ts can compose the default prompt + a tone clause. */
export const DEFAULT_SYSTEM_PROMPT = SYSTEM_PROMPT;
export const DEFAULT_FEW_SHOT: readonly ZaiMessage[] = FEW_SHOT_MESSAGES;

/**
 * Post-LLM guard chain: parse, schema-validate, forbidden-token sweep,
 * urgent-only post-checks. Returns a safe fallback on any failure.
 */
function applyCardGuardChain(raw: string, assessment: PreventiveAssessment): CardJson {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return cloneCard(SAFE_FALLBACK_CARD);
  }

  if (!isCardJson(parsed)) return cloneCard(SAFE_FALLBACK_CARD);

  const offending =
    containsForbiddenToken(parsed.headline) ??
    containsForbiddenToken(parsed.body) ??
    containsForbiddenToken(parsed.next_step);
  if (offending !== null) return cloneCard(SAFE_FALLBACK_CARD);

  if (assessment.next_step_type === "urgent_care") {
    if (parsed.services.length > 0) {
      return cloneCard(SAFE_FALLBACK_CARD);
    }
    if (urgentTextLeaks(parsed)) {
      return cloneCard(SAFE_FALLBACK_CARD);
    }
  }

  return parsed;
}

/**
 * Urgent-only text guard. Sweeps the rendered card for preventive / Health
 * Check / pharmacy framing that the urgent_care branch must never carry. This
 * is the post-LLM mirror of the engine's removed urgent-only forbidden_claims
 * — kept in render.ts (scoped to urgent context) rather than in
 * FORBIDDEN_OUTPUT_TOKENS (global, broad) because adding "preventive" / "health
 * check" / "pharmacy" to the global list would break legitimate framing on
 * the pharmacy_bp_check and ask_gp_or_pharmacy branches.
 *
 * Mirrors the system_prompt rule: "Urgent care: ... No preventive advice. No
 * Health Check. No pharmacy. services is []."
 */
const URGENT_TEXT_LEAK_TOKENS = ["health check", "preventive", "pharmacy"] as const;

function urgentTextLeaks(card: CardJson): boolean {
  const text = `${card.headline}\n${card.body}\n${card.next_step}`.toLowerCase();
  for (const t of URGENT_TEXT_LEAK_TOKENS) {
    if (text.includes(t)) return true;
  }
  return false;
}

function cloneCard(card: Readonly<CardJson>): CardJson {
  return {
    headline: card.headline,
    body: card.body,
    next_step: card.next_step,
    services: card.services.map((s) => ({ name: s.name, type: s.type })),
  };
}
