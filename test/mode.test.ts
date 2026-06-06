import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatch } from "../src/http/router.js";
import { memoClear } from "../src/lib/memo.js";

/**
 * Mode toggle coverage:
 *  - Default (no ?mode=) → "demo". All adapters cached/synthetic; postcode live.
 *  - ?mode=light → Fingertips live (mocked), RTT-by-ICB live-aggregate, services cached.
 *  - ?mode=full without NHS_API_KEY → services degrade to "cached-fallback".
 *  - Aggregate /api/nhs/full returns union of context + profile.
 *
 * Postcode resolution is mocked to a deterministic Manchester response so the
 * tests don't depend on postcodes.io network state.
 */

const POSTCODES_IO_M13 = {
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
    codes: {
      admin_district: "E08000003",
      icb: "E54000057",
    },
  },
};

// Minimal mock of Fingertips bulk response — two indicators with one Manchester
// row each. We only need to prove the live path lands.
const FINGERTIPS_BULK = [
  {
    IID: 90366,
    Data: [
      { AreaCode: "E08000003", SexId: 4, AgeId: 1, Year: 2023, YearRange: 3, Val: 76.0 },
    ],
  },
  {
    IID: 92443,
    Data: [
      { AreaCode: "E08000003", SexId: 4, AgeId: 1, Year: 2024, YearRange: 1, Val: 15.6 },
    ],
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Mock ODS response — one of each role type for Manchester.
const ODS_M13_RESPONSES: Record<string, unknown> = {
  RO177: {
    Organisations: [
      { Name: "ARDWICK MEDICAL PRACTICE", OrgId: "P84A", Status: "Active", PostCode: "M13 9UJ", PrimaryRoleId: "RO177" },
    ],
  },
  RO182: {
    Organisations: [
      { Name: "EVEREST PHARMACY", OrgId: "FL361", Status: "Active", PostCode: "M13 9AB", PrimaryRoleId: "RO182" },
    ],
  },
  RO198: {
    Organisations: [
      {
        Name: "MANCHESTER ROYAL INFIRMARY - URGENT TREATMENT CENTRE",
        OrgId: "E2O8F",
        Status: "Active",
        PostCode: "M13 9WL",
        PrimaryRoleId: "RO198",
      },
    ],
  },
};

function makeFetchMock() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith("https://api.postcodes.io/postcodes/")) {
      return jsonResponse(POSTCODES_IO_M13);
    }
    if (url.startsWith("https://fingertips.phe.org.uk/api/latest_data")) {
      return jsonResponse(FINGERTIPS_BULK);
    }
    if (url.startsWith("https://directory.spineservices.nhs.uk/")) {
      // ODS by PrimaryRoleId
      const match = url.match(/PrimaryRoleId=(RO\d+)/);
      const role = match ? match[1] : "";
      return jsonResponse(ODS_M13_RESPONSES[role] ?? { Organisations: [] });
    }
    if (url.startsWith("https://api.service.nhs.uk/")) {
      // Default mock: 401 (no key) wouldn't actually be hit because the adapter
      // short-circuits when NHS_API_KEY is unset, but returning something
      // benign here keeps the suite tolerant of unexpected calls.
      return jsonResponse({ value: [] });
    }
    throw new Error(`unexpected fetch in mode test: ${url}`);
  });
}

beforeEach(() => {
  memoClear();
  vi.stubGlobal("fetch", makeFetchMock());
});

afterEach(() => {
  vi.restoreAllMocks();
  memoClear();
  delete process.env.NHS_API_KEY;
});

describe("Mode toggle — /api/nhs/context", () => {
  it("no ?mode → demo: postcode live, everything else cached/synthetic", async () => {
    const r = await dispatch(
      "GET",
      "/api/nhs/context",
      new URLSearchParams({ postcode: "M13 9PL" }),
      undefined,
    );
    expect(r.status).toBe(200);
    const body = r.body as { mode: string; dataQuality: Record<string, string> };
    expect(body.mode).toBe("demo");
    expect(body.dataQuality.postcode).toBe("live");
    expect(body.dataQuality.services).toBe("cached");
    expect(body.dataQuality.waitingTimes).toBe("cached");
    expect(body.dataQuality.population).toBe("synthetic");
  });

  it("?mode=light: Fingertips + ODS services + RTT all live, no key needed", async () => {
    const r = await dispatch(
      "GET",
      "/api/nhs/context",
      new URLSearchParams({ postcode: "M13 9PL", mode: "light" }),
      undefined,
    );
    expect(r.status).toBe(200);
    const body = r.body as {
      mode: string;
      dataQuality: Record<string, string>;
      services: { name: string; type: string }[];
      population: {
        isSynthetic: boolean;
        indicators?: { id: number; value: number | null }[];
      } | null;
      waitingTimes: { description: string; isPersonalPrediction: boolean } | null;
    };
    expect(body.mode).toBe("light");
    expect(body.dataQuality.population).toBe("live");
    expect(body.dataQuality.waitingTimes).toBe("live-aggregate");
    expect(body.dataQuality.services).toBe("live");

    // ODS services landed — at least one of each type, real names
    expect(body.services.length).toBeGreaterThanOrEqual(3);
    expect(body.services.some((s) => s.type === "gp")).toBe(true);
    expect(body.services.some((s) => s.type === "pharmacy")).toBe(true);
    expect(body.services.some((s) => s.type === "hospital")).toBe(true);
    // Title-cased, not screaming ALL CAPS
    expect(body.services.every((s) => s.name === s.name.toLowerCase() ? false : true)).toBe(true);
    expect(body.services.every((s) => !/^[A-Z\s]+$/.test(s.name))).toBe(true);

    // Fingertips indicators landed
    expect(body.population?.isSynthetic).toBe(false);
    expect(body.population?.indicators?.length).toBeGreaterThan(0);

    // RTT prose carries a real %, isPersonalPrediction still false
    expect(body.waitingTimes?.description).toMatch(/\d+\.\d+%/);
    expect(body.waitingTimes?.isPersonalPrediction).toBe(false);
  });

  it("?mode=full without NHS_API_KEY: services degrade to cached-fallback", async () => {
    // Make sure NHS_API_KEY is unset for this case
    delete process.env.NHS_API_KEY;

    const r = await dispatch(
      "GET",
      "/api/nhs/context",
      new URLSearchParams({ postcode: "M13 9PL", mode: "full" }),
      undefined,
    );
    expect(r.status).toBe(200);
    const body = r.body as { dataQuality: Record<string, string> };
    expect(body.dataQuality.services).toBe("cached-fallback");
    // Population + waiting still go live in full mode
    expect(body.dataQuality.population).toBe("live");
    expect(body.dataQuality.waitingTimes).toBe("live-aggregate");
  });

  it("unknown mode token falls back to demo", async () => {
    const r = await dispatch(
      "GET",
      "/api/nhs/context",
      new URLSearchParams({ postcode: "M13 9PL", mode: "nonsense" }),
      undefined,
    );
    expect(r.status).toBe(200);
    const body = r.body as { mode: string; dataQuality: Record<string, string> };
    expect(body.mode).toBe("demo");
    expect(body.dataQuality.population).toBe("synthetic");
  });
});

describe("Mode toggle — Fingertips fallback path", () => {
  it("Fingertips upstream failure → population cached-fallback, isSynthetic stays true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.startsWith("https://api.postcodes.io/")) {
          return jsonResponse(POSTCODES_IO_M13);
        }
        if (url.startsWith("https://fingertips.phe.org.uk/")) {
          return new Response("oops", { status: 500 });
        }
        throw new Error(`unexpected: ${url}`);
      }),
    );

    const r = await dispatch(
      "GET",
      "/api/nhs/context",
      new URLSearchParams({ postcode: "M13 9PL", mode: "light" }),
      undefined,
    );
    const body = r.body as { dataQuality: Record<string, string>; population: { isSynthetic: boolean } | null };
    expect(body.dataQuality.population).toBe("cached-fallback");
    expect(body.population?.isSynthetic).toBe(true);
  });
});

describe("Aggregate /api/nhs/full", () => {
  const SAFE_PATIENT = {
    age: 52,
    livesInEngland: true,
    hasCvd: false,
    hasChronicKidneyDisease: false,
    hasDiabetes: false,
    hasHypertension: false,
    hasAtrialFibrillation: false,
    hasStrokeOrTia: false,
    hasFamilialHypercholesterolaemia: false,
    hasHeartFailure: false,
    hasPeripheralArterialDisease: false,
    onStatins: false,
    previousHighCvdRisk: false,
    bpCheckedLast6Months: true,
    systolicBp: 122,
    diastolicBp: 78,
    totalCholesterol: 4.8,
    hdlCholesterol: 1.2,
    bmi: 26,
    waistCircumferenceCm: 92,
    smokingStatus: "former",
    chestPain: false,
    strokeSymptoms: false,
    severeBreathlessness: false,
  };

  it("returns { mode, context, profile } in one round-trip", async () => {
    const stubZai = {
      async complete() {
        return JSON.stringify({
          headline: "Looks like a good chance to check in",
          body: "Your numbers are in. Bring this to your GP for a routine review.",
          next_step: "Book a routine GP appointment.",
          services: [],
        });
      },
      async completeChat() {
        return "{}";
      },
    };

    const r = await dispatch(
      "POST",
      "/api/nhs/full",
      new URLSearchParams({ mode: "light" }),
      { patient: SAFE_PATIENT, postcode: "M13 9PL" },
      { zaiClient: stubZai },
    );

    expect(r.status).toBe(200);
    const body = r.body as {
      mode: string;
      context: { dataQuality: Record<string, string> } | null;
      profile: { card: { headline: string }; factors: unknown[] };
    };
    expect(body.mode).toBe("light");
    expect(body.context?.dataQuality.population).toBe("live");
    expect(body.profile.card.headline).toBeTruthy();
    expect(Array.isArray(body.profile.factors)).toBe(true);
  });

  it("without postcode → omits context, still returns profile", async () => {
    const stubZai = {
      async complete() {
        return JSON.stringify({
          headline: "ok",
          body: "ok",
          next_step: "ok",
          services: [],
        });
      },
      async completeChat() {
        return "{}";
      },
    };
    const r = await dispatch(
      "POST",
      "/api/nhs/full",
      new URLSearchParams(),
      { patient: SAFE_PATIENT },
      { zaiClient: stubZai },
    );

    expect(r.status).toBe(200);
    const body = r.body as { context: unknown; profile: unknown };
    expect(body.context).toBeNull();
    expect(body.profile).toBeTruthy();
  });
});
