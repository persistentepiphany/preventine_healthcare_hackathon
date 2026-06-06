import type {
  LocalPreventiveContext,
  LocalPreventiveContextDataQuality,
  DataQualityStatus,
} from "../contracts/local_preventive_context.js";
import { EMPTY_LOCATION } from "../contracts/local_preventive_context.js";
import { fetchPostcode, normalisePostcode } from "./postcode.js";
import { fetchNearbyServices } from "./services.js";
import { getWaitingTimeContext } from "./waiting_times.js";
import { fetchPopulationContextSafe } from "./population.js";
import { getOfficialContent } from "./official_content.js";

/**
 * Orchestrator. Promise.allSettled (NOT all) so one dead source can't sink the
 * rest. ALWAYS returns a usable LocalPreventiveContext:
 *  - postcode fails  => empty location, content cards still served, dataQuality
 *                       postcode='missing'.
 *  - services fail   => services=[], dataQuality.services='missing'.
 *  - etc.
 *
 * dataQuality is computed from each fetch's REAL reported status, not guessed
 * from the row contents.
 */
export async function getLocalPreventiveContext(
  rawPostcode: string,
): Promise<LocalPreventiveContext> {
  const inputPostcode = normalisePostcode(rawPostcode);

  const [postcodeR, servicesR, waitingR, contentR, populationR] =
    await Promise.allSettled([
      fetchPostcode(rawPostcode),
      fetchNearbyServices(rawPostcode),
      getWaitingTimeContext(),
      getOfficialContent(),
      fetchPopulationContextSafe(),
    ]);

  // Postcode
  let resolvedPostcode: string | null = null;
  let location = { ...EMPTY_LOCATION };
  let postcodeQuality: DataQualityStatus = "missing";
  if (postcodeR.status === "fulfilled" && postcodeR.value.ok) {
    resolvedPostcode = postcodeR.value.resolvedPostcode;
    location = postcodeR.value.location;
    postcodeQuality = "live";
  }

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
