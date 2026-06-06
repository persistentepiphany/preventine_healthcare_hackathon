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
 *  - "live"           : fetched fresh from an upstream that we trust to return real data
 *                       (postcodes.io, Fingertips, NHS Service Search).
 *  - "live-aggregate" : derived from a real but aggregate / non-real-time source
 *                       (e.g. monthly per-ICB RTT statistics). Still real data,
 *                       still not a personal prediction.
 *  - "cached"         : we have real data, but it's pinned in our demo pack rather
 *                       than freshly fetched — by design or because the upstream
 *                       is canonically unreliable (NHS DoHS sandbox).
 *  - "cached-fallback": we attempted a live fetch and it failed, so we returned the
 *                       cached pack. UI should badge this differently from
 *                       plain "cached" so the demo viewer sees a real signal that
 *                       something tried-and-failed.
 *  - "synthetic"      : we made it up. The data is illustrative, not sourced from
 *                       any real-world feed. The UI should badge this differently
 *                       from "cached" so users / judges aren't misled.
 *  - "missing"        : the source failed and we have nothing to show.
 */
export type DataQualityStatus =
  | "live"
  | "live-aggregate"
  | "cached"
  | "cached-fallback"
  | "synthetic"
  | "missing";

export interface LocalPreventiveContextLocation {
  /** From postcodes.io. Greater Manchester ICB, etc. */
  adminDistrict: string | null;
  /**
   * Upper-tier local authority ONS code (e.g. "E08000003" for Manchester).
   * Used as the geographic key for Fingertips public-health indicators
   * (`area_type_id=502`). Null when postcodes.io is unavailable or the
   * postcode resolves to a non-UTLA-coded area.
   */
  adminDistrictCode: string | null;
  region: string | null;
  ccg: string | null;
  icb: string | null;
  /**
   * ONS code for the ICB (e.g. "E54000057" for NHS Greater Manchester ICB).
   * Used to key the per-ICB RTT waiting-time lookup.
   */
  icbCode: string | null;
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

export interface PopulationIndicator {
  /** Fingertips indicator id (e.g. 22401 = NHS Health Check coverage). */
  id: number;
  /** Engineer-resolved human-readable name. */
  name: string;
  /** Most-recent value Fingertips returned for the area. Null when missing. */
  value: number | null;
  /** Fingertips year-range label (e.g. "2023/24"). */
  year: string | null;
  /** Engineer-supplied units (%, per 100,000, etc). */
  unit: string;
}

export interface LocalPreventiveContextPopulation {
  /**
   * True if the data is illustrative (the synthetic pack). False once a live
   * Fingertips fetch has populated `indicators`. The UI badges accordingly.
   */
  isSynthetic: boolean;
  area: string;
  notes: string;
  /**
   * Present when live Fingertips data has been fetched for the area.
   * Absent when the source is synthetic.
   */
  indicators?: PopulationIndicator[];
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
  adminDistrictCode: null,
  region: null,
  ccg: null,
  icb: null,
  icbCode: null,
  lsoa: null,
  msoa: null,
  latitude: null,
  longitude: null,
  country: null,
};
