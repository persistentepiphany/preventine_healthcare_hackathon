import type { PreventiveAssessment } from "../rules/types.js";
import { type CardJson, isCardJson } from "./card_schema.js";
import { containsForbiddenToken, validateAssessment } from "./guardrails.js";
import { SAFE_FALLBACK_CARD } from "./safe_fallback.js";
import { ZaiHttpClient, type ZaiClient } from "./zai_client.js";

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
  }

  return parsed;
}

function cloneCard(card: Readonly<CardJson>): CardJson {
  return {
    headline: card.headline,
    body: card.body,
    next_step: card.next_step,
    services: card.services.map((s) => ({ name: s.name, type: s.type })),
  };
}
