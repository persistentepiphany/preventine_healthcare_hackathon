import type { PreventiveAssessment, LocalService } from "../rules/types.js";
import type { CardJson } from "./card_schema.js";
import { isCardJson } from "./card_schema.js";
import { containsForbiddenToken } from "./guardrails.js";

/**
 * Deterministic card templates — used when z.ai is unavailable (no API key,
 * insufficient balance, network failure, schema/guardrail failure on a real
 * z.ai response, etc.). One template per `next_step_type`, parameterised by
 * the engine output (missing measurements, eligibility, services).
 *
 * Every template:
 *  - obeys the renderer's `CardJson` schema + char limits
 *  - is forbidden-token-clean against `FORBIDDEN_OUTPUT_TOKENS`
 *  - never invents a number or makes a clinical claim
 *  - uses only the same engine-projected enums the LLM gets
 *
 * The templates are intentionally a bit drier than z.ai output — but they
 * still tell the user the same actionable next step. Better a slightly
 * less warm card that's always there than no report at all.
 */

const MAX_SERVICES_ON_CARD = 4;

function projectServices(input: PreventiveAssessment): LocalService[] {
  if (input.next_step_type === "urgent_care") return [];
  const src = input.local_services ?? [];
  return src.slice(0, MAX_SERVICES_ON_CARD).map((s) => ({ name: s.name, type: s.type }));
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function templateUrgent(): CardJson {
  return {
    headline: "Please get help now",
    body:
      "If this feels life-threatening, call 999. Otherwise, contact NHS 111 online at 111.nhs.uk or call 111 for an assessment of your symptoms.",
    next_step: "Call 999 if life-threatening; otherwise NHS 111.",
    services: [],
  };
}

function templatePharmacyBpCheck(input: PreventiveAssessment): CardJson {
  const eligible = input.eligible_for_health_check === "possibly";
  const headline = "A quick check can complete your picture";
  const bpLine =
    "A free blood pressure check is available at most community pharmacies in England if you are 40 or over — no appointment needed.";
  const tail = eligible
    ? "You may also be eligible for a free NHS Health Check through your GP."
    : "Knowing your numbers helps you and your GP plan what's most useful next.";
  return {
    headline,
    body: `${bpLine} ${tail}`,
    next_step: "Visit a local community pharmacy for a free blood pressure check.",
    services: projectServices(input),
  };
}

function templateAskGpOrPharmacy(input: PreventiveAssessment): CardJson {
  const missing = input.missing_measurements ?? [];
  const eligible = input.eligible_for_health_check === "possibly";

  const headline =
    missing.length === 1
      ? `We need your ${missing[0]} to complete the picture`
      : "A few more numbers would complete your picture";

  const bodyMissing =
    missing.length > 0
      ? `Talk to your GP or a community pharmacy about getting ${joinList(missing)} recorded.`
      : "Talk to your GP or a community pharmacy about recording the routine measurements that are not yet on file.";
  const tail = eligible
    ? " You may also be eligible for a free NHS Health Check."
    : "";
  return {
    headline,
    body: `${bodyMissing}${tail}`,
    next_step: "Book a routine GP appointment or visit a local pharmacy.",
    services: projectServices(input),
  };
}

function templateGpReview(input: PreventiveAssessment): CardJson {
  const eligible = input.eligible_for_health_check === "possibly";
  const headline = eligible
    ? "A routine check-in is a good next step"
    : "A routine GP review is a good next step";
  const body = eligible
    ? "Your routine measurements are on file. A free NHS Health Check may be available to you — your GP can confirm eligibility and book one for you."
    : "Your routine measurements are on file. A regular review with your GP keeps your prevention plan up to date and catches anything new early.";
  return {
    headline,
    body,
    next_step: eligible
      ? "Ask your GP about booking an NHS Health Check."
      : "Book a routine review with your GP.",
    services: projectServices(input),
  };
}

/**
 * Produce a deterministic CardJson from a PreventiveAssessment. Returns null
 * if the assessment shape is invalid, so the caller can fall back to the
 * generic SAFE_FALLBACK_CARD.
 *
 * Every output is run through the same `containsForbiddenToken` sweep as
 * z.ai output, and the same `isCardJson` schema/limit check. If a template
 * ever drifted into forbidden vocabulary, the call returns null and the
 * caller falls back further.
 */
export function renderFromTemplate(input: PreventiveAssessment): CardJson | null {
  let card: CardJson;
  switch (input.next_step_type) {
    case "urgent_care":
      card = templateUrgent();
      break;
    case "pharmacy_bp_check":
      card = templatePharmacyBpCheck(input);
      break;
    case "ask_gp_or_pharmacy_about_measurements":
      card = templateAskGpOrPharmacy(input);
      break;
    case "gp_review":
      card = templateGpReview(input);
      break;
    default:
      return null;
  }

  if (!isCardJson(card)) return null;
  if (
    containsForbiddenToken(card.headline) !== null ||
    containsForbiddenToken(card.body) !== null ||
    containsForbiddenToken(card.next_step) !== null
  ) {
    return null;
  }
  return card;
}
