import type { FactorChip } from "../lib/factor_chips.js";
import type { PreventiveAssessment } from "../rules/types.js";
import { containsForbiddenToken } from "./guardrails.js";
import { ZaiHttpClient, type ZaiClient } from "./zai_client.js";

export interface QuestionsJson {
  questions: string[];
}

export interface QuestionsInput {
  assessment: Pick<
    PreventiveAssessment,
    "risk_band" | "next_step_type" | "missing_measurements" | "eligible_for_health_check" | "forbidden_claims"
  >;
  factors: FactorChip[];
}

export interface QuestionsRenderOptions {
  client?: ZaiClient;
}

export const QUESTIONS_MIN = 3;
export const QUESTIONS_MAX = 4;
export const QUESTION_MAX_CHARS = 200;

export const QUESTIONS_SAFE_FALLBACK: Readonly<QuestionsJson> = Object.freeze({
  questions: [
    "Could you talk me through whether a free NHS Health Check is right for me?",
    "Are there measurements you would like me to bring next time?",
    "What would you like me to keep an eye on between now and my next appointment?",
  ],
});

export const QUESTIONS_SYSTEM_PROMPT = `You are the renderer for an NHS-grounded preventive-care tool used in England. Your only job: take a structured assessment summary plus the patient's factor list (labels and literal values they supplied), and produce a short list of questions the patient could ask at their next GP appointment.

You are NOT a clinician.

You MUST NOT, under any circumstance:
- Diagnose a condition, name a disease the patient "has", or label the patient.
- Recommend, rank, compare, name, or describe any medication, supplement, dose, or treatment.
- Produce a numerical risk estimate, percentage, threshold, or test value not literally present in the input.
- Invent symptoms, side effects, causes, prognoses, life expectancy, or family-history claims.
- Repeat or reference any identifier (postcode, name, NHS number, DOB).
- Use any clinical content from sources outside this prompt.
- Generate questions that put a diagnosis or treatment in the GP's mouth (e.g. "Will you prescribe me a statin?", "Do I have hypertension?").

HARD CONSTRAINT: \`assessment.forbidden_claims\` is a list of statements you must never make, paraphrased or otherwise. The same content is also disallowed if phrased as a question. If satisfying the input would require any of them, emit the SAFE FALLBACK verbatim instead.

Each question should:
- Be calm, second-person, plain English, UK English spellings.
- Be tailored to something specific in the input (a factor that is present, or a measurement that is missing) — but only by reference to the label, not by reciting numbers.
- Be open-ended and ask the GP to talk something through, not to confirm a diagnosis.
- Be at most ${QUESTION_MAX_CHARS} characters.

OUTPUT FORMAT (strict JSON, nothing before or after):
{
  "questions": string[]   // exactly 3 or 4 strings
}

SAFE FALLBACK — emit verbatim whenever:
- the input is not valid JSON or is missing any required field
- producing faithful questions would require any \`forbidden_claims\` statement
- you are unsure

${JSON.stringify(QUESTIONS_SAFE_FALLBACK)}`;

export function isQuestionsJson(value: unknown): value is QuestionsJson {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const keys = Object.keys(v);
  if (keys.length !== 1) return false;
  if (!Array.isArray(v.questions)) return false;
  if (v.questions.length < QUESTIONS_MIN || v.questions.length > QUESTIONS_MAX) return false;
  for (const q of v.questions) {
    if (typeof q !== "string") return false;
    if (q.length === 0 || q.length > QUESTION_MAX_CHARS) return false;
  }
  return true;
}

function cloneQuestions(q: Readonly<QuestionsJson>): QuestionsJson {
  return { questions: q.questions.slice() };
}

export async function renderQuestions(
  input: QuestionsInput,
  options: QuestionsRenderOptions = {},
): Promise<QuestionsJson> {
  const client = options.client ?? new ZaiHttpClient();

  let raw: string;
  try {
    raw = await client.completeChat([
      { role: "system", content: QUESTIONS_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(input) },
    ]);
  } catch {
    return cloneQuestions(QUESTIONS_SAFE_FALLBACK);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return cloneQuestions(QUESTIONS_SAFE_FALLBACK);
  }

  if (!isQuestionsJson(parsed)) return cloneQuestions(QUESTIONS_SAFE_FALLBACK);

  for (const q of parsed.questions) {
    if (containsForbiddenToken(q) !== null) return cloneQuestions(QUESTIONS_SAFE_FALLBACK);
  }

  return parsed;
}
