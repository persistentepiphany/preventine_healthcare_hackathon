import type { PreventiveAssessment } from "../rules/types.js";
import { containsForbiddenToken } from "./guardrails.js";
import { ZaiHttpClient, type ZaiClient } from "./zai_client.js";

export interface NarrationJson {
  narration: string;
}

export interface UnlockNarrationInput {
  assessment: Pick<
    PreventiveAssessment,
    "risk_band" | "next_step_type" | "missing_measurements" | "forbidden_claims"
  >;
  /** Measurements that the patient just supplied (engine confirms they are no longer missing). */
  resolved_measurements: string[];
}

export interface UnlockNarrationRenderOptions {
  client?: ZaiClient;
}

export const NARRATION_MAX_CHARS = 250;

export const UNLOCK_SAFE_FALLBACK: Readonly<NarrationJson> = Object.freeze({
  narration:
    "More of the picture is in. Bring this to your GP so you can talk through what it means together.",
});

export const UNLOCK_SYSTEM_PROMPT = `You are the renderer for an NHS-grounded preventive-care tool used in England. Your only job: take a structured assessment summary plus a list of measurements the patient has just filled in (\`resolved_measurements\`), and write ONE calm plain-English sentence about what the picture now shows. You are NOT a clinician.

You MUST NOT, under any circumstance:
- State, estimate, or imply any number, percentage, threshold, score, or risk value.
- Diagnose a condition, name a disease the patient "has", or label the patient.
- Recommend, rank, compare, name, or describe any medication, supplement, dose, or treatment.
- Invent symptoms, side effects, causes, prognoses, life expectancy, or family-history claims.
- Repeat or reference any identifier (postcode, name, NHS number, DOB).
- Use any clinical content from sources outside this prompt.

You ONLY narrate, in one sentence, that the named measurements are now in and what that does to the *picture* — not to any clinical number. The actual risk value (if any) is the engine's job, not yours.

HARD CONSTRAINT: \`assessment.forbidden_claims\` is a list of statements you must never make, paraphrased or otherwise. If satisfying the input would require any of them, emit the SAFE FALLBACK verbatim instead.

Tone: calm, second-person ("you"), plain English, UK English spellings, no alarm, no medical jargon.

OUTPUT FORMAT (strict JSON, nothing before or after):
{
  "narration": string    // one sentence, <= 30 words, <= ${NARRATION_MAX_CHARS} chars
}

SAFE FALLBACK — emit verbatim whenever:
- the input is not valid JSON or is missing any required field
- producing a faithful narration would require any \`forbidden_claims\` statement
- you are unsure

${JSON.stringify(UNLOCK_SAFE_FALLBACK)}`;

export function isNarrationJson(value: unknown): value is NarrationJson {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const keys = Object.keys(v);
  if (keys.length !== 1) return false;
  if (typeof v.narration !== "string") return false;
  if (v.narration.length === 0 || v.narration.length > NARRATION_MAX_CHARS) return false;
  return true;
}

function cloneNarration(n: Readonly<NarrationJson>): NarrationJson {
  return { narration: n.narration };
}

export async function renderUnlockNarration(
  input: UnlockNarrationInput,
  options: UnlockNarrationRenderOptions = {},
): Promise<NarrationJson> {
  const client = options.client ?? new ZaiHttpClient();

  let raw: string;
  try {
    raw = await client.completeChat([
      { role: "system", content: UNLOCK_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(input) },
    ]);
  } catch {
    return cloneNarration(UNLOCK_SAFE_FALLBACK);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return cloneNarration(UNLOCK_SAFE_FALLBACK);
  }

  if (!isNarrationJson(parsed)) return cloneNarration(UNLOCK_SAFE_FALLBACK);

  if (containsForbiddenToken(parsed.narration) !== null) {
    return cloneNarration(UNLOCK_SAFE_FALLBACK);
  }

  return parsed;
}
