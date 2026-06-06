import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { LocalPreventiveContextPopulation } from "../contracts/local_preventive_context.js";
import { normalisePostcode } from "./postcode.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const POPULATION_PATH = join(
  __dirname,
  "..",
  "..",
  "data",
  "syntheticPopulation.json",
);

interface PopulationFile {
  population: { area: string; notes: string };
}

export type PopulationStatus = "synthetic" | "missing";

export interface PopulationResult {
  data: LocalPreventiveContextPopulation | null;
  status: PopulationStatus;
}

function isManchesterArea(postcode: string): boolean {
  const outward = normalisePostcode(postcode).split(" ")[0] ?? "";
  return /^M\d/.test(outward);
}

/**
 * Returns synthetic population context. Never throws — orchestrator relies on
 * this. The synthetic pack we ship is Manchester-specific, so:
 *
 *  - undefined or Manchester postcode → synthetic Manchester record.
 *  - Any other postcode → null + status="missing". Honest: we have no
 *    synthetic context for this area, the UI should badge missing rather
 *    than show wrong-area prose.
 *
 * When live Fingertips indicator data is wired, the `status` will gain a
 * "live" variant.
 */
export async function fetchPopulationContextSafe(
  postcode?: string,
): Promise<PopulationResult> {
  const trimmed = (postcode ?? "").trim();
  if (trimmed.length > 0 && !isManchesterArea(trimmed)) {
    return { data: null, status: "missing" };
  }

  try {
    const raw = await readFile(POPULATION_PATH, "utf8");
    const parsed = JSON.parse(raw) as PopulationFile;
    return {
      data: {
        isSynthetic: true,
        area: parsed.population.area,
        notes: parsed.population.notes,
      },
      // NOT "cached" — the data was never sourced from a real feed. The UI
      // should badge synthetic differently so judges aren't misled.
      status: "synthetic",
    };
  } catch {
    return { data: null, status: "missing" };
  }
}
