/**
 * SEAM TEST. Proves the engine→renderer join holds across the engine's full
 * output range. No features added; this test just shines a light on the join.
 *
 * 1. Enumerate PatientInputs covering every next_step_type, every eligibility
 *    value, 0/1/many missing measurements, and the 39/40/74/75 age boundaries.
 * 2. Run assessPreventiveRoute on each. Confirm every output is accepted by
 *    the renderer's input validation (validateAssessment) without coercion.
 * 3. Cross-check the engine's forbidden_claims vocabulary against the
 *    guardrail's FORBIDDEN_OUTPUT_TOKENS — if the engine emits a claim that
 *    no guardrail token can catch in rendered text, that is a SEAM GAP.
 * 4. Render each assessment via the guarded path. Live z.ai if ZAI_API_KEY is
 *    present, deterministic WellBehavedClient stub otherwise. Assert every
 *    card is schema-valid, within char limits, forbidden-token-free, and that
 *    urgent_care cards carry no services and no Health Check mention.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { assessPreventiveRoute } from "../src/rules/engine.js";
import { parsePatientInput, type PatientInput } from "../src/contracts/patient_input.js";
import { renderAssessment } from "../src/rendering/render.js";
import {
  FORBIDDEN_OUTPUT_TOKENS,
  containsForbiddenToken,
  validateAssessment,
} from "../src/rendering/guardrails.js";
import {
  CARD_MAX_BODY_CHARS,
  CARD_MAX_HEADLINE_CHARS,
  CARD_MAX_NEXT_STEP_CHARS,
  type CardJson,
} from "../src/rendering/card_schema.js";
import { SAFE_FALLBACK_CARD } from "../src/rendering/safe_fallback.js";
import { ZaiHttpClient, type ZaiClient } from "../src/rendering/zai_client.js";
import type {
  HealthCheckEligibility,
  LocalService,
  NextStepType,
  PreventiveAssessment,
} from "../src/rules/types.js";

/* -------------------------------------------------------------------------- */
/* Mode selection                                                             */
/* -------------------------------------------------------------------------- */

const RAW_KEY = (process.env.ZAI_API_KEY ?? "").trim().replace(/^['"]|['"]$/g, "");
const HAS_REAL_KEY =
  RAW_KEY.length > 0 && RAW_KEY !== "your-api-key-here";
const FORCE_STUB = process.env.SEAM_STUB === "1";
const USE_LIVE = HAS_REAL_KEY && !FORCE_STUB;

const SERVICES: LocalService[] = [
  { name: "Boots Pharmacy, Wilmslow Road", type: "pharmacy" },
  { name: "Robert Darbishire Practice", type: "gp" },
];

/* -------------------------------------------------------------------------- */
/* Deterministic stub (no-key mode)                                           */
/* -------------------------------------------------------------------------- */

class WellBehavedClient implements ZaiClient {
  async complete(userJson: string): Promise<string> {
    const a = JSON.parse(userJson) as PreventiveAssessment;
    const services = a.local_services ?? [];

    if (a.next_step_type === "urgent_care") {
      return JSON.stringify({
        headline: "Please get help now",
        body: "Based on what you've told us, you should speak to a clinician straight away. If this feels life-threatening, call 999. Otherwise use NHS 111 online at 111.nhs.uk or call 111.",
        next_step: "Call 999 if life-threatening; otherwise NHS 111.",
        services: [],
      });
    }
    if (a.next_step_type === "pharmacy_bp_check") {
      return JSON.stringify({
        headline: "A quick check can complete the picture",
        body: "A free blood pressure check is available at most pharmacies in England if you're 40 or over — no appointment needed. Knowing your numbers will help complete your assessment.",
        next_step: "Pop into a local pharmacy for a free blood pressure check.",
        services,
      });
    }
    if (a.next_step_type === "ask_gp_or_pharmacy_about_measurements") {
      return JSON.stringify({
        headline: "We need a couple of numbers first",
        body: "Some measurements are missing from your information. A GP or local pharmacy can take them for you, which will complete the picture.",
        next_step: "Ask your GP or local pharmacy about the missing measurements.",
        services,
      });
    }
    return JSON.stringify({
      headline: "A GP appointment is the right next step",
      body: "Based on your information, a routine GP appointment is the best place to talk through what's next.",
      next_step: "Book a routine GP appointment.",
      services,
    });
  }
  async completeChat(): Promise<string> {
    throw new Error("completeChat not used in this test");
  }
}

const renderClient: ZaiClient = USE_LIVE
  ? new ZaiHttpClient()
  : new WellBehavedClient();

/* -------------------------------------------------------------------------- */
/* Baseline + case enumeration                                                */
/* -------------------------------------------------------------------------- */

function baseline(overrides: Partial<PatientInput> = {}): PatientInput {
  return {
    age: 50,
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

    systolicBp: 122,
    diastolicBp: 78,
    totalCholesterol: 5.0,
    hdlCholesterol: 1.3,
    bmi: 24,
    waistCircumferenceCm: 88,
    smokingStatus: "never",

    bpCheckedLast6Months: false,

    chestPain: false,
    strokeSymptoms: false,
    severeBreathlessness: false,

    ...overrides,
  };
}

interface SeamCase {
  id: string;
  input: PatientInput;
  expectedNextStep: NextStepType;
  expectedEligibility: HealthCheckEligibility;
  expectedMissingBucket: "zero" | "one" | "many";
}

const CASES: SeamCase[] = [
  // ---- urgent_care: red-flag wins; eligibility pinned to "not_applicable" ----
  {
    id: "U1: urgent_care + chest pain (age 50, all present)",
    input: baseline({ chestPain: true }),
    expectedNextStep: "urgent_care",
    expectedEligibility: "not_applicable",
    expectedMissingBucket: "zero",
  },
  {
    id: "U2: urgent_care + stroke symptoms (age 30)",
    input: baseline({ age: 30, strokeSymptoms: true }),
    expectedNextStep: "urgent_care",
    expectedEligibility: "not_applicable",
    expectedMissingBucket: "zero",
  },
  {
    id: "U3: urgent_care + severe breathlessness (age 70, missing BP)",
    input: baseline({
      age: 70,
      severeBreathlessness: true,
      systolicBp: undefined,
    }),
    expectedNextStep: "urgent_care",
    expectedEligibility: "not_applicable",
    // Engine clears missing on urgent — invariant.
    expectedMissingBucket: "zero",
  },

  // ---- pharmacy_bp_check ----
  {
    id: "P1: pharmacy_bp_check (age 45, missing BP only) → 1 missing",
    input: baseline({ age: 45, systolicBp: undefined }),
    expectedNextStep: "pharmacy_bp_check",
    expectedEligibility: "possibly",
    expectedMissingBucket: "one",
  },
  {
    id: "P2: pharmacy_bp_check (age 50, missing BP + smoking) → many missing",
    input: baseline({ systolicBp: undefined, smokingStatus: undefined }),
    expectedNextStep: "pharmacy_bp_check",
    expectedEligibility: "possibly",
    expectedMissingBucket: "many",
  },

  // ---- ask_gp_or_pharmacy_about_measurements ----
  {
    id: "A1: ask (hypertension blocks pharmacy_bp_check) → not_eligible_existing_condition",
    input: baseline({ systolicBp: undefined, hasHypertension: true }),
    expectedNextStep: "ask_gp_or_pharmacy_about_measurements",
    expectedEligibility: "not_eligible_existing_condition",
    expectedMissingBucket: "one",
  },
  {
    id: "A2: ask (missing smoking only) → possibly, 1 missing",
    input: baseline({ smokingStatus: undefined }),
    expectedNextStep: "ask_gp_or_pharmacy_about_measurements",
    expectedEligibility: "possibly",
    expectedMissingBucket: "one",
  },
  {
    id: "A3: ask (age 35 → bpCheckRoute false → ask not pharmacy)",
    input: baseline({ age: 35, systolicBp: undefined }),
    expectedNextStep: "ask_gp_or_pharmacy_about_measurements",
    expectedEligibility: "not_age_eligible",
    expectedMissingBucket: "one",
  },

  // ---- gp_review (0 missing) ----
  {
    id: "G1: gp_review (all present, age 50) → possibly",
    input: baseline(),
    expectedNextStep: "gp_review",
    expectedEligibility: "possibly",
    expectedMissingBucket: "zero",
  },
  {
    id: "G2: gp_review (hasDiabetes) → not_eligible_existing_condition",
    input: baseline({ hasDiabetes: true }),
    expectedNextStep: "gp_review",
    expectedEligibility: "not_eligible_existing_condition",
    expectedMissingBucket: "zero",
  },
  {
    id: "G3: gp_review (age 30) → not_age_eligible",
    input: baseline({ age: 30 }),
    expectedNextStep: "gp_review",
    expectedEligibility: "not_age_eligible",
    expectedMissingBucket: "zero",
  },

  // ---- age boundaries 39/40/74/75 ----
  {
    id: "B-39: age 39 (all present) → not_age_eligible, gp_review",
    input: baseline({ age: 39 }),
    expectedNextStep: "gp_review",
    expectedEligibility: "not_age_eligible",
    expectedMissingBucket: "zero",
  },
  {
    id: "B-40: age 40 (all present) → possibly, gp_review",
    input: baseline({ age: 40 }),
    expectedNextStep: "gp_review",
    expectedEligibility: "possibly",
    expectedMissingBucket: "zero",
  },
  {
    id: "B-74: age 74 (all present) → possibly, gp_review",
    input: baseline({ age: 74 }),
    expectedNextStep: "gp_review",
    expectedEligibility: "possibly",
    expectedMissingBucket: "zero",
  },
  {
    id: "B-75: age 75 (all present) → not_age_eligible, gp_review",
    input: baseline({ age: 75 }),
    expectedNextStep: "gp_review",
    expectedEligibility: "not_age_eligible",
    expectedMissingBucket: "zero",
  },
];

function bucket(n: number): "zero" | "one" | "many" {
  if (n === 0) return "zero";
  if (n === 1) return "one";
  return "many";
}

/* -------------------------------------------------------------------------- */
/* Prebuild: engine outputs and rendered cards (parallel render in beforeAll) */
/* -------------------------------------------------------------------------- */

interface SeamRow {
  case: SeamCase;
  assessment: PreventiveAssessment;
  card: CardJson;
  renderError: string | null;
}

const rows: SeamRow[] = [];

beforeAll(async () => {
  // First: parse + assess every case (sync, instant).
  const partials: { case: SeamCase; assessment: PreventiveAssessment }[] = [];
  for (const c of CASES) {
    const parsed = parsePatientInput(c.input);
    if (!parsed.ok) {
      throw new Error(
        `case ${c.id} produced invalid PatientInput: ${JSON.stringify(parsed.issues)}`,
      );
    }
    const a = assessPreventiveRoute(parsed.value, { localServices: SERVICES });
    partials.push({ case: c, assessment: a });
  }

  // Render every case in parallel. Live z.ai handles fan-out fine; the stub
  // path is instant either way.
  const cards = await Promise.all(
    partials.map(async (p) => {
      try {
        const card = await renderAssessment(p.assessment, { client: renderClient });
        return { card, renderError: null as string | null };
      } catch (err) {
        return {
          card: { ...SAFE_FALLBACK_CARD, services: [] as LocalService[] },
          renderError: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  for (let i = 0; i < partials.length; i++) {
    const part = partials[i]!;
    const c = cards[i]!;
    rows.push({
      case: part.case,
      assessment: part.assessment,
      card: c.card,
      renderError: c.renderError,
    });
  }
}, 600_000);

/* -------------------------------------------------------------------------- */
/* SEAM CHECK 1: engine outputs validate against renderer input validation    */
/* -------------------------------------------------------------------------- */

describe("seam 1: engine outputs validate against renderer input validation", () => {
  for (const c of CASES) {
    it(`${c.id} → validateAssessment accepts, no enum/field drift`, () => {
      const row = rows.find((r) => r.case.id === c.id)!;
      const v = validateAssessment(row.assessment);
      // FAIL LOUDLY if renderer rejects engine output.
      expect(
        v.ok,
        v.ok ? "" : `validateAssessment rejected engine output: ${v.reason}`,
      ).toBe(true);

      // Confirm engine's branch labels match expectations (catches engine drift
      // before we blame the renderer).
      expect(row.assessment.next_step_type).toBe(c.expectedNextStep);
      expect(row.assessment.eligible_for_health_check).toBe(c.expectedEligibility);
      expect(bucket(row.assessment.missing_measurements.length)).toBe(
        c.expectedMissingBucket,
      );

      // No coercion: the validated object must reference-equal the engine
      // output (validateAssessment returns the same object back).
      if (v.ok) expect(v.value).toBe(row.assessment);
    });
  }
});

/* -------------------------------------------------------------------------- */
/* SEAM CHECK 2: engine forbidden_claims vocabulary vs guardrail token list   */
/* -------------------------------------------------------------------------- */

describe("seam 2: engine forbidden_claims must be catchable by guardrail tokens", () => {
  // Collect the engine's full forbidden_claims vocabulary across all cases.
  const vocabulary = new Set<string>();
  for (const c of CASES) {
    const a = assessPreventiveRoute(parsePatientInput(c.input).ok ? c.input : c.input, {
      localServices: SERVICES,
    });
    for (const claim of a.forbidden_claims) vocabulary.add(claim);
  }

  // For each distinct claim, prove FORBIDDEN_OUTPUT_TOKENS contains a substring
  // that would block a rendering of that claim.
  for (const claim of vocabulary) {
    it(`engine claim "${claim}" must be catchable by some FORBIDDEN_OUTPUT_TOKEN`, () => {
      const matching = containsForbiddenToken(claim);
      // matching === null  =>  guardrail can't catch this claim if the model
      // renders it.
      expect(
        matching,
        matching === null
          ? `SEAM GAP: engine emits forbidden claim "${claim}" but FORBIDDEN_OUTPUT_TOKENS has no substring that would catch it. If a model disregards forbidden_claims and renders this claim, the guardrail will not intervene. Either (a) widen FORBIDDEN_OUTPUT_TOKENS, or (b) reword the engine claim so an existing token catches it.`
          : "",
      ).not.toBeNull();
    });
  }
});

/* -------------------------------------------------------------------------- */
/* SEAM CHECK 3: rendered cards are schema-valid + within char limits +       */
/*               forbidden-token-free                                         */
/* -------------------------------------------------------------------------- */

describe("seam 3: rendered cards are schema-valid, within char limits, forbidden-token-free", () => {
  for (const c of CASES) {
    it(`${c.id} → card OK`, () => {
      const row = rows.find((r) => r.case.id === c.id)!;
      expect(row.renderError, `render threw: ${row.renderError}`).toBeNull();

      const card = row.card;
      expect(typeof card.headline).toBe("string");
      expect(typeof card.body).toBe("string");
      expect(typeof card.next_step).toBe("string");
      expect(Array.isArray(card.services)).toBe(true);

      expect(card.headline.length).toBeLessThanOrEqual(CARD_MAX_HEADLINE_CHARS);
      expect(card.body.length).toBeLessThanOrEqual(CARD_MAX_BODY_CHARS);
      expect(card.next_step.length).toBeLessThanOrEqual(CARD_MAX_NEXT_STEP_CHARS);

      // Sweep forbidden tokens across the rendered text only (service names are
      // copied verbatim from input.local_services and are not subject to the
      // sweep — same policy as test/rendering.adversarial.test.ts).
      const text = `${card.headline}\n${card.body}\n${card.next_step}`;
      const offending = containsForbiddenToken(text);
      expect(
        offending,
        offending !== null
          ? `card contains forbidden token "${offending}":\n${text}`
          : "",
      ).toBeNull();
    });
  }
});

/* -------------------------------------------------------------------------- */
/* SEAM CHECK 4: urgent_care cards carry no services and no Health Check      */
/*               mention                                                      */
/* -------------------------------------------------------------------------- */

describe("seam 4: urgent_care cards have no services and no Health Check mention", () => {
  const urgentCases = CASES.filter((c) => c.expectedNextStep === "urgent_care");

  for (const c of urgentCases) {
    it(`${c.id} → services=[] and no "Health Check" in text`, () => {
      const row = rows.find((r) => r.case.id === c.id)!;
      expect(row.card.services).toEqual([]);
      const text =
        `${row.card.headline}\n${row.card.body}\n${row.card.next_step}`.toLowerCase();
      expect(text).not.toContain("health check");
      expect(text).not.toContain("pharmacy");
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Summary table — printed at the end so the user can read the per-branch grid */
/* -------------------------------------------------------------------------- */

describe("seam 5: per-branch coverage table", () => {
  it("prints coverage table", () => {
    const mode = USE_LIVE ? "LIVE GLM-5.1" : "STUB (WellBehavedClient)";
    const lines: string[] = [
      "",
      `=== SEAM TEST COVERAGE (${mode}) ===`,
      "id              | next_step                              | eligibility                       | missing | safe-fb? | card-len(h/b/n)",
      "----------------+----------------------------------------+-----------------------------------+---------+----------+-----------------",
    ];
    for (const row of rows) {
      const isSafe =
        row.card.headline === SAFE_FALLBACK_CARD.headline ? "yes" : "no";
      const idShort = row.case.id.split(":")[0]!.padEnd(15);
      lines.push(
        [
          idShort,
          row.assessment.next_step_type.padEnd(38),
          row.assessment.eligible_for_health_check.padEnd(33),
          String(row.assessment.missing_measurements.length).padEnd(7),
          isSafe.padEnd(8),
          `${row.card.headline.length}/${row.card.body.length}/${row.card.next_step.length}`,
        ].join(" | "),
      );
    }
    process.stdout.write(lines.join("\n") + "\n");
  });
});
