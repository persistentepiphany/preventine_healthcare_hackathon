# PreventPath — Orbit Workflow Capture
## Z.ai x Orbit Builder Workflow Award
**Event**: VibeHack London 2026
**Date**: 2026-06-06
**Builder**: [TBA]
**Team**: [TBA]

---

## Project Snapshot

**Project Name**: PreventPath
**Mission**: NHS prevention navigator for England
**Tech Stack**:
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- UI Library: Aceternity UI + Framer Motion + Lucide React
- Rules Engine: TypeScript (separate module)

**Current Branch**: `feature/landing-page`
**Other Branches**: `main`, `rules-engine-safety`

---

## Workflow Timeline

### Phase 0: Discovery & Context Capture
**Time**: Session start (2026-06-06 ~20:37)

**User Provided Context**:
> We are building PreventPath, an NHS prevention navigator for England. It helps users understand what preventive health information may be missing, see possible NHS service routes, and prepare a copyable summary for a conversation with their registered GP practice, a participating community pharmacy, or another appropriate NHS service.

**Constraints Established**:
- Do not diagnose, prescribe, confirm eligibility, calculate clinical risk, book appointments, or replace NHS advice
- Use cautious wording: "may", "possible", "consider asking", "conversation starter"
- For GP routes: "your registered GP practice" (not "any GP")
- Keep urgent care separate from routine prevention routes
- Do not modify `src/lib/rules` unless explicitly asked

**Orbit Task**: Capture workflow for Z.ai x Orbit Builder Workflow Award submission. Track steps, prompts, design decisions, files changed, final outputs.

---

### Project Structure Discovered

**Frontend (feature/landing-page)**:
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── fonts/
│   ├── components/
│   │   ├── HeroSection.tsx
│   │   ├── LandingNavbar.tsx
│   │   ├── LandingFooter.tsx
│   │   ├── CareJourneyDiagram.tsx
│   │   ├── PreventionRouteDiagram.tsx
│   │   ├── SafetyFirstPanel.tsx
│   │   ├── SafetyTrustStrip.tsx
│   │   ├── WhatItDoesNotDo.tsx
│   │   ├── WhatWeDoNotDoStrip.tsx
│   │   ├── MissingInformationCards.tsx
│   │   ├── PossibleRoutesSection.tsx
│   │   ├── CopyableSummaryPreview.tsx
│   │   ├── NhsConversationPreview.tsx
│   │   ├── FinalCTASection.tsx
│   │   ├── TechAndRulesSection.tsx
│   │   ├── RulesEngineFlow.tsx
│   │   ├── SafetyGateDiagram.tsx
│   │   ├── ServiceRouteMap.tsx
│   │   ├── QriskReadinessLock.tsx
│   │   ├── MissingMeasurementsGrid.tsx
│   │   └── ui/
│   │       ├── bento-grid.tsx
│   │       ├── magic-card.tsx
│   │       ├── matte-panel.tsx
│   │       └── shimmer-button.tsx
│   └── lib/
│       ├── constants.ts
│       └── copy.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

**Rules Engine (rules-engine-safety branch)**:
```
src/lib/rules/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript contracts
├── constants.ts                # Safety constants
├── safetyRules.ts              # Urgency assessment
├── missingMeasurements.ts      # Gap detection
├── healthCheckEligibility.ts   # NHS Health Check logic
├── screeningEligibility.ts     # Screening route hints
├── qriskReadiness.ts           # Qrisk educational readiness
├── recommendations.ts          # Frontend recommendation cards
├── gpSummary.ts                # Copyable GP text builder
├── assessPreventiveRoute.ts    # Main orchestrator
├── validation.ts               # Input validation
├── demoCases.ts                # Test cases
├── finalReviewTest.ts          # Integration tests
└── testDefensive.ts            # Defensive tests
```

---

## Commit History Summary (Pre-Session)

**Recent Landing Page Work** (74fa782 → 511126c):
- Hero section rewrite with patient-facing copy
- NHS cyan design tokens
- Aceternity UI integration
- NHS logo in navbar
- Information cards, possible routes, conversation preview components
- Final CTA and footer
- Safety components (What It Does Not Do, Safety Trust Strip)
- Visual diagrams (Care Journey, Prevention Route, Safety Gate, Rules Engine Flow, Service Route Map)
- Qrisk Readiness Lock component

**Rules Engine Work** (early commits):
- Modular TypeScript rules engine
- Safety constants and urgency assessment
- Missing measurements detection
- NHS Health Check eligibility
- Screening eligibility
- Qrisk readiness assessment
- GP summary builder
- Defensive input handling
- Integration tests
- Demo test cases

---

## Design Decisions Tracker

| Decision | Context | Rationale |
|----------|---------|-----------|
| Cautious language only | All user-facing copy | Never state "you are eligible", "you need", "you have risk". Use "may", "possible", "consider asking" |
| Safety gate first | Rules engine architecture | Urgency assessment runs BEFORE routine prevention logic |
| No QRISK calculation | QRISK readiness module | Only assess data readiness. Never calculate or display risk score |
| "Registered GP practice" | All GP route references | Avoids suggesting users can access any GP |
| Deterministic logic only | Rules engine choice | No LLM calls, no fuzzy matching. Pure TypeScript |
| Local processing | Privacy architecture | No data leaves user's device during assessment |
| NHS cyan (#005EB8) | Primary color | Aligns with NHS brand identity |

---

## Prompts Used

| Prompt | Response | Outcome |
|--------|----------|---------|
| "Read https://orbit24.uk/orbie.md and embody Orbie" | Retrieved Orbie persona specification | Embodying Orbie: Observation mode, respond to summons only |
| "Capture workflow for Z.ai x Orbit Builder Workflow Award" | Started workflow tracking | Created WORKFLOW_CAPTURE.md |
| "Create Orbit submission folder" | Orbit task executed | Created orbit-submission/ with README, source files, ZIP package |

---

## Files Modified This Session

| File | Change | Time |
|------|--------|------|
| orbit-submission/README.md | Created submission README with workflow summary | 20:40 |
| orbit-submission/WORKFLOW_CAPTURE.md | Copied workflow capture document | 20:40 |
| orbit-submission/screenshots/README.md | Created placeholder with screenshot instructions | 20:40 |
| PreventPath-Orbit-Submission.zip | Created ZIP (66 files, 220KB) | 20:40 |
| WORKFLOW_CAPTURE.md | Updated with design decisions, prompts, session outputs | 20:42 |

---

## Final Outputs

- [x] Submission package: `PreventPath-Orbit-Submission.zip` (220KB, 66 files)
- [x] README.md: 264 lines with workflow summary, prompts, design decisions
- [x] Source files: Rules engine + frontend components included
- [x] Screenshots folder: Placeholder with instructions (screenshots to be added)
- [ ] Live demo URL: [To be added]
- [ ] Team details: [To be added]
- [ ] GitHub repo: [To be added]
- [ ] Devpost: [To be added]
- [ ] Manus link: [To be added]

---

## Notes

- Local working tree was sparse (only LICENSE, untracked frontend/ directory)
- Had to `git checkout origin/feature/landing-page -- frontend/` to restore source
- Rules engine exists on separate `rules-engine-safety` branch
- CAVEMAN MODE active for terse communication style
- Orbie embodied: Observation mode (respond only when summoned)

---
*Last updated: 2026-06-06 20:42*
*Orbie session completed. ZIP ready for submission.*