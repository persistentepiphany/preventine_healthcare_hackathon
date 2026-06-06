import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { LocalPreventiveContextPopulation } from "../contracts/local_preventive_context.js";

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

/**
 * Returns synthetic / cached population context. Never throws — orchestrator
 * relies on this. The live Fingertips indicator pull is out of scope for this
 * turn (see project notes); when it lands, the `status` will gain a "live"
 * variant.
 */
export async function fetchPopulationContextSafe(): Promise<PopulationResult> {
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
