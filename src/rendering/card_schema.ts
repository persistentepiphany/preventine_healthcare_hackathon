import type { LocalService } from "../rules/types.js";

export interface CardJson {
  headline: string;
  body: string;
  next_step: string;
  services: LocalService[];
}

export const CARD_KEYS: readonly (keyof CardJson)[] = [
  "headline",
  "body",
  "next_step",
  "services",
] as const;

export const CARD_MAX_HEADLINE_CHARS = 80;
export const CARD_MAX_BODY_CHARS = 350;
export const CARD_MAX_NEXT_STEP_CHARS = 180;

export function isCardJson(value: unknown): value is CardJson {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  const keys = Object.keys(v);
  if (keys.length !== CARD_KEYS.length) return false;
  for (const k of CARD_KEYS) if (!keys.includes(k)) return false;

  if (typeof v.headline !== "string") return false;
  if (typeof v.body !== "string") return false;
  if (typeof v.next_step !== "string") return false;
  if (!Array.isArray(v.services)) return false;

  if (v.headline.length > CARD_MAX_HEADLINE_CHARS) return false;
  if (v.body.length > CARD_MAX_BODY_CHARS) return false;
  if (v.next_step.length > CARD_MAX_NEXT_STEP_CHARS) return false;

  for (const s of v.services as unknown[]) {
    if (typeof s !== "object" || s === null) return false;
    const svc = s as Record<string, unknown>;
    if (typeof svc.name !== "string" || typeof svc.type !== "string") return false;
    if (Object.keys(svc).length !== 2) return false;
  }

  return true;
}
