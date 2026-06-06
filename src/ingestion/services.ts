import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { LocalPreventiveContextService } from "../contracts/local_preventive_context.js";
import { normalisePostcode } from "./postcode.js";

/**
 * Nearby services adapter. The DoHS sandbox is functional but ships a tiny
 * canned demo set with zero Manchester records (see source-verification.md),
 * so the cached pack is the load-bearing source. We expose a status-reporting
 * shape so the orchestrator can populate dataQuality.services honestly.
 *
 * The earlier prototype inferred "is this live or cached?" by inspecting the
 * service rows for a `source === "NHS DoHS"` tag. That was brittle and lied
 * when the upstream returned rows without the tag. This adapter reports its
 * own status explicitly.
 */

export type ServiceFetchStatus = "live" | "cached" | "missing";

export interface ServicesFetchResult {
  services: LocalPreventiveContextService[];
  status: ServiceFetchStatus;
}

interface DemoServicesFile {
  services: LocalPreventiveContextService[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_SERVICES_PATH = join(__dirname, "..", "..", "data", "demoServices.json");

let cachedDemo: LocalPreventiveContextService[] | null = null;

async function loadDemoServices(): Promise<LocalPreventiveContextService[]> {
  if (cachedDemo !== null) return cachedDemo;
  const raw = await readFile(DEMO_SERVICES_PATH, "utf8");
  const parsed = JSON.parse(raw) as DemoServicesFile;
  cachedDemo = parsed.services.map((s) => ({
    name: s.name,
    type: s.type,
    ...(s.address !== undefined ? { address: s.address } : {}),
  }));
  return cachedDemo;
}

/**
 * The cached pack is hand-picked Manchester (M-area) practices and a single
 * Manchester hospital. Returning it for a London or Edinburgh postcode would
 * put wrong-area GPs in front of the patient. We gate on the outward code:
 *
 *  - Manchester area (outward code starts with "M" followed by a digit) →
 *    cached Manchester pack, status="cached".
 *  - Empty / undefined / unknown postcode → cached pack with status="cached".
 *    (Preserves the historical "no postcode given" behaviour the orchestrator
 *    and direct tests rely on.)
 *  - Any other area → empty list, status="missing". Honest signal: we have no
 *    service data for this area, the UI should badge it as missing rather
 *    than show wrong-area services.
 *
 * The signature stays open (postcode arg, `live` option) so a follow-up
 * turn can wire a real DoHS endpoint without re-shaping the orchestrator.
 */
function isManchesterArea(postcode: string): boolean {
  const norm = normalisePostcode(postcode);
  // Outward code = everything before the space. Manchester postcodes are
  // M1..M99 (e.g. "M13 9PL" → "M13"). "ME" is Medway, "MK" is Milton Keynes;
  // exclude those by requiring a digit right after the M.
  const outward = norm.split(" ")[0] ?? "";
  return /^M\d/.test(outward);
}

export async function fetchNearbyServices(
  postcode: string,
): Promise<ServicesFetchResult> {
  // Empty / whitespace postcode → treat as "no area filter" and serve the
  // cached pack (this is what the integration tests + HTTP route assume when
  // a caller hits the services endpoint without a real postcode).
  const trimmed = (postcode ?? "").trim();
  if (trimmed.length === 0) {
    try {
      const services = await loadDemoServices();
      return { services, status: "cached" };
    } catch {
      return { services: [], status: "missing" };
    }
  }

  if (!isManchesterArea(trimmed)) {
    return { services: [], status: "missing" };
  }

  try {
    const services = await loadDemoServices();
    return { services, status: "cached" };
  } catch {
    return { services: [], status: "missing" };
  }
}
