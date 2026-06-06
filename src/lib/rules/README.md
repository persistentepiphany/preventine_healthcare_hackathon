# `src/lib/rules/` — modular rules-safety engine

Originally from the `rules-engine-safety` branch. **Now wired in** via the
bridge at `src/rules/safety_bridge.ts` — see "How the two engines interact"
below.

## What's in here

- `safetyRules.ts` — broader red-flag taxonomy (8 emergency flags, 7 urgent
  flags) than the seam's three booleans.
- `healthCheckEligibility.ts` — explanatory NHS Health Check eligibility.
- `missingMeasurements.ts` — keyed missing-measurement list with priorities.
- `qriskReadiness.ts` — QRISK readiness assessment (flags stale / missing
  inputs without computing a score).
- `screeningEligibility.ts` — population screening matches (cervical, breast,
  colorectal, AAA, diabetic eye).
- `recommendations.ts` — prioritized recommendation cards.
- `gpSummary.ts` — GP-summary text builder.
- `assessPreventiveRoute.ts` — orchestrator that runs all of the above.
- `validation.ts`, `constants.ts`, `types.ts` — supporting infrastructure.

Excluded from build (own internal type bugs against their own types):
`demoCases.ts`, `finalReviewTest.ts`, `testDefensive.ts`. Excluded in
`tsconfig.json`; not deleted in case the authors want to recover them.

## How the two engines interact

The renderer's contract is `src/rules/types.ts` (flat seam). The bridge:

1. Maps seam `PatientInput` → rich `PatientInput` (`smokingStatus: "current"`
   → `smoker: true`, three red-flag booleans → red-flag string list, derived
   `cholesterolRatio` from `totalCholesterol / hdlCholesterol`, etc.).
2. Calls the rich orchestrator (`assessPreventiveRoute`).
3. Projects the rich `PreventiveAssessment` back down to the flat seam shape
   — same `risk_band` / `next_step_type` / `eligible_for_health_check` /
   `missing_measurements` / `forbidden_claims` slots the renderer reads.
4. Returns rich-only extras (screening matches, QRISK readiness, recommendation
   cards, verbose urgency level) as a separate `extras` object that callers
   can surface without touching the seam.

Both engines are pure deterministic functions. They can be run side-by-side
on the same input as a second-opinion check.

## How to run side-by-side

```bash
npx tsx scripts/compare-engines.ts
```

The script runs nine canonical patients (urgent, pharmacy BP, ask-route,
GP-review, age boundaries) through **both** engines and prints any disagreement
on the seam shape plus the rich-only extras. Current state: 9/9 agree on the
seam shape, and the rich engine surfaces extra screening / QRISK / recommendation
signal on top.

## If you want to use the rich engine in production rendering

`safety_bridge.ts` already gives you a seam-compatible `PreventiveAssessment`
— you can drop it into the same renderer with no contract change. To do that:

```ts
import { assessViaSafetyEngine } from "../rules/safety_bridge.js";
// ... instead of ...
import { assessPreventiveRoute } from "../rules/engine.js";
```

The seam test (`test/seam.test.ts`) is the authoritative invariant — wire the
bridge through the renderer and run the live z.ai suite to confirm cards still
land in their expected lanes.
