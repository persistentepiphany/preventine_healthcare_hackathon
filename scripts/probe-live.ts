/**
 * Live smoke probe. Boots the dispatcher in-process (no HTTP), drives
 * `/api/nhs/context` against 3 postcodes × 3 modes, and prints a single
 * dataQuality + latency table. Use it before a demo to confirm every
 * upstream is in the state you expect.
 *
 *   npx tsx scripts/probe-live.ts
 *
 * Exit code: 0 if every postcode×mode returns status 200; 1 otherwise.
 */
import { dispatch } from "../src/http/router.js";

interface Probe {
  postcode: string;
  label: string;
  modes: ("demo" | "light" | "full")[];
}

const PROBES: Probe[] = [
  { postcode: "M13 9PL", label: "Manchester (canonical demo)", modes: ["demo", "light", "full"] },
  { postcode: "SW1A 1AA", label: "Westminster (London)", modes: ["demo", "light", "full"] },
  { postcode: "ZZ99 9ZZ", label: "Invalid (failure path)", modes: ["light"] },
];

interface Row {
  postcode: string;
  mode: string;
  status: number;
  ms: number;
  dq: Record<string, string>;
  hasIndicators: boolean;
  waitingPct: string | null;
}

async function probeOne(postcode: string, mode: "demo" | "light" | "full"): Promise<Row> {
  const t0 = Date.now();
  const query = new URLSearchParams({ postcode, mode });
  const r = await dispatch("GET", "/api/nhs/context", query, undefined);
  const ms = Date.now() - t0;
  const body = r.body as {
    dataQuality?: Record<string, string>;
    population?: { indicators?: unknown[] };
    waitingTimes?: { description?: string };
  };
  const desc = body.waitingTimes?.description ?? "";
  const pctMatch = desc.match(/(\d+\.\d+)%/);
  return {
    postcode,
    mode,
    status: r.status,
    ms,
    dq: body.dataQuality ?? {},
    hasIndicators: Array.isArray(body.population?.indicators) && (body.population!.indicators!.length > 0),
    waitingPct: pctMatch ? pctMatch[1] : null,
  };
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n);
  return s + " ".repeat(n - s.length);
}

async function main(): Promise<void> {
  const rows: Row[] = [];
  for (const probe of PROBES) {
    for (const mode of probe.modes) {
      const row = await probeOne(probe.postcode, mode);
      rows.push(row);
      process.stderr.write(`  ${probe.postcode} ${mode}: status=${row.status} ${row.ms}ms\n`);
    }
  }

  process.stdout.write("\n");
  process.stdout.write(
    pad("POSTCODE", 10) +
      pad("MODE", 7) +
      pad("STATUS", 8) +
      pad("LATENCY", 10) +
      pad("POSTC", 6) +
      pad("SRV", 18) +
      pad("WAIT", 18) +
      pad("CONTENT", 8) +
      pad("POP", 18) +
      pad("WAIT%", 8) +
      pad("IND?", 6) +
      "\n",
  );
  process.stdout.write("-".repeat(115) + "\n");
  for (const r of rows) {
    process.stdout.write(
      pad(r.postcode, 10) +
        pad(r.mode, 7) +
        pad(String(r.status), 8) +
        pad(`${r.ms}ms`, 10) +
        pad(r.dq.postcode ?? "-", 6) +
        pad(r.dq.services ?? "-", 18) +
        pad(r.dq.waitingTimes ?? "-", 18) +
        pad(r.dq.officialContent ?? "-", 8) +
        pad(r.dq.population ?? "-", 18) +
        pad(r.waitingPct ?? "-", 8) +
        pad(r.hasIndicators ? "yes" : "no", 6) +
        "\n",
    );
  }
  process.stdout.write("\n");

  const allOk = rows.every((r) => r.status === 200);
  process.stdout.write(allOk ? "[OK] every probe returned 200\n" : "[FAIL] some probes returned non-200\n");
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`probe failed: ${err}\n`);
  process.exit(1);
});
