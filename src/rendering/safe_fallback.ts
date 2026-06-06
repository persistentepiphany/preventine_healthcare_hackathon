import type { CardJson } from "./card_schema.js";

/**
 * Verbatim safe-fallback card. Emitted by guardrails (before the LLM call) when
 * the input is malformed or carries clinical content outside the schema, and
 * by render() (after the LLM call) when the model output fails validation or
 * trips a forbidden token.
 *
 * Exported so the rules engine can short-circuit known-incomplete cases without
 * paying the LLM round-trip.
 */
export const SAFE_FALLBACK_CARD: Readonly<CardJson> = Object.freeze({
  headline: "We can't show a personalised result right now",
  body: "We couldn't produce a tailored summary from your information. Your GP or local pharmacy can talk you through what's most useful next, including any free NHS checks you may be eligible for.",
  next_step: "Speak to your GP or a local pharmacy.",
  services: [],
});
