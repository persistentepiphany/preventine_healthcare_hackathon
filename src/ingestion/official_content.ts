import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { LocalPreventiveContextContentCard } from "../contracts/local_preventive_context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = join(
  __dirname,
  "..",
  "..",
  "data",
  "officialContentCards.json",
);

interface OfficialContentFile {
  cards: LocalPreventiveContextContentCard[];
}

export type OfficialContentStatus = "cached" | "missing";

export interface OfficialContentResult {
  cards: LocalPreventiveContextContentCard[];
  status: OfficialContentStatus;
}

/**
 * The NHS Website Content API sandbox returned 503 on every probe (see
 * source-verification.md), so the cards are shipped from the cached pack. URLs
 * are verified live against www.nhs.uk on the same date.
 */
export async function getOfficialContent(): Promise<OfficialContentResult> {
  try {
    const raw = await readFile(CONTENT_PATH, "utf8");
    const parsed = JSON.parse(raw) as OfficialContentFile;
    return { cards: parsed.cards, status: "cached" };
  } catch {
    return { cards: [], status: "missing" };
  }
}
