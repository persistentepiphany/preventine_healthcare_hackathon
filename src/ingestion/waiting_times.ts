import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { LocalPreventiveContextWaitingTimes } from "../contracts/local_preventive_context.js";
import { normalisePostcode } from "./postcode.js";

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

export type WaitingTimesStatus = "cached" | "missing" | "live-aggregate";

export interface WaitingTimesResult {
  data: LocalPreventiveContextWaitingTimes | null;
  status: WaitingTimesStatus;
}

const RTT_DATA_PATH = join(__dirname, "..", "..", "data", "rttByIcb.json");

interface RttFile {
  _meta: { publishDate: string; disclaimer: string };
  icbs: Record<string, { name: string; percentWithin18Weeks: number }>;
}

let cachedRtt: RttFile | null = null;
async function loadRtt(): Promise<RttFile | null> {
  if (cachedRtt) return cachedRtt;
  try {
    const raw = await readFile(RTT_DATA_PATH, "utf8");
    cachedRtt = JSON.parse(raw) as RttFile;
    return cachedRtt;
  } catch {
    return null;
  }
}

/**
 * Per-ICB waiting-time signal sourced from the latest NHS England RTT release
 * (data/rttByIcb.json). Returns "live-aggregate" because the underlying data
 * is real but is a monthly statistical aggregate, not a real-time per-patient
 * estimate. isPersonalPrediction is hard-pinned to false.
 *
 * On miss (unknown ICB code, file unreadable) → falls back to the generic
 * prose path. Pass the original postcode so the fallback picks generic over
 * Manchester for non-M postcodes.
 */
export async function getWaitingTimeContextForIcb(
  icbCode: string,
  icbName: string | null,
  postcode?: string,
): Promise<WaitingTimesResult> {
  const rtt = await loadRtt();
  const entry = rtt?.icbs[icbCode];
  if (!rtt || !entry) {
    return getWaitingTimeContext(postcode);
  }

  const name = icbName ?? entry.name;
  const pct = entry.percentWithin18Weeks.toFixed(1);
  const publishDate = rtt._meta.publishDate;
  return {
    data: {
      description:
        `In your area (${name}), ${pct}% of patients waiting for elective ` +
        `consultant-led treatment are seen within 18 weeks ` +
        `(NHS England, ${publishDate}). Routine GP appointment timing varies by practice.`,
      isPersonalPrediction: false,
      disclaimer: rtt._meta.disclaimer,
    },
    status: "live-aggregate",
  };
}

/**
 * Generic NHS-wide prose used when we have no area-specific signal for the
 * given postcode. We are NOT genuinely estimating waits — we never have been —
 * but the previous code was actively lying for non-Manchester postcodes by
 * serving Greater-Manchester prose. This generic version sidesteps the
 * area-claim entirely.
 */
const GENERIC_WAITING_TIMES: LocalPreventiveContextWaitingTimes = {
  description:
    "Routine GP appointment availability varies by practice and time of year. " +
    "Same-day urgent slots are usually available at your registered GP, and " +
    "free walk-in blood-pressure checks are offered at many community " +
    "pharmacies in England.",
  isPersonalPrediction: false,
  disclaimer:
    "This is a general NHS-wide signal, not a personal prediction. Your own " +
    "wait will depend on your GP practice and your reason for booking.",
};

function isManchesterArea(postcode: string): boolean {
  const outward = normalisePostcode(postcode).split(" ")[0] ?? "";
  return /^M\d/.test(outward);
}

/**
 * Returns area-level waiting-time prose. Always pins isPersonalPrediction=false
 * so the renderer can never accidentally personalise it.
 *
 *  - undefined or Manchester postcode → the Greater Manchester cached prose
 *    (preserves the canonical demo behaviour).
 *  - Any other postcode → generic NHS-wide prose. Still status="cached"
 *    because the cache is what's serving it, but the area claim is dropped.
 */
export async function getWaitingTimeContext(
  postcode?: string,
): Promise<WaitingTimesResult> {
  const trimmed = (postcode ?? "").trim();
  if (trimmed.length > 0 && !isManchesterArea(trimmed)) {
    return { data: GENERIC_WAITING_TIMES, status: "cached" };
  }

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
