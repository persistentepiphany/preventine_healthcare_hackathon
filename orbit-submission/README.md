# PreventPath Orbit Submission

## Overview

PreventPath is an NHS prevention navigator for England. It helps users understand what preventive health information may be missing, see possible NHS service routes, and prepare a copyable conversation summary.

**Event**: VibeHack London 2026  
**Award**: Z.ai x Orbit Builder Workflow Award  
**Date**: June 6, 2026

---

## What the Project Does

PreventPath guides users through routine prevention questions, identifies possible missing information, separates urgent safety concerns from routine prevention, and suggests possible next routes such as:

- Contacting your registered GP practice
- Checking GP registration status
- Asking about participating community pharmacy services
- Checking screening invitation status
- Understanding NHS Health Check eligibility

The platform uses cautious language throughout — "may," "possible," "consider asking," "conversation starter" — to avoid diagnostic framing while still being useful for patient preparation.

---

## What the Project Does Not Do

PreventPath does not:

- Diagnose medical conditions
- Prescribe treatments or medications
- Confirm eligibility for NHS services
- Book appointments
- Calculate clinical risk scores for users
- Replace NHS advice

All clinical decisions remain with NHS healthcare professionals. PreventPath is a preparation and navigation tool, not a diagnostic or triage service.

---

## How AI Supported the Workflow

AI supported the PreventPath build across multiple areas, **but the clinical-facing logic remained rule-based**:

| Area | AI Support |
|------|------------|
| **Research** | NHS prevention pathways, screening schedules, service routing |
| **Product framing** | Safety boundaries, cautious language patterns |
| **Safe wording review** | Checking copy against NHS-aligned constraints |
| **Interface iteration** | Landing page components, visual diagrams |
| **Landing-page direction** | Patient-first information architecture |
| **Rule-engine planning** | TypeScript module structure, safety guardrails |
| **Workflow capture** | Documenting the build process for Orbit submission |

**Clinical logic is deterministic** — pure TypeScript rules with no LLM inference for patient-facing decisions. Urgency assessment, missing measurements, and eligibility checks all run through deterministic functions with defined inputs and outputs.

---

## Key Links

| Link | URL |
|------|-----|
| **Live Demo (Video)** | https://youtu.be/_jwiqHJrHTY |
| **GitHub Repository** | https://github.com/persistentepiphany/preventine_healthcare_hackathon |
| **Devpost Page** | https://devpost.com/software/preventpath |
| **Manus Share** | https://manus.im/share/UM6x39r0LkmulzzDmYN8O3 |

---

## Team

- Istiaq
- Hein
- Max

---

## Project Structure

```
PreventPath/
├── src/lib/rules/              # Rules Engine (TypeScript)
│   ├── index.ts                # Main exports
│   ├── types.ts                # TypeScript contracts
│   ├── safetyRules.ts          # Emergency/urgent detection
│   ├── constants.ts            # Safety constants
│   ├── missingMeasurements.ts  # Gap detection
│   ├── healthCheckEligibility.ts
│   ├── screeningEligibility.ts
│   ├── qriskReadiness.ts       # Educational only
│   ├── recommendations.ts
│   ├── gpSummary.ts            # Copyable text builder
│   ├── assessPreventiveRoute.ts
│   ├── validation.ts
│   └── test files...
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── globals.css
    │   ├── components/         # 24 components
    │   │   ├── LandingNavbar.tsx
    │   │   ├── LandingFooter.tsx
    │   │   ├── HeroSection.tsx
    │   │   ├── CareJourneyDiagram.tsx
    │   │   ├── SafetyFirstPanel.tsx
    │   │   ├── WhatItDoesNotDo.tsx
    │   │   ├── MissingInformationCards.tsx
    │   │   ├── PossibleRoutesSection.tsx
    │   │   ├── NhsConversationPreview.tsx
    │   │   └── ... (plus UI components)
    │   └── lib/
    │       ├── constants.ts    # Design tokens
    │       └── copy.ts         # NHS-safe copy
```

---

## Screenshots

See `screenshots/final/` for 6 screenshots from the demo video:

1. **Opening Dashboard** — Initial landing view
2. **Prevention Inputs** — Data entry interface
3. **Prevention Report** — Results display
4. **QRisk Readiness and Vitals** — Educational readiness gate
5. **Possible Local Routes** — NHS service navigation
6. **Route Detail and Summary** — Copyable conversation starter

---

## Safety Framework

### Language Constraints

All user-facing copy adheres to:
- "may" instead of "you are eligible"
- "possible" instead of "you need"
- "consider asking" instead of action directives
- "conversation starter" rather than "plan"

### Safety Gates

1. **Urgency First**: Emergency/urgent red-flag assessment runs BEFORE routine prevention logic
2. **Registered GP**: All GP routes specify "your registered GP practice," not any GP
3. **Separate Urgent Care**: Acute symptoms distinctly separated from routine prevention
4. **No Risk Scores**: QRISK readiness is educational only — no score calculation or display

### Technical Safeguards

- Deterministic rules engine (no LLM inference on clinical decisions)
- Type-safe TypeScript throughout
- Defensive input handling with validation
- Local processing (no data leaves user device)

---

## Technical Architecture

**Frontend**: Next.js 14 + TypeScript + Tailwind CSS  
**UI Library**: Aceternity UI + Lucide React  
**Rules Engine**: Pure TypeScript (14 modules)  
**Design System**: NHS cyan (#005EB8) + Linear-inspired dark theme

---

## Supporting Documents

- `workflow-summary.md` — How AI agents supported the build
- `prompts-used.md` — Key prompts and agent tasks
- `design-decisions.md` — Main product and safety decisions
- `links.md` — Complete link list and team details

---

*Submission prepared for Z.ai x Orbit Builder Workflow Award*  
*VibeHack London 2026*