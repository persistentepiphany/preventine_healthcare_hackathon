import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { LocalPreventiveContextService } from "../contracts/local_preventive_context.js";

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
 * For the demo we never go live — the sandbox is unusable for any postcode the
 * demo cares about. This function still returns a status of "cached" so the
 * orchestrator can surface the right badge.
 *
 * The signature is kept open (`postcode` arg, `live` option) so a follow-up
 * turn can wire a real DoHS endpoint without re-shaping the orchestrator.
 */
export async function fetchNearbyServices(
  _postcode: string,
): Promise<ServicesFetchResult> {
  try {
    const services = await loadDemoServices();
    return { services, status: "cached" };
  } catch {
    return { services: [], status: "missing" };
  }
}
