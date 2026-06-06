/**
 * LocalPreventiveContext is the shape the app fetches from /api/nhs/context. It
 * bundles everything the renderer / UI needs about a postcode: where the patient
 * is, what local services are nearby, area-level waiting-time signal, the
 * static NHS content cards, optional synthetic population context, and an
 * honest dataQuality report so the UI can show "live" vs "cached" badges.
 *
 * IMPORTANT: any field whose source returned an error is set to a benign empty
 * value (null / []) and reported in dataQuality. The object is ALWAYS usable
 * for rendering — one dead source must not sink the rest. See
 * getLocalPreventiveContext (Promise.allSettled).
 */

/**
 * dataQuality badge state.
 *  - "live"      : fetched fresh from an upstream that we trust to return real data
 *                  (postcodes.io).
 *  - "cached"    : we have real data, but it's pinned in our demo pack rather than
 *                  freshly fetched — typically because the upstream is unreliable
 *                  (NHS DoHS sandbox) or unavailable (NHS Website Content API 503).
 *  - "synthetic" : we made it up. The data is illustrative, not sourced from any
 *                  real-world feed. The UI should badge this differently from
 *                  "cached" so users / judges aren't misled into thinking it's
 *                  pulled-and-pinned real data.
 *  - "missing"   : the source failed and we have nothing to show.
 */
export type DataQualityStatus = "live" | "cached" | "synthetic" | "missing";

export interface LocalPreventiveContextLocation {
  /** From postcodes.io. Greater Manchester ICB, etc. */
  adminDistrict: string | null;
  region: string | null;
  ccg: string | null;
  icb: string | null;
  lsoa: string | null;
  msoa: string | null;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
}

export interface LocalPreventiveContextService {
  name: string;
  type: string;
  /**
   * Free-text address as ingested from the source. Optional because the cached
   * pack has it but a live DoHS-style response may not.
   */
  address?: string;
}

export interface LocalPreventiveContextWaitingTimes {
  /**
   * Plain-English description used by the renderer. Always carries the
   * "this is an area-level signal, not a personal prediction" disclaimer.
   */
  description: string;
  /** Hard-coded so the renderer can never accidentally personalise it. */
  isPersonalPrediction: false;
  disclaimer: string;
}

export interface LocalPreventiveContextContentCard {
  id: string;
  title: string;
  url: string;
  summary: string;
}

export interface LocalPreventiveContextPopulation {
  /**
   * Marked synthetic explicitly. Demo never sources live Fingertips indicator
   * data this turn; if a future turn wires Fingertips, change this flag and the
   * dataQuality.population badge accordingly.
   */
  isSynthetic: true;
  area: string;
  notes: string;
}

export interface LocalPreventiveContextDataQuality {
  postcode: DataQualityStatus;
  services: DataQualityStatus;
  waitingTimes: DataQualityStatus;
  officialContent: DataQualityStatus;
  population: DataQualityStatus;
}

export interface LocalPreventiveContext {
  /** The raw postcode the caller submitted, after light normalisation. */
  inputPostcode: string;
  /** What postcodes.io confirmed back, or null if lookup failed. */
  resolvedPostcode: string | null;
  location: LocalPreventiveContextLocation;
  services: LocalPreventiveContextService[];
  waitingTimes: LocalPreventiveContextWaitingTimes | null;
  officialContent: LocalPreventiveContextContentCard[];
  population: LocalPreventiveContextPopulation | null;
  dataQuality: LocalPreventiveContextDataQuality;
  /** ISO 8601 timestamp the orchestrator finished assembling this object. */
  fetchedAt: string;
}

export const EMPTY_LOCATION: LocalPreventiveContextLocation = {
  adminDistrict: null,
  region: null,
  ccg: null,
  icb: null,
  lsoa: null,
  msoa: null,
  latitude: null,
  longitude: null,
  country: null,
};
