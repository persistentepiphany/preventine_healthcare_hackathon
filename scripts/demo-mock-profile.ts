/**
 * End-to-end demo: GLM mints a fictional UK patient profile, the seam engine
 * AND the rich engine each grade it, then the renderer (GLM again) turns the
 * winning seam assessment into a patient-facing card.
 *
 * Usage:  npx tsx scripts/demo-mock-profile.ts [POSTCODE]
 * Default postcode: M13 9PL  (the canonical demo case in Manchester).
 *
 * Pipeline:
 *   GLM → JSON patient                (creative step, validated by Zod)
 *      → src/rules/engine.ts          (frozen seam — renderer's contract)
 *      → src/rules/safety_bridge.ts   (rich engine, projected to seam + extras)
 *      → src/ingestion/context.ts     (postcode → location/services/etc.)
 *      → src/rendering/render.ts      (GLM emits CardJson; guardrails sweep)
 */
import { loadConfig } from "../src/config.js";
import {
  parsePatientInput,
  type PatientInput,
} from "../src/contracts/patient_input.js";
import { assessPreventiveRoute as seamEngine } from "../src/rules/engine.js";
import { assessViaSafetyEngine } from "../src/rules/safety_bridge.js";
import { getLocalPreventiveContext } from "../src/ingestion/context.js";
import { renderAssessment } from "../src/rendering/render.js";

const PROFILE_PROMPT = `
You are minting a SYNTHETIC UK adult patient profile for a hackathon demo.
This must be obviously fictional but plausible. Output ONLY a single JSON
object that matches this exact shape (no markdown, no commentary):

{
  "age": <int 18..90>,
  "livesInEngland": true,
  "hasCvd": <bool>, "hasChronicKidneyDisease": <bool>, "hasDiabetes": <bool>,
  "hasHypertension": <bool>, "hasAtrialFibrillation": <bool>,
  "hasStrokeOrTia": <bool>, "hasFamilialHypercholesterolaemia": <bool>,
  "hasHeartFailure": <bool>, "hasPeripheralArterialDisease": <bool>,
  "onStatins": <bool>, "previousHighCvdRisk": <bool>,
  "systolicBp": <90..180 or null>, "diastolicBp": <50..110 or null>,
  "totalCholesterol": <3.0..8.0 or null>, "hdlCholesterol": <0.7..2.5 or null>,
  "bmi": <17..40 or null>, "waistCircumferenceCm": <60..130 or null>,
  "smokingStatus": <"never" | "former" | "current" | null>,
  "bpCheckedLast6Months": <bool>,
  "chestPain": false, "strokeSymptoms": false, "severeBreathlessness": false
}

Constraints:
- Pick someone aged 40..70 so the NHS Health Check pathway is interesting.
- Leave AT LEAST ONE measurement field as null so the engine has a missing
  measurement to react to.
- Keep all three red-flag symptoms false (we want the preventive branch,
  not urgent_care).
- Do not invent extra fields.
`.trim();

interface ProfileFields {
  age: number;
  livesInEngland: boolean;
  hasCvd: boolean;
  hasChronicKidneyDisease: boolean;
  hasDiabetes: boolean;
  hasHypertension: boolean;
  hasAtrialFibrillation: boolean;
  hasStrokeOrTia: boolean;
  hasFamilialHypercholesterolaemia: boolean;
  hasHeartFailure: boolean;
  hasPeripheralArterialDisease: boolean;
  onStatins: boolean;
  previousHighCvdRisk: boolean;
  systolicBp: number | null;
  diastolicBp: number | null;
  totalCholesterol: number | null;
  hdlCholesterol: number | null;
  bmi: number | null;
  waistCircumferenceCm: number | null;
  smokingStatus: "never" | "former" | "current" | null;
  bpCheckedLast6Months: boolean;
  chestPain: boolean;
  strokeSymptoms: boolean;
  severeBreathlessness: boolean;
}

/** Strip nulls → undefined so Zod's `.optional()` accepts the shape. */
function nullToUndef(raw: ProfileFields): unknown {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = v === null ? undefined : v;
  }
  return out;
}

async function mintPatient(): Promise<PatientInput> {
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
        { role: "user", content: PROFILE_PROMPT },
      ],
      temperature: 0.8,
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
  const parsed = parsePatientInput(nullToUndef(raw));
  if (!parsed.ok) {
    throw new Error(
      "GLM produced an invalid PatientInput:\n" +
        parsed.issues.map((i) => ` - ${i.path}: ${i.message}`).join("\n"),
    );
  }
  return parsed.value;
}

function summarisePatient(p: PatientInput): string {
  const measurements = [
    p.systolicBp !== undefined ? `BP=${p.systolicBp}/${p.diastolicBp}` : "BP=?",
    p.totalCholesterol !== undefined
      ? `chol=${p.totalCholesterol}/${p.hdlCholesterol}`
      : "chol=?",
    p.bmi !== undefined ? `BMI=${p.bmi}` : "BMI=?",
    p.smokingStatus !== undefined ? `smoke=${p.smokingStatus}` : "smoke=?",
  ].join("  ");
  const conds: string[] = [];
  if (p.hasCvd) conds.push("CVD");
  if (p.hasDiabetes) conds.push("diabetes");
  if (p.hasHypertension) conds.push("hypertension");
  if (p.onStatins) conds.push("statins");
  if (p.hasChronicKidneyDisease) conds.push("CKD");
  return `age=${p.age}  conds=[${conds.join(",") || "—"}]  ${measurements}`;
}

async function main() {
  const postcode = process.argv[2] ?? "M13 9PL";

  process.stdout.write("┌─ STEP 1 ─ GLM mints a fictional patient\n");
  const patient = await mintPatient();
  process.stdout.write(`│  ${summarisePatient(patient)}\n`);
  process.stdout.write(`│  full input:\n`);
  process.stdout.write(
    "│  " + JSON.stringify(patient, null, 2).split("\n").join("\n│  ") + "\n",
  );

  process.stdout.write("\n┌─ STEP 2 ─ Ingestion: postcode → local context\n");
  const ctx = await getLocalPreventiveContext(postcode);
  process.stdout.write(
    `│  resolved=${ctx.resolvedPostcode}  ICB=${ctx.location.icb ?? "?"}  ` +
      `services=${ctx.services.length}  dataQuality=${JSON.stringify(ctx.dataQuality)}\n`,
  );
  const localServices = ctx.services
    .slice(0, 3)
    .map((s) => ({ name: s.name, type: s.type }));
  for (const s of localServices) {
    process.stdout.write(`│   • ${s.type}: ${s.name}\n`);
  }

  process.stdout.write("\n┌─ STEP 3 ─ Seam engine vs Rich engine (same input)\n");
  const seam = seamEngine(patient, { localServices });
  const { assessment: bridged, extras } = assessViaSafetyEngine(patient, {
    localServices,
  });
  const fmt = (a: typeof seam) =>
    `next=${a.next_step_type}  risk=${a.risk_band}  ` +
    `elig=${a.eligible_for_health_check}  ` +
    `missing=[${a.missing_measurements.join(",") || "—"}]`;
  process.stdout.write(`│  seam   : ${fmt(seam)}\n`);
  process.stdout.write(`│  rich → : ${fmt(bridged)}\n`);
  const agree = JSON.stringify(seam) === JSON.stringify(bridged);
  process.stdout.write(`│  seam shapes ${agree ? "✓ agree" : "✗ DISAGREE"}\n`);
  process.stdout.write(`│  rich-only extras:\n`);
  process.stdout.write(
    `│   · urgency=${extras.urgencyLevel}  emergency=${extras.requiresEmergencyServices}\n`,
  );
  process.stdout.write(
    `│   · QRISK ready=${extras.qrisk.ready} status=${extras.qrisk.status} ` +
      `missing=[${extras.qrisk.missingData.join(",") || "—"}]\n`,
  );
  if (extras.screeningMatches.length === 0) {
    process.stdout.write(`│   · screening matches: —\n`);
  } else {
    for (const s of extras.screeningMatches) {
      process.stdout.write(
        `│   · screening: ${s.screeningType} (${s.status})\n`,
      );
    }
  }
  for (const r of extras.recommendations.slice(0, 3)) {
    process.stdout.write(`│   · rec [${r.priority}]: ${r.title}\n`);
  }

  process.stdout.write("\n┌─ STEP 4 ─ Renderer (GLM) → patient-facing card\n");
  process.stdout.write("│  (using the seam assessment — renderer's frozen contract)\n");
  const card = await renderAssessment(seam);
  process.stdout.write(`│  headline : ${card.headline}\n`);
  process.stdout.write(`│  body     : ${card.body}\n`);
  process.stdout.write(`│  next_step: ${card.next_step}\n`);
  if (card.services.length === 0) {
    process.stdout.write(`│  services : —\n`);
  } else {
    for (const s of card.services) {
      process.stdout.write(`│  service  : ${s.type} — ${s.name}\n`);
    }
  }
  process.stdout.write("\nDone.\n");
}

main().catch((err) => {
  process.stderr.write(`demo-mock-profile failed: ${String(err)}\n`);
  process.exit(1);
});
