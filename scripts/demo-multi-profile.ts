/**
 * Multi-patient end-to-end probe.
 *
 * Goal: prove (or refute) that we are actually getting live internet responses
 * and report on every source honestly. For each of several varied UK
 * postcodes — including non-England and a deliberately invalid one — we:
 *
 *   1. Hit each ingestion adapter directly and time it.
 *   2. Print per-source: status (live/cached/synthetic/missing), latency,
 *      and a short sample of what came back.
 *   3. Ask GLM to mint a fictional patient profile (validated by Zod).
 *   4. Run BOTH engines, print the seam shape + rich extras.
 *   5. Render the patient-facing card via GLM and print it.
 *
 * Output ends with a compact UI-payload table showing exactly what the
 * frontend would receive per patient.
 */
import { loadConfig } from "../src/config.js";
import {
  parsePatientInput,
  type PatientInput,
} from "../src/contracts/patient_input.js";
import { fetchPostcode } from "../src/ingestion/postcode.js";
import { fetchNearbyServices } from "../src/ingestion/services.js";
import { getWaitingTimeContext } from "../src/ingestion/waiting_times.js";
import { getOfficialContent } from "../src/ingestion/official_content.js";
import { fetchPopulationContextSafe } from "../src/ingestion/population.js";
import { assessPreventiveRoute as seamEngine } from "../src/rules/engine.js";
import { assessViaSafetyEngine } from "../src/rules/safety_bridge.js";
import { renderAssessment } from "../src/rendering/render.js";

interface PostcodeProbe {
  postcode: string;
  note: string;
  /** Hint passed into the patient profile (livesInEngland flag). */
  inEngland: boolean;
}

const POSTCODES: PostcodeProbe[] = [
  { postcode: "M13 9PL", note: "Manchester (canonical demo)", inEngland: true },
  { postcode: "SW1A 1AA", note: "London, Buckingham Palace", inEngland: true },
  { postcode: "EH1 1YZ", note: "Edinburgh (Scotland)", inEngland: false },
  { postcode: "CF10 3RB", note: "Cardiff (Wales)", inEngland: false },
  { postcode: "ZZ99 9ZZ", note: "Deliberately INVALID postcode", inEngland: true },
];

/**
 * Per-call archetype. We rotate through these so GLM doesn't keep emitting
 * the same 54-year-old diabetic ex-smoker on every call (observed in the
 * pre-fix run — temperature 0.9 alone wasn't enough to break the mode).
 */
interface Archetype {
  label: string;
  hint: string;
}

const ARCHETYPES: Archetype[] = [
  {
    label: "young-healthy-missing-bp",
    hint: "A 42-year-old never-smoker with no diagnosed conditions and a normal BMI. They have NEVER had their blood pressure checked at a pharmacy, and systolicBp/diastolicBp are null. All other measurements are present.",
  },
  {
    label: "older-hypertensive-on-statins",
    hint: "A 68-year-old former smoker who has diagnosed hypertension and is currently on statins. systolicBp around 138, totalCholesterol around 4.2. One of bmi/waistCircumferenceCm is null.",
  },
  {
    label: "midlife-FH-current-smoker",
    hint: "A 55-year-old current smoker with familial hypercholesterolaemia. totalCholesterol is high (around 7.5) and hdlCholesterol is low (0.9). Includes sexAtBirth = 'female'.",
  },
  {
    label: "borderline-overweight-missing-cholesterol",
    hint: "A 49-year-old never-smoker with bmi around 29 and no diagnosed conditions. totalCholesterol and hdlCholesterol are null (never tested).",
  },
  {
    label: "kidney-disease-recent-bp",
    hint: "A 61-year-old former smoker with chronic kidney disease (NOT diabetes, NOT hypertension). BP was checked at a pharmacy in the last 6 months. smokingStatus is null (declined). Includes sexAtBirth = 'male'.",
  },
];

const PROFILE_PROMPT = (inEngland: boolean, archetype: Archetype) =>
  `
You are minting a SYNTHETIC UK adult patient profile for a hackathon demo.
Plausible but obviously fictional. Output ONLY a JSON object of this shape:

{
  "age": <int 18..90>,
  "livesInEngland": ${inEngland},
  "sexAtBirth": <"male" | "female" | "intersex" | "prefer_not_to_say" | null>,
  "hasCvd": <bool>, "hasChronicKidneyDisease": <bool>, "hasDiabetes": <bool>,
  "hasHypertension": <bool>, "hasAtrialFibrillation": <bool>,
  "hasStrokeOrTia": <bool>, "hasFamilialHypercholesterolaemia": <bool>,
  "hasHeartFailure": <bool>, "hasPeripheralArterialDisease": <bool>,
  "onStatins": <bool>, "previousHighCvdRisk": <bool>,
  "systolicBp": <90..180 or null>, "diastolicBp": <50..110 or null>,
  "totalCholesterol": <3.0..8.0 or null>, "hdlCholesterol": <0.7..2.5 or null>,
  "bmi": <17..40 or null>, "waistCircumferenceCm": <60..130 or null>,
  "smokingStatus": <"never"|"former"|"current"|null>,
  "bpCheckedLast6Months": <bool>,
  "chestPain": false, "strokeSymptoms": false, "severeBreathlessness": false
}

ARCHETYPE FOR THIS CALL (you MUST follow this; do not invent a different one):
${archetype.hint}

Hard rules:
- All three red-flag symptoms MUST be false.
- Output strictly the JSON described — no commentary, no extra fields.
- Honour the archetype's diagnosis pattern exactly.
`.trim();

interface ProfileFields {
  [k: string]: unknown;
}

function nullToUndef(raw: ProfileFields): unknown {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = v === null ? undefined : v;
  }
  return out;
}

async function mintPatient(
  inEngland: boolean,
  archetype: Archetype,
): Promise<PatientInput> {
  const cfg = loadConfig();
  if (!cfg.apiKey) throw new Error("ZAI_API_KEY is not set");
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: "You output strict JSON only." },
        { role: "user", content: PROFILE_PROMPT(inEngland, archetype) },
      ],
      temperature: 0.9,
      max_tokens: cfg.maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`z.ai HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = j.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("z.ai returned no content");
  const raw = JSON.parse(content) as ProfileFields;
  // Belt-and-braces: GLM was observed ignoring the inEngland directive in
  // earlier runs (always wrote livesInEngland=true). Force it post-parse so
  // the profile actually matches the postcode's country.
  (raw as Record<string, unknown>).livesInEngland = inEngland;
  const parsed = parsePatientInput(nullToUndef(raw));
  if (!parsed.ok) {
    throw new Error(
      "GLM produced invalid PatientInput:\n" +
        parsed.issues.map((i) => ` - ${i.path}: ${i.message}`).join("\n"),
    );
  }
  return parsed.value;
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<{
  label: string;
  ms: number;
  value: T;
}> {
  const t0 = Date.now();
  const value = await fn();
  return { label, ms: Date.now() - t0, value };
}

interface RunResult {
  probe: PostcodeProbe;
  fetches: {
    postcode: { ms: number; status: string; sample: string };
    services: { ms: number; status: string; count: number };
    waitingTimes: { ms: number; status: string; description: string };
    officialContent: { ms: number; status: string; count: number };
    population: { ms: number; status: string; area: string };
  };
  patientSummary: string;
  seamLine: string;
  richLine: string;
  agreement: boolean;
  extrasLines: string[];
  card: { headline: string; body: string; next_step: string; servicesN: number };
}

async function runOne(
  probe: PostcodeProbe,
  archetype: Archetype,
): Promise<RunResult> {
  // 1. Hit every ingestion adapter directly so we can time each one.
  //    All postcode-aware adapters now receive the probe's postcode so they
  //    can honestly report "missing" outside their cached area.
  const [postcode, services, waiting, content, population] = await Promise.all([
    timed("postcode", () => fetchPostcode(probe.postcode)),
    timed("services", () => fetchNearbyServices(probe.postcode)),
    timed("waitingTimes", () => getWaitingTimeContext(probe.postcode)),
    timed("officialContent", () => getOfficialContent()),
    timed("population", () => fetchPopulationContextSafe(probe.postcode)),
  ]);

  const postcodeStatus = postcode.value.ok ? "live" : `fail:${postcode.value.reason}`;
  const postcodeSample = postcode.value.ok
    ? `${postcode.value.resolvedPostcode} • ${postcode.value.location.adminDistrict ?? "?"} • ICB=${postcode.value.location.icb ?? "—"} • country=${postcode.value.location.country ?? "?"}`
    : "—";

  // 2. Mint a fictional patient.
  const patient = await mintPatient(probe.inEngland, archetype);

  // Inject the cached services into the engines (the renderer can use them
  // as long as the patient is not on the urgent_care branch).
  const localServices = services.value.services.slice(0, 3).map((s) => ({
    name: s.name,
    type: s.type,
  }));

  // 3. Run both engines.
  const seam = seamEngine(patient, { localServices });
  const { assessment: rich, extras } = assessViaSafetyEngine(patient, {
    localServices,
  });

  const fmtA = (a: typeof seam) =>
    `next=${a.next_step_type}  elig=${a.eligible_for_health_check}  ` +
    `missing=[${a.missing_measurements.join(",") || "—"}]  svc=${a.local_services?.length ?? 0}`;

  const agreement = JSON.stringify(seam) === JSON.stringify(rich);

  const extrasLines: string[] = [];
  extrasLines.push(
    `urgency=${extras.urgencyLevel}  emergency=${extras.requiresEmergencyServices}`,
  );
  extrasLines.push(
    `QRISK ready=${extras.qrisk.ready} status=${extras.qrisk.status} ` +
      `gaps=[${extras.qrisk.missingData.join(",") || "—"}]`,
  );
  if (extras.screeningMatches.length === 0) {
    extrasLines.push("screening: —");
  } else {
    for (const s of extras.screeningMatches.slice(0, 4)) {
      extrasLines.push(`screening: ${s.screeningType} (${s.status})`);
    }
  }
  for (const r of extras.recommendations.slice(0, 3)) {
    extrasLines.push(`rec [${r.priority}]: ${r.title}`);
  }

  // 4. Render the card.
  const card = await renderAssessment(seam);

  // Compact patient summary.
  const conds: string[] = [];
  if (patient.hasCvd) conds.push("CVD");
  if (patient.hasDiabetes) conds.push("diabetes");
  if (patient.hasHypertension) conds.push("HT");
  if (patient.hasChronicKidneyDisease) conds.push("CKD");
  if (patient.onStatins) conds.push("statins");
  const patientSummary =
    `age=${patient.age} ${patient.livesInEngland ? "ENG" : "non-ENG"} ` +
    `sex=${patient.sexAtBirth ?? "?"} ` +
    `conds=[${conds.join(",") || "—"}] ` +
    `BP=${patient.systolicBp ?? "?"}/${patient.diastolicBp ?? "?"} ` +
    `chol=${patient.totalCholesterol ?? "?"}/${patient.hdlCholesterol ?? "?"} ` +
    `BMI=${patient.bmi ?? "?"} smoke=${patient.smokingStatus ?? "?"} ` +
    `BPchecked6mo=${patient.bpCheckedLast6Months}`;

  return {
    probe,
    fetches: {
      postcode: {
        ms: postcode.ms,
        status: postcodeStatus,
        sample: postcodeSample,
      },
      services: {
        ms: services.ms,
        status: services.value.status,
        count: services.value.services.length,
      },
      waitingTimes: {
        ms: waiting.ms,
        status: waiting.value.status,
        description: waiting.value.data?.description ?? "(none)",
      },
      officialContent: {
        ms: content.ms,
        status: content.value.status,
        count: content.value.cards.length,
      },
      population: {
        ms: population.ms,
        status: population.value.status,
        area: population.value.data?.area ?? "—",
      },
    },
    patientSummary,
    seamLine: fmtA(seam),
    richLine: fmtA(rich),
    agreement,
    extrasLines,
    card: {
      headline: card.headline,
      body: card.body,
      next_step: card.next_step,
      servicesN: card.services.length,
    },
  };
}

function out(s: string) {
  process.stdout.write(s + "\n");
}

async function main() {
  const results: RunResult[] = [];
  for (let i = 0; i < POSTCODES.length; i++) {
    const probe = POSTCODES[i]!;
    const archetype = ARCHETYPES[i % ARCHETYPES.length]!;
    out("");
    out(`════════ ${probe.postcode}  (${probe.note})  [archetype: ${archetype.label}] ════════`);
    try {
      const r = await runOne(probe, archetype);
      results.push(r);

      out("── ingestion (per-source latency + status) ─");
      out(
        `  postcode        ${r.fetches.postcode.ms.toString().padStart(4)}ms  ${r.fetches.postcode.status.padEnd(16)}  ${r.fetches.postcode.sample}`,
      );
      out(
        `  services        ${r.fetches.services.ms.toString().padStart(4)}ms  ${r.fetches.services.status.padEnd(16)}  count=${r.fetches.services.count}  (NOTE: DoHS sandbox unusable — pinned)`,
      );
      out(
        `  waitingTimes    ${r.fetches.waitingTimes.ms.toString().padStart(4)}ms  ${r.fetches.waitingTimes.status.padEnd(16)}  "${r.fetches.waitingTimes.description.slice(0, 70)}${r.fetches.waitingTimes.description.length > 70 ? "…" : ""}"`,
      );
      out(
        `  officialContent ${r.fetches.officialContent.ms.toString().padStart(4)}ms  ${r.fetches.officialContent.status.padEnd(16)}  cards=${r.fetches.officialContent.count}  (NHS sandbox 503 — pinned)`,
      );
      out(
        `  population      ${r.fetches.population.ms.toString().padStart(4)}ms  ${r.fetches.population.status.padEnd(16)}  area="${r.fetches.population.area}"  (Fingertips not wired)`,
      );

      out("── patient (GLM-minted, Zod-validated) ─");
      out(`  ${r.patientSummary}`);

      out("── engines ─");
      out(`  seam   : ${r.seamLine}`);
      out(`  rich → : ${r.richLine}  ${r.agreement ? "✓" : "✗ DISAGREE"}`);
      out("  rich extras (not in seam):");
      for (const e of r.extrasLines) out(`    · ${e}`);

      out("── rendered card (z.ai/GLM) ─");
      out(`  headline : ${r.card.headline}`);
      out(`  body     : ${r.card.body}`);
      out(`  next_step: ${r.card.next_step}`);
      out(`  services : ${r.card.servicesN}`);
    } catch (err) {
      out(`  ERROR: ${String(err)}`);
    }
  }

  // -- UI payload summary table --------------------------------------------
  out("");
  out("════════ UI payload summary (what the frontend actually gets) ════════");
  out("");
  out(
    "postcode    pc-fetch  pc-quality   svc-quality  wait-quality  next_step                              cardHeadline",
  );
  out(
    "──────────  ────────  ───────────  ───────────  ────────────  ─────────────────────────────────────  ────────────────────────────",
  );
  for (const r of results) {
    out(
      `${r.probe.postcode.padEnd(10)}  ${(r.fetches.postcode.ms + "ms").padStart(7)}  ${r.fetches.postcode.status.padEnd(11)}  ${r.fetches.services.status.padEnd(11)}  ${r.fetches.waitingTimes.status.padEnd(12)}  ${(r.seamLine.match(/next=([a-z_]+)/)?.[1] ?? "?").padEnd(37)}  ${r.card.headline.slice(0, 40)}`,
    );
  }

  out("");
  out("════════ HONEST data-source audit (post-fix) ════════");
  out(
    "  postcode        — LIVE (postcodes.io). Per-request, UK-wide.",
  );
  out(
    "  services        — Manchester postcodes: cached pack. Other areas: empty + status='missing'.",
  );
  out(
    "                    Honest signal so the UI does NOT show wrong-area GPs.",
  );
  out(
    "  waitingTimes    — Manchester postcodes: Greater Manchester prose. Other areas: generic",
  );
  out(
    "                    NHS-wide prose (still cached, still isPersonalPrediction=false).",
  );
  out(
    "                    We are NOT genuinely estimating waits — never have been — but we no",
  );
  out(
    "                    longer serve Greater-Manchester claims to non-Manchester postcodes.",
  );
  out(
    "  officialContent — CACHED (NHS Website Content API 503; URLs verified on www.nhs.uk).",
  );
  out(
    "  population      — Manchester: synthetic. Other areas: null + 'missing'. Fingertips not wired.",
  );
}

main().catch((err) => {
  process.stderr.write(`demo-multi-profile failed: ${String(err)}\n`);
  process.exit(1);
});
