import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { LocalPreventiveContextWaitingTimes } from "../contracts/local_preventive_context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WAITING_TIMES_PATH = join(
  __dirname,
  "..",
  "..",
  "data",
  "demoWaitingTimes.json",
);

interface WaitingTimesFile {
  description: string;
  disclaimer: string;
}

export type WaitingTimesStatus = "cached" | "missing";

export interface WaitingTimesResult {
  data: LocalPreventiveContextWaitingTimes | null;
  status: WaitingTimesStatus;
}

/**
 * Reads the cached area-level waiting-time context. Always pins
 * isPersonalPrediction=false and attaches a disclaimer — the renderer can then
 * never accidentally personalise it.
 */
export async function getWaitingTimeContext(): Promise<WaitingTimesResult> {
  try {
    const raw = await readFile(WAITING_TIMES_PATH, "utf8");
    const parsed = JSON.parse(raw) as WaitingTimesFile;
    return {
      data: {
        description: parsed.description,
        isPersonalPrediction: false,
        disclaimer: parsed.disclaimer,
      },
      status: "cached",
    };
  } catch {
    return { data: null, status: "missing" };
  }
}
