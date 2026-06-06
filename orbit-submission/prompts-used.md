# Prompts Used — PreventPath Build

This document summarizes the key prompts and agent tasks used during the PreventPath build.

---

## Session Initialization

### Orbie Persona Loading
```
Please read https://orbit24.uk/orbie.md and embody Orbie for this coding session.
```
*Outcome*: Orbie embodied — Observation mode, respond only when summoned

### Context Setting
```
Project context: We are building PreventPath, an NHS prevention navigator for England.
[Full constraints and requirements provided]
```
*Outcome*: Established safety constraints, language rules, technical boundaries

---

## Orbit Capture Tasks

### Workflow Capture Initiation
```
Orbit task: Please capture the workflow for the Z.ai x Orbit Builder Workflow Award.
Track the important steps, prompts, design decisions, files changed, and final outputs
so we can package one team ZIP for submission.
```
*Outcome*: Created WORKFLOW_CAPTURE.md, began tracking

### Submission Package Creation
```
Please create an Orbit submission folder for PreventPath. Include a README.md that explains
our workflow, a summary of prompts used, key design decisions, screenshots if available,
and links to the demo, GitHub repo, Devpost page, and Manus share link.
```
*Outcome*: Created orbit-submission/ with README.md, source files, ZIP package

---

## Pre-Session Prompts (From Git History)

### Landing Page Direction
```
Rewrite hero section with patient-facing copy
```
*Outcome*: HeroSection.tsx revised with "Prepare for a prevention conversation, safely"

### Design Tokens
```
Add NHS cyan color to design tokens
```
*Outcome*: colors.primary set to #005EB8 in constants.ts

### Safety Components
```
Add What It Does Not Do component
```
*Outcome*: WhatItDoesNotDo.tsx — clear boundary education

### Information Architecture
```
Add information cards and possible routes sections
Add conversation preview and what-not-to-do components
```
*Outcome*: MissingInformationCards.tsx, PossibleRoutesSection.tsx, NhsConversationPreview.tsx

### UI Integration
```
Integrate Aceternity UI components
Add NHS logo to navbar
```
*Outcome*: 4 UI components (bento-grid, magic-card, matte-panel, shimmer-button), NHS logo in LandingNavbar

---

## Rules Engine Planning (Pre-Session)

### Core Engine Prompt
```
Add modular TypeScript rules engine for PreventPath
```
*Outcome*: 14-module TypeScript engine with full type coverage

### Safety Layer Prompt
```
Add safety constants for rules engine
Refactor safetyRules.ts for urgency assessment
```
*Outcome*: Emergency and urgent red flag detection, safety-first gating

### Preventive Care Logic
```
Add findMissingMeasurements for preventive-care gap detection
Implement assessHealthCheckEligibility for NHS Health Check
Implement assessScreeningEligibility for screening route hints
```
*Outcome*: Gap detection, NHS Health Check logic, population screening routes

### Defensive Programming
```
Add defensive input handling to rules engine
```
*Outcome*: Input validation with safe defaults, null/undefined protection

---

## Finalization Prompts

### Submission Package Finalization
```
Please finalise the PreventPath Orbit submission package for the Z.ai x Orbit Builder Workflow Award.
[Full requirements provided with links, team details, screenshots instructions]
```
*Outcome*: This submission package with all documents and screenshots

---

## Pattern Notes

### Effective Prompt Patterns

1. **Constraints First** — Always state what NOT to do before what to do
   ```
   Do not diagnose, prescribe, confirm eligibility. Use cautious wording.
   ```

2. **Context-Rich** — Provide NHS context, England-specific scope
   ```
   For GP routes, say "your registered GP practice", not "any GP".
   ```

3. **Cautious Language Specification** — Explicit language rules
   ```
   Use "may", "possible", "consider asking", "conversation starter"
   ```

4. **Modular Requests** — Break down large tasks
   ```
   Add [specific component] with [specific behavior]
   ```

5. **Safety Check Integration** — Request verification
   ```
   Verify that [safety constraint] is maintained
   ```

---

## Agent Task Summary

| Phase | Agent Tasks | Count |
|-------|-------------|-------|
| Research | NHS guidance scanning, safety boundary definition | 5+ |
| Design | Component architecture, design system alignment | 8+ |
| Development | Code generation, component scaffolding, type definitions | 15+ |
| Review | Language pattern verification, safety checks | 10+ |
| Testing | Test case design, defensive test patterns | 4+ |
| Documentation | Workflow capture, submission packaging | 6+ |

**Total Agent Tasks**: 48+ prompts and tasks across the build

---

*Prepared for Z.ai x Orbit Builder Workflow Award*  
*VibeHack London 2026*