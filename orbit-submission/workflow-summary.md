# Workflow Summary — How AI Agents Supported PreventPath

## Overview

This document explains how AI agents (Claude Code with Orbie) supported the PreventPath build workflow across research, design, development, and documentation phases.

**Key Principle**: AI was a workflow accelerator and safety checker. The clinical-facing logic remained deterministic and rule-based. No AI inference on patient-facing clinical decisions.

---

## Phase 1: Research & Framing

### NHS Prevention Pathway Research
AI agents scanned NHS guidance to understand:
- Routine prevention schedules for England
- NHS Health Check eligibility (40-74, every 5 years)
- Population screening programmes (cervical, breast, colorectal, AAA, diabetic eye)
- Community pharmacy services that support prevention
- Urgent vs routine care separation requirements

### Safety Boundary Definition
AI helped frame the "what we do not do" boundaries:
- Diagnostic language patterns to avoid
- Eligibility confirmation to avoid
- Risk score calculation prohibition
- Appointment booking exclusion
- "Registered GP practice" vs "any GP" distinction

### Language Patterns
AI reviewed copy to ensure:
- "may" not "you are"
- "possible" not "you need"
- "consider asking" not direct instructions
- "conversation starter" framing throughout

---

## Phase 2: Product Design & Architecture

### Rules Engine Planning
AI agents helped plan the modular TypeScript structure:
- Separation of safety gates from routine logic
- Type contracts for all inputs/outputs
- Test coverage approach (demo cases, defensive tests)
- Integration test strategy

### Component Architecture
Frontend component breakdown supported by AI:
- 24 components for landing page
- Patient-first information hierarchy
- Safety sections (urgent vs routine)
- Educational diagrams (journey flow, routes, safety gates)

### Design System
AI helped align with NHS brand:
- NHS cyan (#005EB8) as primary
- Dark mode base (#0A0E14) for modern feel
- High contrast for accessibility
- Consistent spacing and typography scales

---

## Phase 3: Development Support

### Code Generation & Iteration
AI agents supported:
- Landing page component scaffolding
- TypeScript type definitions for rules engine
- Safety rule patterns (emergency vs urgent red flags)
- GP summary builder structure
- Copyable conversation starter templates

### Code Review
AI reviewed code for:
- Type safety and coverage
- Defensive input handling
- Safe language patterns in copy
- Separation of urgent vs routine logic
- No risk score calculations in outputs

### Testing
AI helped design:
- Demo test cases covering edge scenarios
- Defensive input validation tests
- Integration test patterns for full pipeline

---

## Phase 4: Workflow Capture & Documentation

### Orbit Submission Package
This entire submission package was supported by AI:
- Workflow documentation (capturing phases, prompts, decisions)
- README structure and content
- Links aggregation
- Team details formatting
- Screenshot folder organization

### Session Logging
Orbie (Orbit's on-site companion) logged:
- Prompts used throughout the build
- Design decisions with rationale
- Files modified per session
- Technical context for handover

---

## What AI Did NOT Do

### Clinical Decisions
- **No LLM inference** on patient-facing clinical outputs
- Rules engine runs pure TypeScript functions
- Deterministic outputs for given inputs

### Risk Calculations
- **No QRISK score calculation** — only readiness assessment
- No quantitative risk thresholds
- No probability estimates

### Eligibility Confirmation
- **No "you are eligible" statements**
- All outputs framed as "possibly eligible" or "consider asking"

---

## AI Workflow Pattern

The build followed this pattern with AI support:

1. **Clarify constraints** — Establish safety boundaries first
2. **Research independently** — AI scans NHS guidance
3. **Propose structure** — AI suggests modular architecture
4. **Iterate code** — AI generates, human reviews
5. **Safety check** — AI verifies language patterns
6. **Document workflow** — Orbie captures for Orbit submission

---

## Tools Used

- **Claude Code** (with Orbie persona) — Primary development agent
- **TypeScript** — Type-safe rules engine
- **Next.js** — Frontend framework
- **Tailwind CSS** — Styling
- **Aceternity UI** — Component library

---

## Summary

AI accelerated the PreventPath build through:

- **Research** — NHS guidance scanning and synthesis
- **Design** — Architecture planning and component breakdown
- **Development** — Code generation, iteration, review
- **Safety** — Language pattern verification and boundary checking
- **Documentation** — Workflow capture and submission packaging

**Clinical logic remained deterministic and rule-based.** AI was a workflow accelerator, not a decision engine.

---

*Prepared for Z.ai x Orbit Builder Workflow Award*  
*VibeHack London 2026*