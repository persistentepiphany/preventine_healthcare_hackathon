/**
 * Second-pass investigation. Six new edge cases not covered by the original
 * adversarial set, plus a 3-call determinism check at temperature=0. Writes
 * zai-investigate-results.md.
 */

import { writeFile } from "node:fs/promises";
import { renderAssessment } from "../src/rendering/render.js";
import { ZaiHttpClient, type ZaiClient } from "../src/rendering/zai_client.js";
import type { PreventiveAssessment } from "../src/rules/types.js";
import { isCardJson, type CardJson } from "../src/rendering/card_schema.js";
import {
  containsForbiddenToken,
  validateAssessment,
} from "../src/rendering/guardrails.js";

const EDGE_CASES: { name: string; input: PreventiveAssessment; expect: string }[] = [
  {
    name: "E1. Low risk reassurance — all measurements present, possibly eligible, gp_review",
    input: {
      risk_band: "low",
      missing_measurements: [],
      eligible_for_health_check: "possibly",
      next_step_type: "gp_review",
      forbidden_claims: [],
    },
    expect:
      "Positive/reassuring tone. Mentions booking a GP appointment. May mention Health Check. No alarm. No invented numbers.",
  },
  {
    name: "E2. Multiple local_services (pharmacy + GP)",
    input: {
      risk_band: "incomplete",
      missing_measurements: ["blood pressure"],
      eligible_for_health_check: "possibly",
      next_step_type: "pharmacy_bp_check",
      local_services: [
        { name: "Boots Pharmacy, Wilmslow Road", type: "pharmacy" },
        { name: "Rusholme Health Centre", type: "gp" },
      ],
      forbidden_claims: [],
    },
    expect: "Pharmacy-BP framing. Both services copied verbatim into the services array.",
  },
  {
    name: "E3. local_services key omitted entirely",
    input: {
      risk_band: "moderate",
      missing_measurements: [],
      eligible_for_health_check: "possibly",
      next_step_type: "ask_gp_or_pharmacy_about_measurements",
      forbidden_claims: [],
    },
    expect: "services: [] in output. No fabricated service.",
  },
  {
    name: "E4. Welsh-named pharmacy (Latin Extended) — guardrail must accept, name preserved",
    input: {
      risk_band: "incomplete",
      missing_measurements: ["blood pressure"],
      eligible_for_health_check: "possibly",
      next_step_type: "pharmacy_bp_check",
      local_services: [{ name: "Fferyllfa Llwyd, Caerdydd", type: "pharmacy" }],
      forbidden_claims: [],
    },
    expect: "Service name preserved verbatim. Normal pharmacy-BP body.",
  },
  {
    name: "E5. Long missing_measurements list (4 items)",
    input: {
      risk_band: "incomplete",
      missing_measurements: ["blood pressure", "cholesterol", "BMI", "smoking status"],
      eligible_for_health_check: "possibly",
      next_step_type: "ask_gp_or_pharmacy_about_measurements",
      forbidden_claims: [],
    },
    expect: "Lists or summarises all four. No invented values. Mentions GP/pharmacy.",
  },
  {
    name: "E6. gp_review with missing measurement + not_eligible_existing_condition",
    input: {
      risk_band: "moderate",
      missing_measurements: ["cholesterol"],
      eligible_for_health_check: "not_eligible_existing_condition",
      next_step_type: "gp_review",
      forbidden_claims: [],
    },
    expect:
      "Book a GP appointment. NHS Health Check NOT offered as a route. May mention cholesterol missing.",
  },
];

function wc(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

interface EdgeResult {
  name: string;
  input: PreventiveAssessment;
  expect: string;
  raw: string;
  rawCard?: CardJson;
  finalCard: CardJson;
  headlineWords: number;
  bodyWords: number;
  nextStepWords: number;
  headlineOk: boolean;
  bodyOk: boolean;
  forbiddenToken: string | null;
  servicesNamesMatchInput: boolean;
  ukSpellingObservations: string[];
  notes: string[];
}

const UK_VS_US: { uk: RegExp; us: RegExp; label: string }[] = [
  { uk: /\bpersonalised?\b/i, us: /\bpersonalized?\b/i, label: "personali[sz]ed" },
  { uk: /\bcolour\b/i, us: /\bcolor\b/i, label: "colour/color" },
  { uk: /\bbehaviour\b/i, us: /\bbehavior\b/i, label: "behaviour/behavior" },
  { uk: /\bfibre\b/i, us: /\bfiber\b/i, label: "fibre/fiber" },
  { uk: /\borganis(e|ed|ing|ation)\b/i, us: /\borganiz(e|ed|ing|ation)\b/i, label: "organis/organiz" },
  { uk: /\brecognise(d|s)?\b/i, us: /\brecognize(d|s)?\b/i, label: "recognis/recogniz" },
  { uk: /\bcentre\b/i, us: /\bcenter\b/i, label: "centre/center" },
];

function ukSpellingNotes(text: string): string[] {
  const out: string[] = [];
  for (const r of UK_VS_US) {
    const hasUs = r.us.test(text);
    if (hasUs) out.push(`US spelling found: ${r.label}`);
  }
  return out;
}

async function runEdge(
  client: ZaiClient,
  ec: (typeof EDGE_CASES)[number],
): Promise<EdgeResult> {
  let raw = "";
  const loggingClient: ZaiClient = {
    complete: async (u: string) => {
      raw = await client.complete(u);
      return raw;
    },
  };
  const finalCard = await renderAssessment(ec.input, { client: loggingClient });

  let rawCard: CardJson | undefined;
  try {
    const parsed = JSON.parse(raw);
    if (isCardJson(parsed)) rawCard = parsed;
  } catch {
    /* leave undefined */
  }

  const headline = rawCard?.headline ?? finalCard.headline;
  const body = rawCard?.body ?? finalCard.body;
  const nextStep = rawCard?.next_step ?? finalCard.next_step;
  const isUrgent = ec.input.next_step_type === "urgent_care";

  const inputNames = (ec.input.local_services ?? []).map((s) => s.name).sort();
  const outputNames = (rawCard?.services ?? []).map((s) => s.name).sort();
  const servicesNamesMatchInput = JSON.stringify(inputNames) === JSON.stringify(outputNames);

  const text = `${headline}\n${body}\n${nextStep}`;
  const tok =
    containsForbiddenToken(headline) ??
    containsForbiddenToken(body) ??
    containsForbiddenToken(nextStep);

  const notes: string[] = [];
  if (!rawCard) notes.push("raw output did not parse as valid CardJson");

  return {
    name: ec.name,
    input: ec.input,
    expect: ec.expect,
    raw,
    ...(rawCard !== undefined ? { rawCard } : {}),
    finalCard,
    headlineWords: wc(headline),
    bodyWords: wc(body),
    nextStepWords: wc(nextStep),
    headlineOk: wc(headline) <= 8,
    bodyOk: wc(body) <= (isUrgent ? 30 : 60),
    forbiddenToken: tok,
    servicesNamesMatchInput,
    ukSpellingObservations: ukSpellingNotes(text),
    notes,
  };
}

async function determinism(client: ZaiClient): Promise<string[]> {
  const input: PreventiveAssessment = {
    risk_band: "incomplete",
    missing_measurements: ["blood pressure", "cholesterol"],
    eligible_for_health_check: "possibly",
    next_step_type: "ask_gp_or_pharmacy_about_measurements",
    forbidden_claims: ["your CVD risk is X%"],
  };
  const outputs: string[] = [];
  for (let i = 0; i < 3; i++) {
    const raw = await client.complete(JSON.stringify(input));
    outputs.push(raw);
  }
  return outputs;
}

async function main(): Promise<void> {
  const client = new ZaiHttpClient();

  const results: EdgeResult[] = [];
  for (let i = 0; i < EDGE_CASES.length; i++) {
    const ec = EDGE_CASES[i]!;
    process.stdout.write(`[edge ${i + 1}/${EDGE_CASES.length}] ${ec.name} … `);
    const v = validateAssessment(ec.input);
    if (!v.ok) {
      process.stdout.write(`pre-LLM blocked (${v.reason})\n`);
      continue;
    }
    const r = await runEdge(client, ec);
    results.push(r);
    process.stdout.write(
      `hl=${r.headlineWords}w body=${r.bodyWords}w tok=${r.forbiddenToken ?? "—"}\n`,
    );
  }

  process.stdout.write("\n[determinism] 3 calls on same input … ");
  const detOutputs = await determinism(client);
  const allIdentical = detOutputs.every((o) => o === detOutputs[0]);
  process.stdout.write(allIdentical ? "identical\n" : "VARIES\n");

  // ---------- markdown report ----------
  const md: string[] = [];
  md.push("# z.ai / GLM-5.1 deeper investigation");
  md.push("");
  md.push(`Last run: **${new Date().toISOString()}**.`);
  md.push("");
  md.push("Six new edge cases probing combinations the original adversarial set didn't cover, plus a 3-call determinism check at `temperature=0`.");
  md.push("");
  md.push("## Edge-case summary");
  md.push("");
  md.push("| # | Case | hl words (≤8) | body words (≤60 / ≤30 urgent) | next words | forbidden tok | services match input | UK spellings |");
  md.push("|---|------|---------------|-------------------------------|------------|---------------|----------------------|--------------|");
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    const isUrgent = r.input.next_step_type === "urgent_care";
    md.push(
      `| E${i + 1} | ${r.name.split(". ").slice(1).join(". ")} | ${r.headlineWords} ${r.headlineOk ? "✓" : "✗"} | ${r.bodyWords}/${isUrgent ? 30 : 60} ${r.bodyOk ? "✓" : "✗"} | ${r.nextStepWords} | ${r.forbiddenToken ?? "—"} | ${r.servicesNamesMatchInput ? "✓" : "✗"} | ${r.ukSpellingObservations.length === 0 ? "clean" : r.ukSpellingObservations.join("; ")} |`,
    );
  }
  md.push("");
  md.push("## Determinism (3 calls, same input, temperature=0)");
  md.push("");
  md.push(`- All three outputs identical: **${allIdentical ? "yes" : "no"}**`);
  if (!allIdentical) {
    md.push("");
    for (let i = 0; i < detOutputs.length; i++) {
      md.push(`### Run ${i + 1}`);
      md.push("```json");
      md.push(detOutputs[i]!);
      md.push("```");
    }
  } else {
    md.push("");
    md.push("```json");
    md.push(detOutputs[0]!);
    md.push("```");
  }
  md.push("");
  md.push("## Per-case raw outputs");
  md.push("");
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    md.push(`### ${r.name}`);
    md.push("");
    md.push("Input:");
    md.push("```json");
    md.push(JSON.stringify(r.input, null, 2));
    md.push("```");
    md.push(`Expected behaviour: ${r.expect}`);
    md.push("");
    md.push("Raw model output:");
    md.push("```json");
    md.push(r.raw);
    md.push("```");
    md.push("Final card:");
    md.push("```json");
    md.push(JSON.stringify(r.finalCard, null, 2));
    md.push("```");
    if (r.notes.length) md.push(`Notes: ${r.notes.join("; ")}`);
    md.push("");
  }

  await writeFile("zai-investigate-results.md", md.join("\n"), "utf8");
  console.log("Wrote zai-investigate-results.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
