import type { LocalPreventiveContextLocation } from "../contracts/local_preventive_context.js";

/**
 * postcodes.io adapter. Returns a discriminated union so the orchestrator can
 * tell a clean 404 ("not a real postcode") apart from a network failure
 * ("source is down — show cached/missing badge").
 *
 * We field-pick aggressively because the upstream returns `status`, `result`,
 * etc. — leaking those into LocalPreventiveContext would surface implementation
 * detail in the demo card.
 */

export interface PostcodeResultOk {
  ok: true;
  /** What we got back, normalised (postcodes.io echoes back canonical form). */
  resolvedPostcode: string;
  location: LocalPreventiveContextLocation;
}

export interface PostcodeResultFail {
  ok: false;
  reason: "not_found" | "network" | "timeout" | "bad_response";
}

export type PostcodeResult = PostcodeResultOk | PostcodeResultFail;

const POSTCODES_IO_BASE = "https://api.postcodes.io/postcodes";
const TIMEOUT_MS = 3000;

/**
 * Normalise user input: trim, uppercase, collapse internal whitespace, and
 * insert a space before the last 3 chars if missing (UK postcodes are
 * outward-code + inward-code, e.g. "M139PL" -> "M13 9PL").
 */
export function normalisePostcode(raw: string): string {
  const stripped = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (stripped.length < 5 || stripped.length > 7) return stripped;
  return `${stripped.slice(0, stripped.length - 3)} ${stripped.slice(-3)}`;
}

interface PostcodesIoSuccessShape {
  status: number;
  result: {
    postcode?: string;
    admin_district?: string | null;
    region?: string | null;
    ccg?: string | null;
    icb?: string | null;
    nhs_ha?: string | null;
    lsoa?: string | null;
    msoa?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    country?: string | null;
    /**
     * postcodes.io DOES return `index_of_multiple_deprivation` (LSOA rank), but
     * we deliberately do NOT pick it. See the IMD guard comment in the body
     * of fetchPostcode().
     */
    index_of_multiple_deprivation?: number | null;
    [k: string]: unknown;
  };
}

export async function fetchPostcode(rawPostcode: string): Promise<PostcodeResult> {
  const normalised = normalisePostcode(rawPostcode);
  if (!normalised) return { ok: false, reason: "not_found" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(
      `${POSTCODES_IO_BASE}/${encodeURIComponent(normalised)}`,
      { signal: controller.signal },
    );
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "network" };
  }
  clearTimeout(timer);

  if (res.status === 404) return { ok: false, reason: "not_found" };
  if (!res.ok) return { ok: false, reason: "network" };

  let body: PostcodesIoSuccessShape;
  try {
    body = (await res.json()) as PostcodesIoSuccessShape;
  } catch {
    return { ok: false, reason: "bad_response" };
  }

  const r = body.result;
  if (!r || typeof r !== "object") return { ok: false, reason: "bad_response" };

  // IMD GUARD: postcodes.io DOES return `index_of_multiple_deprivation` as an
  // LSOA-level rank for M13 9PL (value 11725 as of 2026-06-06). We deliberately
  // do not field-pick it. A single LSOA rank without national normalisation is
  // easy to misuse in a patient-facing card ("you live in a deprived area") —
  // the project rule is no deprivation claims in any rendered text, so we cut
  // the data at the source. See source-verification.md (Corrections).
  return {
    ok: true,
    resolvedPostcode: typeof r.postcode === "string" ? r.postcode : normalised,
    location: {
      adminDistrict: typeof r.admin_district === "string" ? r.admin_district : null,
      region: typeof r.region === "string" ? r.region : null,
      ccg: typeof r.ccg === "string" ? r.ccg : null,
      // postcodes.io has BOTH `icb` (ICB name) and `nhs_ha` (legacy NHS Health
      // Authority / NHS region). Prefer `icb` when present.
      icb:
        typeof r.icb === "string"
          ? r.icb
          : typeof r.nhs_ha === "string"
            ? r.nhs_ha
            : null,
      lsoa: typeof r.lsoa === "string" ? r.lsoa : null,
      msoa: typeof r.msoa === "string" ? r.msoa : null,
      latitude: typeof r.latitude === "number" ? r.latitude : null,
      longitude: typeof r.longitude === "number" ? r.longitude : null,
      country: typeof r.country === "string" ? r.country : null,
    },
  };
}
