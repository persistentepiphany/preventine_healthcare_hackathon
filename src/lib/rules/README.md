# `src/lib/rules/` — parked rules-safety modules

These files come from the `rules-engine-safety` branch and were merged into
`nhs_data_ingestion` so both teams' work lives in one tree.

**They are NOT wired into the demo.** `tsconfig.json` excludes `src/lib/**` from
the build, and the HTTP router still uses `src/rules/engine.ts` as the frozen
seam.

## Why parked, not deleted

This module implements a richer, more elaborate `PreventiveAssessment` shape
(nested `urgency` / `healthCheckEligibility` / `qrisk` / `recommendations` /
`gpSummary` / `safetyNotice` / `aiGuardrails` objects) plus modular sub-rules
(`safetyRules`, `validation`, `screeningEligibility`, `qriskReadiness`, etc.).
That logic is worth keeping — it's just incompatible with the seam the renderer
and tests already depend on (`src/rules/types.ts`, flat: `risk_band`,
`missing_measurements`, `eligible_for_health_check`, `next_step_type`,
`forbidden_claims`).

## Why excluded from `tsc`

Two reasons:

1. The files import without `.js` extensions, which `NodeNext` rejects.
2. Strict mode + `exactOptionalPropertyTypes` surface a number of latent
   issues in `demoCases.ts` / `finalReviewTest.ts` / `testDefensive.ts` that
   were not exercised by the rules-safety branch's looser tsconfig.

Both are fixable; neither is worth doing under hackathon pressure when the
demo path doesn't use this module.

## If you want to wire this in later

Two viable paths:

- **Adapter**: build a thin function that takes the rich `PreventiveAssessment`
  from `assessPreventiveRoute` here and projects it down to the frozen-seam
  shape the renderer expects. The renderer stays unchanged.
- **Replace**: change `src/rules/types.ts` to the rich shape, rewrite the
  renderer's `card_schema.ts` / `guardrails.ts` / `system_prompt.ts` against
  the new shape, and update every test. This is a much bigger change and would
  reopen the seam.

Either way, first re-include `src/lib/**` in `tsconfig.json`, add `.js`
extensions to the relative imports, and fix the demo-file type errors.
