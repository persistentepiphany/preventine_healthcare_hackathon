import type {
  LocalPreventiveContext,
  LocalPreventiveContextDataQuality,
  DataQualityStatus,
} from "../contracts/local_preventive_context.js";
import { EMPTY_LOCATION } from "../contracts/local_preventive_context.js";
import { fetchPostcode, normalisePostcode } from "./postcode.js";
import {
  fetchNearbyServices,
  fetchNearbyServicesLive,
  fetchNearbyServicesViaODS,
} from "./services.js";
import { getWaitingTimeContext, getWaitingTimeContextForIcb } from "./waiting_times.js";
import {
  fetchPopulationContextSafe,
  fetchPopulationContextLive,
} from "./population.js";
import { getOfficialContent } from "./official_content.js";

/**
 * Mode toggle.
 *  - "demo"  (default): everything cached / synthetic. Postcode lookup is the
 *            only live call. Stage-safe.
 *  - "light": postcode + Fingertips population + RTT-by-ICB waiting times live.
 *            Services cached. Free upstreams only — no API key needed.
 *  - "full" : light + NHS Service Search live (gated on NHS_API_KEY). Without
 *            the key, services degrade to dataQuality "cached-fallback".
 */
export type Mode = "demo" | "light" | "full";

export interface ContextOptions {
  mode?: Mode;
}

/**
 * Orchestrator. Postcode lookup runs first because Fingertips / RTT / Service
 * Search all need the resolved area codes. The remaining four fetches fan
 * out via Promise.allSettled so one dead upstream can't sink the rest.
 * ALWAYS returns a usable LocalPreventiveContext.
 *
 * dataQuality is computed from each fetch's REAL reported status, not guessed
 * from the row contents.
 */
export async function getLocalPreventiveContext(
  rawPostcode: string,
  options: ContextOptions = {},
): Promise<LocalPreventiveContext> {
  const mode: Mode = options.mode ?? "demo";
  const inputPostcode = normalisePostcode(rawPostcode);

  // 1. Postcode first — its `codes.admin_district` and `codes.icb` gate the
  //    live area-coded calls below.
  const postcodeR = await fetchPostcode(rawPostcode);

  let resolvedPostcode: string | null = null;
  let location = { ...EMPTY_LOCATION };
  let postcodeQuality: DataQualityStatus = "missing";
  if (postcodeR.ok) {
    resolvedPostcode = postcodeR.resolvedPostcode;
    location = postcodeR.location;
    postcodeQuality = "live";
  }

  // 2. Per-mode adapter selection. Each promise resolves to a `{ data, status }`
  //    pair — adapters self-report their honest dataQuality status.
  const servicesPromise =
    mode === "full"
      ? fetchNearbyServicesLive(rawPostcode, location)
      : mode === "light"
        ? fetchNearbyServicesViaODS(rawPostcode)
        : fetchNearbyServices(rawPostcode);

  const waitingPromise =
    mode !== "demo" && location.icbCode
      ? getWaitingTimeContextForIcb(location.icbCode, location.icb, rawPostcode)
      : getWaitingTimeContext(rawPostcode);

  const populationPromise =
    mode !== "demo" && location.adminDistrictCode
      ? fetchPopulationContextLive(
          location.adminDistrictCode,
          location.adminDistrict ?? "",
          rawPostcode,
        )
      : fetchPopulationContextSafe(rawPostcode);

  const [servicesR, waitingR, contentR, populationR] = await Promise.allSettled([
    servicesPromise,
    waitingPromise,
    getOfficialContent(),
    populationPromise,
  ]);

  // Services
  let services: LocalPreventiveContext["services"] = [];
  let servicesQuality: DataQualityStatus = "missing";
  if (servicesR.status === "fulfilled") {
    services = servicesR.value.services;
    servicesQuality = servicesR.value.status;
  }

  // Waiting times
  let waitingTimes: LocalPreventiveContext["waitingTimes"] = null;
  let waitingQuality: DataQualityStatus = "missing";
  if (waitingR.status === "fulfilled") {
    waitingTimes = waitingR.value.data;
    waitingQuality = waitingR.value.status;
  }

  // Official content
  let officialContent: LocalPreventiveContext["officialContent"] = [];
  let contentQuality: DataQualityStatus = "missing";
  if (contentR.status === "fulfilled") {
    officialContent = contentR.value.cards;
    contentQuality = contentR.value.status;
  }

  // Population
  let population: LocalPreventiveContext["population"] = null;
  let populationQuality: DataQualityStatus = "missing";
  if (populationR.status === "fulfilled") {
    population = populationR.value.data;
    populationQuality = populationR.value.status;
  }

  const dataQuality: LocalPreventiveContextDataQuality = {
    postcode: postcodeQuality,
    services: servicesQuality,
    waitingTimes: waitingQuality,
    officialContent: contentQuality,
    population: populationQuality,
  };

  return {
    inputPostcode,
    resolvedPostcode,
    location,
    services,
    waitingTimes,
    officialContent,
    population,
    dataQuality,
    fetchedAt: new Date().toISOString(),
  };
}
