# PreventPath — Orbit Submission

## Overview

**PreventPath** is an NHS prevention navigator for England. It helps users understand what preventive health information may be missing, see possible NHS service routes, and prepare a copyable summary for a conversation with their registered GP practice, a participating community pharmacy, or another appropriate NHS service.

**Event**: VibeHack London 2026
**Award**: Z.ai x Orbit Builder Workflow Award
**Date Built**: June 6, 2026

---

## Live Links

- **Demo URL**: [To be added — please insert deployed URL]
- **GitHub Repo**: [To be added — please insert repo URL]
- **Devpost Page**: [To be added — please insert Devpost URL]
- **Manus Share**: [To be added — please insert Manus link]

---

## Workflow Summary

### Phase 1: Rules Engine Architecture (Pre-Session)

**Branch**: `rules-engine-safety`

Built a type-safe, deterministic rules engine with safety guardrails at every step. No LLM calls, no NHS API integration, no risk score calculations.

**Key Files Created**:
- `src/lib/rules/index.ts` — Main exports
- `src/lib/rules/types.ts` — TypeScript contracts (500+ lines)
- `src/lib/rules/constants.ts` — Safety constants
- `src/lib/rules/safetyRules.ts` — Emergency/urgent red flag detection
- `src/lib/rules/missingMeasurements.ts` — Preventive-care gap detection
- `src/lib/rules/healthCheckEligibility.ts` — NHS Health Check logic
- `src/lib/rules/screeningEligibility.ts` — Population screening routes
- `src/lib/rules/qriskReadiness.ts` — Educational QRISK readiness (no score)
- `src/lib/rules/recommendations.ts` — Recommendation cards
- `src/lib/rules/gpSummary.ts` — Copyable GP text builder
- `src/lib/rules/assessPreventiveRoute.ts` — Main orchestrator
- `src/lib/rules/validation.ts` — Input validation
- `src/lib/rules/demoCases.ts` — Test cases
- `src/lib/rules/finalReviewTest.ts` — Integration tests
- `src/lib/rules/testDefensive.ts` — Defensive tests

### Phase 2: Frontend Landing Page (Pre-Session)

**Branch**: `feature/landing-page`

Built a patient-facing landing page with careful attention to NHS-safe language and visual hierarchy.

**Components Created** (24 components total):

**Core Layout**:
- `src/app/layout.tsx` — App layout with fonts
- `src/app/page.tsx` — Main landing page assembly
- `src/app/globals.css` — Tailwind + custom styling

**Navigation & Branding**:
- `LandingNavbar.tsx` — Healthcare-friendly navbar with NHS logo
- `LandingFooter.tsx` — Footer with legal and safety notices

**Hero Section**:
- `HeroSection.tsx` — Main value proposition with SVG journey diagram

**Educational Sections**:
- `CareJourneyDiagram.tsx` — Visual process flow
- `PreventionRouteDiagram.tsx` — NHS service routes visualization
- `SafetyFirstPanel.tsx` — Urgent vs routine prevention distinction
- `SafetyTrustStrip.tsx` — Trust indicators
- `SafetyGateDiagram.tsx` — Safety layer visualization
- `WhatItDoesNotDo.tsx` — Boundary education
- `WhatWeDoNotDoStrip.tsx` — Compact boundary strip
- `TechAndRulesSection.tsx` — Technical safety explanation
- `RulesEngineFlow.tsx` — Rules engine diagram
- `ServiceRouteMap.tsx` — Service navigation map

**Interactive Elements**:
- `MissingInformationCards.tsx` — Data gap cards
- `PossibleRoutesSection.tsx` — NHS route options
- `CopyableSummaryPreview.tsx` — Conversation starter preview
- `NhsConversationPreview.tsx` — GP conversation template
- `FinalCTASection.tsx` — Call to action
- `QriskReadinessLock.tsx` — QRISK educational gate
- `MissingMeasurementsGrid.tsx` — Measurement grid

**UI Components** (Aceternity UI integration):
- `ui/bento-grid.tsx`
- `ui/magic-card.tsx`
- `ui/matte-panel.tsx`
- `ui/shimmer-button.tsx`

### Phase 3: Orbit Capture (Session)

Created workflow documentation and submission package for the Z.ai x Orbit Builder Workflow Award.

---

## Prompts Used

### Landing Page Development
*(Summarized from git commit history)*

1. **Hero Section Rewrite**
   > "Rewrite hero section with patient-facing copy"

2. **Safety Language**
   > "Add NHS cyan color to design tokens"
   > "Add What It Does Not Do component"

3. **Information Architecture**
   > "Add information cards and possible routes sections"
   > "Add conversation preview and what-not-to-do components"

4. **UI Integration**
   > "Integrate Aceternity UI components"
   > "Add NHS logo to navbar"

5. **Structural Refactors**
   > "Restructure landing page for patient experience"
   > "Update final CTA and footer"

### Rules Engine Development
*(From early commit history)*

1. **Core Engine**
   > "Add modular TypeScript rules engine for PreventPath"

2. **Safety Layer**
   > "Add safety constants for rules engine"
   > "Refactor safetyRules.ts for urgency assessment"

3. **Preventive Care Logic**
   > "Add findMissingMeasurements for preventive-care gap detection"
   > "Implement assessHealthCheckEligibility for NHS Health Check"
   > "Implement assessScreeningEligibility for screening route hints"

4. **Defensive Programming**
   > "Add defensive input handling to rules engine"

---

## Key Design Decisions

| Decision | Context | Rationale |
|----------|---------|-----------|
| **Cautious Language Only** | All user-facing copy | Never state "you are eligible", "you need", "you have risk", or make diagnoses. Use "may", "possible", "consider asking" |
| **Safety Gate First** | Rules engine architecture | Safety/urgency assessment runs BEFORE all routine prevention logic. Red flags = immediate routing advice |
| **No QRISK Calculation** | QRISK readiness module | Only assess if sufficient data exists for QRISK. Never calculate or display risk score |
| **"Registered GP Practice"** | All GP route references | Avoids suggesting users can access any GP. Must use their registered practice |
| **Separate Urgent Care** | Information architecture | Keep urgent/acute symptoms distinctly separate from routine prevention routes |
| **Deterministic Logic Only** | Rules engine choice | No LLM calls, no fuzzy matching. Pure TypeScript functions for reproducible outputs |
| **Local Processing** | Privacy architecture | No data leaves user's device during assessment |
| **NHS Cyan (#005EB8)** | Primary color | Aligns with NHS brand identity for trust and recognition |
| **Dark Mode Base** | Design system | Linear-inspired dark theme (#0A0E14) with high contrast for accessibility |
| **Component Library** | UI choice | Aceternity UI + custom components for polished, modern feel without heavy dependencies |
| **Type Safety** | TypeScript strategy | Full type coverage with strict types for all rules engine inputs/outputs |

---

## Technical Architecture

```
PreventPath/
├── src/lib/rules/              # Rules Engine (TypeScript)
│   ├── index.ts                # Main exports
│   ├── types.ts                # 500+ lines of type contracts
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
│   ├── demoCases.ts
│   ├── finalReviewTest.ts
│   └── testDefensive.ts
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── globals.css
    │   │   └── fonts/
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
    │   │   ├── FinalCTASection.tsx
    │   │   ├── CopyableSummaryPreview.tsx
    │   │   ├── TechAndRulesSection.tsx
    │   │   ├── RulesEngineFlow.tsx
    │   │   ├── SafetyGateDiagram.tsx
    │   │   ├── ServiceRouteMap.tsx
    │   │   ├── QriskReadinessLock.tsx
    │   │   ├── MissingMeasurementsGrid.tsx
    │   │   ├── PreventionRouteDiagram.tsx
    │   │   ├── SafetyTrustStrip.tsx
    │   │   └── ui/
    │   │       ├── bento-grid.tsx
    │   │       ├── magic-card.tsx
    │   │       ├── matte-panel.tsx
    │   │       └── shimmer-button.tsx
    │   └── lib/
    │       ├── constants.ts    # Design tokens
    │       └── copy.ts         # NHS-safe copy
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    └── next.config.mjs
```

---

## Constraints Adhered To

✅ No diagnosis, prescribing, or treatment advice
✅ No eligibility confirmation (only "possibly eligible")
✅ No clinical risk calculations
✅ No appointment booking
✅ No NHS advice replacement
✅ Cautious wording: "may", "possible", "consider asking", "conversation starter"
✅ "Your registered GP practice" (not "any GP")
✅ Urgent care separated from routine prevention routes
✅ `src/lib/rules` not modified without explicit request

---

## Screenshots

*[Note: Screenshots should be added here. Include:]*
- Hero section
- Safety first panel
- Missing information cards
- Possible routes section
- Conversation preview
- Mobile responsive views

---

## Team

**Event**: VibeHack London 2026
**Lens**: Z.ai x Orbit

---

## License

[NHS Source Code License — see LICENSE file in repository]

---

*Submission prepared with Orbie — Orbit's on-site companion for VibeHack London 2026*