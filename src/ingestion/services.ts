import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type {
  LocalPreventiveContextLocation,
  LocalPreventiveContextService,
} from "../contracts/local_preventive_context.js";
import { normalisePostcode } from "./postcode.js";
import { memoize } from "../lib/memo.js";

/**
 * Nearby services adapter. Three paths:
 *
 *  - fetchNearbyServices()       — cached pack. Used by demo mode.
 *  - fetchNearbyServicesViaODS() — Organisation Data Service (Spine Directory),
 *                                  fully open, no API key. Used by light mode.
 *                                  Returns real NHS GP/pharmacy/NHS-trust-site
 *                                  data nationwide, keyed by outward postcode.
 *  - fetchNearbyServicesLive()   — NHS Service Search (production Apigee) when
 *                                  NHS_API_KEY is set; otherwise cached-fallback.
 *                                  Used by full mode.
 */

export type ServiceFetchStatus = "live" | "cached" | "missing" | "cached-fallback";

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

/* -------------------------------------------------------------------------- */
/* LIVE: Organisation Data Service (open, no key)                             */
/* -------------------------------------------------------------------------- */

/**
 * Spine Directory ODS endpoint. Fully open — no API key, no onboarding. Used
 * by mode=light. Returns real NHS organisation data for any UK postcode.
 *
 * Trade-offs vs Service Search:
 *  - ODS is an organisation registry, not a service finder. It has names,
 *    postcodes, and (via the detail endpoint) addresses + phones for every
 *    GP practice, pharmacy, and NHS trust site in England.
 *  - It does NOT carry opening hours, distance/geo-distance ranking, or
 *    real-time availability — for those you need Service Search (full mode).
 *  - Lookup is by outward postcode (e.g. "M13"), not coordinates. We use the
 *    outward code as the geographic key.
 *
 * Role IDs we map:
 *   RO177 = Prescribing Cost Centre  → "gp"
 *   RO182 = Pharmacy                 → "pharmacy"
 *   RO198 = NHS Trust Site           → "hospital" (covers hospitals + UTCs)
 */
const ODS_BASE = "https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations";
const ODS_TIMEOUT_MS = 4000;
const ODS_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const ODS_LIMIT_PER_ROLE = 8;

interface OdsOrgRow {
  Name?: string;
  OrgId?: string;
  Status?: string;
  PostCode?: string;
  PrimaryRoleId?: string;
  PrimaryRoleDescription?: string;
}
interface OdsResponse {
  Organisations?: OdsOrgRow[];
}

const ODS_ROLE_MAP: { id: string; type: string }[] = [
  { id: "RO177", type: "gp" },
  { id: "RO182", type: "pharmacy" },
  { id: "RO198", type: "hospital" },
];

function outwardOf(postcode: string): string {
  return normalisePostcode(postcode).split(" ")[0] ?? "";
}

function titleCase(s: string): string {
  // ODS returns names in ALL CAPS. Patient-facing UI should not shout —
  // convert to title case but keep common acronyms (NHS, GP, AE, MRI, UK)
  // and handle ampersand-joined initialisms ("W&B" should stay "W&B", not
  // become "W&b").
  return s
    .toLowerCase()
    .split(/(\s+|-|\/)/)
    .map((part) => {
      if (/^\s+$|^-|^\/$/.test(part)) return part;
      const upper = part.toUpperCase();
      if (["NHS", "GP", "AE", "MRI", "UK", "UTC", "A&E", "PCN"].includes(upper)) {
        return upper;
      }
      // Capitalise letters on either side of an ampersand (e.g. "w&b" → "W&B").
      return part
        .split("&")
        .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
        .join("&");
    })
    .join("");
}

async function fetchOdsByRole(
  outward: string,
  roleId: string,
): Promise<OdsOrgRow[] | null> {
  const url =
    `${ODS_BASE}?PostCode=${encodeURIComponent(outward)}` +
    `&PrimaryRoleId=${roleId}&Status=Active&Limit=${ODS_LIMIT_PER_ROLE}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ODS_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as OdsResponse;
    return body.Organisations ?? [];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch GP / pharmacy / hospital rows for the postcode's outward code from
 * the open ODS endpoint. Three parallel calls (one per role), de-duped by
 * OrgId. Memoized 24h per outward code.
 *
 * Falls back to the cached pack with status="cached-fallback" if ODS is
 * unavailable or returns zero rows across all roles.
 */
export async function fetchNearbyServicesViaODS(
  postcode: string,
): Promise<ServicesFetchResult> {
  const outward = outwardOf(postcode);
  if (outward.length === 0) {
    return { services: [], status: "missing" };
  }

  return memoize<ServicesFetchResult>(
    "ods-services",
    outward,
    ODS_TTL_MS,
    async () => {
      const results = await Promise.all(
        ODS_ROLE_MAP.map(async (r) => ({
          type: r.type,
          rows: await fetchOdsByRole(outward, r.id),
        })),
      );

      const services: LocalPreventiveContextService[] = [];
      const seen = new Set<string>();
      let upstreamFailed = false;
      for (const r of results) {
        if (r.rows === null) {
          upstreamFailed = true;
          continue;
        }
        for (const org of r.rows) {
          const name = org.Name;
          const id = org.OrgId;
          if (!name || !id || seen.has(id)) continue;
          seen.add(id);
          services.push({
            name: titleCase(name),
            type: r.type,
            ...(org.PostCode ? { address: org.PostCode } : {}),
          });
        }
      }

      if (services.length === 0) {
        if (upstreamFailed) {
          // ODS itself failed — keep cached pack but badge fallback.
          const fb = await fetchNearbyServices(postcode);
          return { services: fb.services, status: "cached-fallback" };
        }
        // ODS reachable but zero services in this outward code — honest
        // "missing" rather than wrong-area cached pack.
        return { services: [], status: "missing" };
      }

      return { services, status: "live" };
    },
  );
}

/* -------------------------------------------------------------------------- */
/* LIVE: NHS Service Search (production)                                      */
/* -------------------------------------------------------------------------- */

/**
 * NHS Service Search production endpoint. Requires an Apigee API key from
 * digital.nhs.uk/developer (free, application-restricted tier).
 *
 *  - No NHS_API_KEY in env → returns the cached pack with status
 *    "cached-fallback" (and warns once per process).
 *  - With key + lat/lng available → 5km geo.distance query. We map the
 *    upstream SearchType enum to our flat {gp, pharmacy, hospital,
 *    urgent_treatment, other} taxonomy and forward up to 10 results.
 *  - With key but lat/lng missing → falls back to cached for the area.
 *  - Upstream failure / timeout / non-200 → cached-fallback.
 *
 * Memoized 1h per `lat,lng` rounded to 3dp (~110m granularity).
 */
const NHS_SEARCH_BASE = "https://api.service.nhs.uk/service-search-api";
const NHS_SEARCH_TIMEOUT_MS = 4500;
const NHS_SEARCH_TTL_MS = 60 * 60 * 1000; // 1h
const NHS_SEARCH_RADIUS_KM = 5;
const NHS_SEARCH_TOP = 10;

interface NhsSearchValue {
  OrganisationName?: string;
  OrganisationType?: string;
  OrganisationTypeId?: string;
  OrganisationSubType?: string;
  Address1?: string | null;
  Address2?: string | null;
  Address3?: string | null;
  City?: string | null;
  County?: string | null;
  Postcode?: string | null;
  [k: string]: unknown;
}
interface NhsSearchResponse {
  value?: NhsSearchValue[];
}

function mapNhsType(v: NhsSearchValue): string {
  const t = (v.OrganisationTypeId ?? v.OrganisationType ?? "").toLowerCase();
  if (t.includes("gp") || t === "gpb" || t === "gpp") return "gp";
  if (t.includes("pharm")) return "pharmacy";
  if (t.includes("hosp")) return "hospital";
  if (t.includes("ut") || t.includes("urgent")) return "urgent_treatment";
  return "other";
}

function buildAddress(v: NhsSearchValue): string | undefined {
  const parts = [v.Address1, v.Address2, v.Address3, v.City, v.County, v.Postcode]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => p.trim());
  return parts.length > 0 ? parts.join(", ") : undefined;
}

let warnedNoKey = false;

async function fetchFromNhsServiceSearch(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<LocalPreventiveContextService[] | null> {
  const filter = `geo.distance(Geocode,POINT(${lng} ${lat})) le ${NHS_SEARCH_RADIUS_KM}`;
  const url =
    `${NHS_SEARCH_BASE}/?api-version=3` +
    `&$filter=${encodeURIComponent(filter)}` +
    `&$top=${NHS_SEARCH_TOP}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NHS_SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { apikey: apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as NhsSearchResponse;
    const rows = body.value ?? [];
    return rows.map((v) => {
      const addr = buildAddress(v);
      return {
        name: typeof v.OrganisationName === "string" ? v.OrganisationName : "Unknown",
        type: mapNhsType(v),
        ...(addr !== undefined ? { address: addr } : {}),
      };
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function cachedFallback(postcode: string): Promise<ServicesFetchResult> {
  const fb = await fetchNearbyServices(postcode);
  return { services: fb.services, status: "cached-fallback" };
}

export async function fetchNearbyServicesLive(
  postcode: string,
  location: LocalPreventiveContextLocation,
): Promise<ServicesFetchResult> {
  const apiKey = process.env.NHS_API_KEY?.trim();
  if (!apiKey) {
    if (!warnedNoKey) {
      warnedNoKey = true;
      process.stderr.write(
        "[services] NHS_API_KEY unset — full mode degraded to cached-fallback\n",
      );
    }
    return cachedFallback(postcode);
  }
  if (location.latitude === null || location.longitude === null) {
    return cachedFallback(postcode);
  }

  const lat = Number(location.latitude.toFixed(3));
  const lng = Number(location.longitude.toFixed(3));
  const key = `${lat},${lng}`;

  return memoize<ServicesFetchResult>(
    "nhs-search",
    key,
    NHS_SEARCH_TTL_MS,
    async () => {
      const services = await fetchFromNhsServiceSearch(lat, lng, apiKey);
      if (services === null) return cachedFallback(postcode);
      if (services.length === 0) return cachedFallback(postcode);
      return { services, status: "live" };
    },
  );
}
