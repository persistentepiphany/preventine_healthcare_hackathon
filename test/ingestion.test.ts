import { afterEach, describe, expect, it, vi } from "vitest";
import { normalisePostcode } from "../src/ingestion/postcode.js";
import { fetchNearbyServices } from "../src/ingestion/services.js";
import { getWaitingTimeContext } from "../src/ingestion/waiting_times.js";
import { fetchPopulationContextSafe } from "../src/ingestion/population.js";
import { getOfficialContent } from "../src/ingestion/official_content.js";
import { getLocalPreventiveContext } from "../src/ingestion/context.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalisePostcode", () => {
  it("inserts the missing space", () => {
    expect(normalisePostcode("m139pl")).toBe("M13 9PL");
  });
  it("collapses internal whitespace", () => {
    expect(normalisePostcode("  m13  9pl  ")).toBe("M13 9PL");
  });
  it("uppercases", () => {
    expect(normalisePostcode("sw1a 1aa")).toBe("SW1A 1AA");
  });
  it("leaves short strings alone", () => {
    expect(normalisePostcode("???")).toBe("???");
  });
});

describe("services adapter — fallback pack is load-bearing", () => {
  it("returns cached Manchester services for any postcode", async () => {
    const r = await fetchNearbyServices("M13 9PL");
    expect(r.status).toBe("cached");
    expect(r.services.length).toBeGreaterThan(0);
    expect(r.services.some((s) => s.type === "gp")).toBe(true);
    // Pharmacies are intentionally NOT pre-baked — see data/demoServices.json
    // "policy" note. The renderer can still point users at "a local pharmacy"
    // via the static officialContent pharmacy-bp-check card.
    expect(r.services.some((s) => s.type === "pharmacy")).toBe(false);
    expect(r.services.some((s) => s.type === "hospital")).toBe(true);
    expect(r.services.some((s) => s.name.includes("Manchester"))).toBe(true);
  });

  it("does NOT leak DoHS internals — services have exactly name/type/optional address", () => {
    return fetchNearbyServices("M13 9PL").then((r) => {
      for (const s of r.services) {
        const keys = Object.keys(s).sort();
        const allowed = new Set(["name", "type", "address"]);
        for (const k of keys) expect(allowed.has(k)).toBe(true);
      }
    });
  });
});

describe("waiting times — disclaimer attached, never personal", () => {
  it("attaches isPersonalPrediction=false and a disclaimer", async () => {
    const r = await getWaitingTimeContext();
    expect(r.status).toBe("cached");
    expect(r.data?.isPersonalPrediction).toBe(false);
    expect(r.data?.disclaimer).toMatch(/not a personal prediction/i);
  });
});

describe("population context — synthetic, never throws", () => {
  it("returns synthetic with isSynthetic=true and dataQuality status 'synthetic'", async () => {
    const r = await fetchPopulationContextSafe();
    // Distinct from "cached" — the data was never sourced from a real feed.
    expect(r.status).toBe("synthetic");
    expect(r.data?.isSynthetic).toBe(true);
  });
});

describe("official content — cached cards with real nhs.uk URLs", () => {
  it("returns cached cards covering the demo flows", async () => {
    const r = await getOfficialContent();
    expect(r.status).toBe("cached");
    expect(r.cards.length).toBeGreaterThanOrEqual(5);
    for (const c of r.cards) {
      expect(c.url.startsWith("https://www.nhs.uk/")).toBe(true);
    }
    expect(r.cards.some((c) => c.id === "nhs-health-check")).toBe(true);
    expect(r.cards.some((c) => c.id === "pharmacy-bp-check")).toBe(true);
  });
});

describe("orchestrator resilience — Promise.allSettled, postcode-down survival", () => {
  it("postcode fetch failure → empty location, content still served, dataQuality.postcode='missing'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("simulated network down");
      }),
    );

    const ctx = await getLocalPreventiveContext("M13 9PL");
    expect(ctx.inputPostcode).toBe("M13 9PL");
    expect(ctx.resolvedPostcode).toBeNull();
    expect(ctx.location.adminDistrict).toBeNull();
    expect(ctx.dataQuality.postcode).toBe("missing");

    // The rest of the bundle must still be usable.
    expect(ctx.officialContent.length).toBeGreaterThan(0);
    expect(ctx.dataQuality.officialContent).toBe("cached");
    expect(ctx.services.length).toBeGreaterThan(0);
    expect(ctx.dataQuality.services).toBe("cached");
    expect(ctx.waitingTimes).not.toBeNull();
    expect(ctx.dataQuality.waitingTimes).toBe("cached");
    expect(ctx.population).not.toBeNull();
    expect(ctx.dataQuality.population).toBe("synthetic");
  });

  it("includes fetchedAt and inputPostcode echo even on full source failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("simulated network down");
      }),
    );
    const ctx = await getLocalPreventiveContext("m13 9pl");
    expect(ctx.inputPostcode).toBe("M13 9PL");
    expect(ctx.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("does NOT leak postcodes.io implementation detail — location object has fixed shape, no IMD", async () => {
    // Mock a successful postcodes.io response that includes the
    // `index_of_multiple_deprivation` field. We must NOT see it in the
    // resulting LocalPreventiveContext.location.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            status: 200,
            result: {
              postcode: "M13 9PL",
              admin_district: "Manchester",
              region: "North West",
              ccg: "NHS Greater Manchester",
              icb: "NHS Greater Manchester Integrated Care Board",
              nhs_ha: "North West",
              lsoa: "Manchester 018F",
              msoa: "Manchester 018",
              latitude: 53.466926,
              longitude: -2.233578,
              country: "England",
              index_of_multiple_deprivation: 11725,
              status: 200,
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const ctx = await getLocalPreventiveContext("M13 9PL");
    expect(ctx.resolvedPostcode).toBe("M13 9PL");
    expect(ctx.location.adminDistrict).toBe("Manchester");
    expect(ctx.location.icb).toBe(
      "NHS Greater Manchester Integrated Care Board",
    );
    expect(ctx.dataQuality.postcode).toBe("live");

    // IMD guard.
    const locationKeys = Object.keys(ctx.location).sort();
    expect(locationKeys).not.toContain("index_of_multiple_deprivation");
    expect(locationKeys).not.toContain("imd");
    expect(JSON.stringify(ctx.location)).not.toContain("11725");
  });
});
