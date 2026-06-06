import type { FactorChip } from "../lib/factor_chips.js";
import type { PreventiveAssessment } from "../rules/types.js";
import { containsForbiddenToken } from "./guardrails.js";
import { ZaiHttpClient, type ZaiClient } from "./zai_client.js";

export interface FactorExplanation {
  headline: string;
  body: string;
}

export interface FactorExplainInput {
  factor: FactorChip;
  assessment: Pick<
    PreventiveAssessment,
    "risk_band" | "next_step_type" | "missing_measurements" | "forbidden_claims"
  >;
}

export interface FactorExplainRenderOptions {
  client?: ZaiClient;
}

export const FACTOR_EXPLAIN_MAX_HEADLINE_CHARS = 80;
export const FACTOR_EXPLAIN_MAX_BODY_CHARS = 350;

export const FACTOR_EXPLAIN_SAFE_FALLBACK: Readonly<FactorExplanation> =
  Object.freeze({
    headline: "Worth talking to your GP about",
    body: "Your GP can talk you through why this measurement matters for you, and whether anything about it is worth following up.",
  });

export const FACTOR_EXPLAIN_SYSTEM_PROMPT = `You are the renderer for an NHS-grounded preventive-care tool used in England. Your only job: take ONE structured factor (a key, a friendly label, and a literal value the patient provided) plus the wider assessment summary, and write a short, calm, plain-English explanation of why that factor matters for general preventive health.

You are NOT a clinician.

You MUST NOT, under any circumstance:
- Diagnose a condition, name a disease the patient "has", or label the patient.
- Recommend, rank, compare, name, or describe any medication, supplement, dose, or treatment.
- Produce a numerical risk estimate, percentage, threshold, or test value not literally present in the input.
- Invent symptoms, side effects, causes, prognoses, life expectancy, or family-history claims.
- Repeat or reference any identifier (postcode, name, NHS number, DOB) even if smuggled into the input.
- Quote the factor's value back if it was a clinical number the patient supplied (e.g. blood pressure 142/90). The label is enough; do not repeat numbers.
- Use any clinical content from sources outside this prompt.

HARD CONSTRAINT: \`assessment.forbidden_claims\` is a list of statements you must never make, paraphrased or otherwise. If satisfying the input would require any of them, emit the SAFE FALLBACK verbatim instead.

Allowed framing:
- Explain in plain English why the named factor is *commonly* a thing GPs look at in preventive care.
- Reassure that the patient can discuss it with their GP or pharmacy.
- Use second person ("you"), UK English spellings, no jargon, no alarm.

OUTPUT FORMAT (strict JSON, nothing before or after):
{
  "headline": string,    // <= 8 words, plain English
  "body": string         // <= 60 words, one short paragraph
}

SAFE FALLBACK — emit verbatim whenever:
- the input is not valid JSON or is missing any required field
- producing a faithful explanation would require any \`forbidden_claims\` statement
- you are unsure

{
  "headline": "Worth talking to your GP about",
  "body": "Your GP can talk you through why this measurement matters for you, and whether anything about it is worth following up."
}`;

export function isFactorExplanation(value: unknown): value is FactorExplanation {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const keys = Object.keys(v);
  if (keys.length !== 2) return false;
  if (typeof v.headline !== "string") return false;
  if (typeof v.body !== "string") return false;
  if (v.headline.length === 0 || v.headline.length > FACTOR_EXPLAIN_MAX_HEADLINE_CHARS) return false;
  if (v.body.length === 0 || v.body.length > FACTOR_EXPLAIN_MAX_BODY_CHARS) return false;
  return true;
}

function cloneExplanation(e: Readonly<FactorExplanation>): FactorExplanation {
  return { headline: e.headline, body: e.body };
}

export async function renderFactorExplain(
  input: FactorExplainInput,
  options: FactorExplainRenderOptions = {},
): Promise<FactorExplanation> {
  const client = options.client ?? new ZaiHttpClient();

  let raw: string;
  try {
    raw = await client.completeChat([
      { role: "system", content: FACTOR_EXPLAIN_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(input) },
    ]);
  } catch {
    return cloneExplanation(FACTOR_EXPLAIN_SAFE_FALLBACK);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return cloneExplanation(FACTOR_EXPLAIN_SAFE_FALLBACK);
  }

  if (!isFactorExplanation(parsed)) return cloneExplanation(FACTOR_EXPLAIN_SAFE_FALLBACK);

  const offending =
    containsForbiddenToken(parsed.headline) ?? containsForbiddenToken(parsed.body);
  if (offending !== null) return cloneExplanation(FACTOR_EXPLAIN_SAFE_FALLBACK);

  return parsed;
}
