import { describe, expect, it, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Loads the UI's browser-globals (seeds.js, adapters.js) into a sandbox so the
 * adapter logic can be exercised in Node. We don't load data.js (the IIFE is
 * 659 lines and depends on the static fixture working — we use a minimal
 * fallback object instead). Catches mapping drift if the backend response
 * shape changes.
 */

interface Sandbox {
  window: {
    PPSeeds?: any;
    PPAdapt?: any;
    PPFallback?: { STATIC_DATA: any };
  };
  Math: typeof Math;
  JSON: typeof JSON;
  console: typeof console;
  Number: typeof Number;
  String: typeof String;
  Array: typeof Array;
  Object: typeof Object;
}

const uiAppDir = path.resolve(__dirname, "..", "ui", "Preventive Care", "app");
const seedsSrc = fs.readFileSync(path.join(uiAppDir, "seeds.js"), "utf8");
const adaptersSrc = fs.readFileSync(path.join(uiAppDir, "adapters.js"), "utf8");

const PROFILE_PHARMACY_BP = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "samples", "profile-pharmacy-bp.json"), "utf8")
);
const PROFILE_GP_REVIEW = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "samples", "profile-gp-review.json"), "utf8")
);

/** Minimal stand-in for window.PPFallback.STATIC_DATA. We only need the fields
 * the adapter falls back to (measurements default, services, content, trends). */
const MINIMAL_FALLBACK = {
  patient: { name: "Fallback", initials: "FB", sex: "Male", ethnicity: "—", postcode: "M13 9PL" },
  measurements: [
    { id: "hr", label: "Resting Heart Rate", value: "72", spark: [], source: "Connected watch", status: "good" },
    { id: "steps", label: "Daily Activity", value: 6000, target: 8000, status: "raised", spark: [], trend: "flat" },
  ],
  measurementDetail: {},
  trends: { ranges: [], steps: { avg: 6000, target: 8000 }, restingHr: { data: [] }, factorMix: [] },
  healthCheck: { status: "possibly_eligible", headline: "Fallback", reason: "", includes: [], criteria: [] },
  cvdRisk: { state: "incomplete", knownFactors: [], unlocks: [], safety: "" },
  profileChecklist: [], completeness: 0,
  services: [
    { id: "svc-x", name: "Fallback GP", type: "gp_practice", typeLabel: "GP Practice", address: "—", phone: "", distanceKm: 0.5, offers: [], lat: 53.46, lon: -2.23 },
  ],
  waitingTimes: { records: [], disclaimer: "fallback", rttStandard: 18, explainer: "" },
  actions: [], gpQuestions: [], gpSummary: "Fallback GP summary",
  content: [{ title: "NHS Health Check", summary: "—", url: "https://www.nhs.uk", relevance: "Health Check" }],
  resources: [], support: {}, account: {}, provenance: [
    { label: "Location & NHS geography", source: "postcodes.io", mode: "live" },
  ], dataSources: [],
};

function loadSandbox(): Sandbox {
  const sandbox: Sandbox = {
    window: { PPFallback: { STATIC_DATA: MINIMAL_FALLBACK } },
    Math, JSON, console, Number, String, Array, Object,
  };
  vm.createContext(sandbox);
  vm.runInContext(seedsSrc, sandbox);
  vm.runInContext(adaptersSrc, sandbox);
  return sandbox;
}

describe("UI adapters: composeAppData", () => {
  let sb: Sandbox;
  beforeAll(() => {
    sb = loadSandbox();
  });

  it("loads seeds + adapters cleanly into sandbox", () => {
    expect(sb.window.PPSeeds).toBeTruthy();
    expect(sb.window.PPSeeds.DEFAULT_SEED).toBeTruthy();
    expect(sb.window.PPSeeds.RANDOM_SEEDS.length).toBeGreaterThanOrEqual(6);
    expect(sb.window.PPAdapt).toBeTruthy();
    expect(typeof sb.window.PPAdapt.composeAppData).toBe("function");
  });

  it("DEFAULT_SEED has no red-flag symptoms", () => {
    const p = sb.window.PPSeeds.DEFAULT_SEED.patient;
    expect(p.chestPain).toBe(false);
    expect(p.strokeSymptoms).toBe(false);
    expect(p.severeBreathlessness).toBe(false);
  });

  it("every RANDOM_SEED has no red-flag symptoms (urgent_care never fires)", () => {
    for (const seed of sb.window.PPSeeds.RANDOM_SEEDS) {
      const p = seed.patient;
      expect(p.chestPain, `seed ${seed.id}`).toBe(false);
      expect(p.strokeSymptoms, `seed ${seed.id}`).toBe(false);
      expect(p.severeBreathlessness, `seed ${seed.id}`).toBe(false);
      expect(p.livesInEngland, `seed ${seed.id}`).toBe(true);
    }
  });

  it("composes APP_DATA for the pharmacy-BP fixture (BP missing → measurements[0].status === missing)", () => {
    const seed = sb.window.PPSeeds.DEFAULT_SEED;
    const composed = sb.window.PPAdapt.composeAppData(seed, PROFILE_PHARMACY_BP, null, MINIMAL_FALLBACK);
    expect(composed.patient.name).toBe("James Whitfield");
    expect(composed.patient.postcode).toBe("M13 9PL");
    expect(composed.patient.initials).toBe("JW");

    const bp = composed.measurements.find((m: any) => m.id === "bp");
    expect(bp).toBeTruthy();
    expect(bp.status).toBe("missing");
    expect(bp.statusLabel).toBe("Not recorded");
    expect(bp.unlockValue).toBe("128/82");
  });

  it("composes APP_DATA for the GP-review fixture (all measurements recorded → readiness 100)", () => {
    const seed = {
      id: "complete-test",
      patient: {
        age: 52, livesInEngland: true, sexAtBirth: "male",
        hasCvd: false, hasChronicKidneyDisease: false, hasDiabetes: false,
        hasHypertension: false, hasAtrialFibrillation: false, hasStrokeOrTia: false,
        hasFamilialHypercholesterolaemia: false, hasHeartFailure: false,
        hasPeripheralArterialDisease: false, onStatins: false, previousHighCvdRisk: false,
        bpCheckedLast6Months: true, chestPain: false, strokeSymptoms: false, severeBreathlessness: false,
        systolicBp: 128, diastolicBp: 80,
        totalCholesterol: 4.8, hdlCholesterol: 1.2,
        bmi: 26, waistCircumferenceCm: 92, smokingStatus: "former",
      },
      presentation: {
        name: "Test User", initials: "TU", sex: "Male", ethnicity: "—", postcode: "M13 9PL",
        location: null, lifestyle: { smoking: "Ex-smoker", smokingFlag: "history", familyHistory: "None", familyHistoryFlag: "good" },
        heartRate: { value: 70, status: "good", spark: [], source: "Self" },
        steps: { value: 7000, target: 8000, status: "good", spark: [], trend: "flat" },
        bmiSpark: [], waistSpark: [],
      },
    };
    const composed = sb.window.PPAdapt.composeAppData(seed, PROFILE_GP_REVIEW, null, MINIMAL_FALLBACK);

    const bp = composed.measurements.find((m: any) => m.id === "bp");
    expect(bp.status).not.toBe("missing");
    expect(bp.value).toBe("128/80");

    const chol = composed.measurements.find((m: any) => m.id === "cholesterol");
    expect(chol.status).not.toBe("missing");
    expect(chol.value).toBe("4.8");

    expect(composed.cvdRisk.state).toBe("ready");
    expect(composed.completeness).toBe(100);
  });

  it("eligibility 'possibly' maps to healthCheck.status='possibly_eligible' + correct criteria", () => {
    const seed = sb.window.PPSeeds.DEFAULT_SEED;
    const composed = sb.window.PPAdapt.composeAppData(seed, PROFILE_PHARMACY_BP, null, MINIMAL_FALLBACK);
    expect(composed.healthCheck.status).toBe("possibly_eligible");
    expect(composed.healthCheck.criteria[0].met).toBe(true);
    expect(composed.healthCheck.criteria[1].met).toBe(true);
  });

  it("services fallback to MINIMAL_FALLBACK when context is null", () => {
    const seed = sb.window.PPSeeds.DEFAULT_SEED;
    const composed = sb.window.PPAdapt.composeAppData(seed, PROFILE_PHARMACY_BP, null, MINIMAL_FALLBACK);
    expect(composed.services.length).toBeGreaterThan(0);
    expect(composed.services[0].name).toBe("Fallback GP");
  });

  it("backend signals carried through under appData._backend", () => {
    const seed = sb.window.PPSeeds.DEFAULT_SEED;
    const composed = sb.window.PPAdapt.composeAppData(seed, PROFILE_PHARMACY_BP, null, MINIMAL_FALLBACK);
    expect(composed._backend).toBeTruthy();
    expect(composed._backend.source).toBe(PROFILE_PHARMACY_BP.source);
    expect(composed._backend.urgencyLevel).toBe("routine");
    expect(composed._backend.card.headline).toBe(PROFILE_PHARMACY_BP.card.headline);
  });

  it("actions: first action targets the highest-value missing measurement (BP for default seed)", () => {
    const seed = sb.window.PPSeeds.DEFAULT_SEED;
    const composed = sb.window.PPAdapt.composeAppData(seed, PROFILE_PHARMACY_BP, null, MINIMAL_FALLBACK);
    expect(composed.actions.length).toBeGreaterThan(0);
    expect(composed.actions[0].title.toLowerCase()).toContain("blood pressure");
  });

  it("bmiBand correctly tags healthy/overweight/obese", () => {
    expect(sb.window.PPAdapt.bmiBand(22).status).toBe("good");
    expect(sb.window.PPAdapt.bmiBand(27).status).toBe("raised");
    expect(sb.window.PPAdapt.bmiBand(33).status).toBe("high");
    expect(sb.window.PPAdapt.bmiBand(null).status).toBe("missing");
  });

  it("bpBand correctly tags healthy/slightly raised/raised", () => {
    expect(sb.window.PPAdapt.bpBand(118, 76).status).toBe("good");
    expect(sb.window.PPAdapt.bpBand(132, 84).status).toBe("raised");
    expect(sb.window.PPAdapt.bpBand(150, 95).status).toBe("high");
  });

  it("pickRandomSeed never returns the default", () => {
    // 30 trials → must always pick from index 1+.
    const sb2 = loadSandbox();
    const defaultId = sb2.window.PPSeeds.DEFAULT_SEED.id;
    for (let i = 0; i < 30; i++) {
      const picked = sb2.window.PPSeeds.pickRandomSeed();
      expect(picked.id).not.toBe(defaultId);
    }
  });
});
