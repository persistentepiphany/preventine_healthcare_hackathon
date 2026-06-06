# `src/rules/` — deterministic rules engine seam

This directory is the **boundary** between the three tracks of the project:

1. **Ingestion adapter** (parallel Claude track) — produces a `LocalPreventiveContext`.
2. **Rules engine** (separate component) — consumes `LocalPreventiveContext`, applies NICE/NHS-grounded logic, **produces a `PreventiveAssessment`**. This is the file it lives in.
3. **Rendering layer** (this codebase, `src/rendering/`) — consumes `PreventiveAssessment` and emits patient-facing UI cards via z.ai / GLM-5.1.

`types.ts` is the only file in this directory right now. Its `PreventiveAssessment` shape is **frozen** — extending it requires coordinating with all three tracks.

When the rules engine arrives, drop its implementation into this directory and export a function with signature:

```ts
import type { PreventiveAssessment } from "./types.js";

export function assessPreventiveRoute(
  patient: PatientInput,
  context: LocalPreventiveContext
): PreventiveAssessment;
```

The rendering layer will not need to change.
