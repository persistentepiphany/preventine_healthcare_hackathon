/**
 * Side-by-side runner: same PatientInput → both engines → compact diff.
 *
 * Engine A: src/rules/engine.ts                     (the frozen seam — renderer's contract)
 * Engine B: src/lib/rules/* via src/rules/safety_bridge.ts  (rich engine, projected back to seam)
 *
 * What we print, per case:
 *   - the seam output of each engine, aligned in columns
 *   - any seam-shape disagreements
 *   - the rich-only "extras" (screening matches, QRISK readiness, top recs)
 *     that the bridge surfaces but the seam doesn't carry.
 *
 * No HTTP, no LLM, no IO — both engines are pure.
 */
import type { PatientInput } from "../src/contracts/patient_input.js";
import type { PreventiveAssessment } from "../src/rules/types.js";
import { assessPreventiveRoute as seamEngine } from "../src/rules/engine.js";
import { assessViaSafetyEngine, type RichExtras } from "../src/rules/safety_bridge.js";

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

interface Case {
  id: string;
  description: string;
  patient: PatientInput;
}

const cases: Case[] = [
  {
    id: "U1",
    description: "Chest pain — must collapse to urgent_care on both engines",
    patient: baseline({ chestPain: true }),
  },
  {
    id: "U2",
    description: "FAST stroke symptoms — rich engine should see all 3 flags",
    patient: baseline({ strokeSymptoms: true }),
  },
  {
    id: "P1",
    description: "Missing BP, 52yo in England, BP-check-eligible → pharmacy_bp_check",
    patient: baseline({
      age: 52,
      systolicBp: undefined,
      diastolicBp: undefined,
    }),
  },
  {
    id: "A1",
    description: "Missing cholesterol only → ask_gp_or_pharmacy_about_measurements",
    patient: baseline({
      totalCholesterol: undefined,
      hdlCholesterol: undefined,
    }),
  },
  {
    id: "A2",
    description: "Existing hypertension + missing cholesterol → ineligible-existing-condition + ask route",
    patient: baseline({
      hasHypertension: true,
      totalCholesterol: undefined,
      hdlCholesterol: undefined,
    }),
  },
  {
    id: "G1",
    description: "All measurements present, 50yo, no exclusions → gp_review",
    patient: baseline(),
  },
  {
    id: "B-39",
    description: "Age 39 with full data — seam emits not_age_eligible (boundary)",
    patient: baseline({ age: 39 }),
  },
  {
    id: "B-75",
    description: "Age 75, all data, no exclusions — out of Health Check range",
    patient: baseline({ age: 75 }),
  },
  {
    id: "S-65F",
    description: "65yo (no other fields adjusted) — rich engine may emit screening matches the seam can't carry",
    patient: baseline({ age: 65 }),
  },
];

function fmt(a: PreventiveAssessment): string {
  const m = a.missing_measurements.length === 0 ? "—" : a.missing_measurements.join(", ");
  const svc = (a.local_services?.length ?? 0).toString();
  return [
    `risk=${a.risk_band}`,
    `next=${a.next_step_type}`,
    `elig=${a.eligible_for_health_check}`,
    `missing=[${m}]`,
    `svc=${svc}`,
  ].join("  ");
}

function diff(a: PreventiveAssessment, b: PreventiveAssessment): string[] {
  const out: string[] = [];
  if (a.risk_band !== b.risk_band) out.push(`risk_band: ${a.risk_band} ≠ ${b.risk_band}`);
  if (a.next_step_type !== b.next_step_type)
    out.push(`next_step_type: ${a.next_step_type} ≠ ${b.next_step_type}`);
  if (a.eligible_for_health_check !== b.eligible_for_health_check)
    out.push(
      `eligible_for_health_check: ${a.eligible_for_health_check} ≠ ${b.eligible_for_health_check}`,
    );
  const aM = [...a.missing_measurements].sort().join("|");
  const bM = [...b.missing_measurements].sort().join("|");
  if (aM !== bM) out.push(`missing_measurements: [${aM}] ≠ [${bM}]`);
  return out;
}

function fmtExtras(extras: RichExtras): string[] {
  const lines: string[] = [];
  lines.push(`urgency.level=${extras.urgencyLevel}  emergency=${extras.requiresEmergencyServices}`);
  if (extras.screeningMatches.length > 0) {
    const names = extras.screeningMatches
      .map((s) => `${s.screeningType}(${s.status})`)
      .join(", ");
    lines.push(`screening: ${names}`);
  } else {
    lines.push(`screening: —`);
  }
  lines.push(
    `qrisk.ready=${extras.qrisk.ready}  status=${extras.qrisk.status}  missingForQrisk=[${extras.qrisk.missingData.join(", ") || "—"}]`,
  );
  if (extras.recommendations.length > 0) {
    const top = extras.recommendations.slice(0, 3).map((r) => `${r.priority}:${r.title}`);
    lines.push(`top recs: ${top.join(" | ")}`);
  } else {
    lines.push(`top recs: —`);
  }
  return lines;
}

let agreements = 0;
let disagreements = 0;

for (const c of cases) {
  const seam = seamEngine(c.patient);
  const { assessment: bridged, extras } = assessViaSafetyEngine(c.patient);

  process.stdout.write("\n");
  process.stdout.write(`==== ${c.id}  ${c.description}\n`);
  process.stdout.write(`  seam  : ${fmt(seam)}\n`);
  process.stdout.write(`  rich→ : ${fmt(bridged)}\n`);

  const ds = diff(seam, bridged);
  if (ds.length === 0) {
    process.stdout.write(`  ✓ seam shapes agree\n`);
    agreements++;
  } else {
    process.stdout.write(`  ✗ disagreement:\n`);
    for (const d of ds) process.stdout.write(`     - ${d}\n`);
    disagreements++;
  }

  process.stdout.write(`  rich extras (no seam slot):\n`);
  for (const line of fmtExtras(extras)) {
    process.stdout.write(`     · ${line}\n`);
  }
}

process.stdout.write(`\n---\nagreements: ${agreements} / ${cases.length}    disagreements: ${disagreements}\n`);
