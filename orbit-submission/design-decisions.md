# Design Decisions — PreventPath

This document covers the main product and safety decisions made during the PreventPath build.

---

## Product Decisions

### Decision: Prevention-First, Not Diagnosis-First

**Context**: Many health tools focus on triage or diagnosis.

**Decision**: PreventPath focuses purely on routine prevention gaps and preparation.

**Rationale**:
- Prevention is a safe, non-diagnostic domain
- Users want to prepare before seeing a clinician
- NHS has clear prevention pathways to reference
- Reduces risk of harm from misdiagnosis

---

### Decision: Conversation Starter, Not Treatment Plan

**Context**: Users may expect actionable medical advice.

**Decision**: All outputs framed as "conversation starter" templates.

**Rationale**:
- Clinicians make treatment decisions, not tools
- Preparation value is in having a focused discussion
- Copyable summary helps structure the conversation
- Avoids user misunderstanding tool's role

---

### Decision: England-Specific Scope

**Context**: NHS pathways differ across UK nations.

**Decision**: Scope explicitly to NHS England.

**Rationale**:
- Clearer implementation boundaries
- NHS England has well-documented prevention schedules
- Prevents confusion about eligibility criteria
- Can be expanded later with nation-specific modules

---

### Decision: Local Processing Only

**Context**: Health data privacy is paramount.

**Decision**: No data leaves user's device during assessment.

**Rationale**:
- Maximum privacy protection
- No backend infrastructure complexity
- Faster local execution
- Meets NHS data handling expectations

---

## Safety Decisions

### Decision: Urgency Gate First

**Context**: Acute symptoms must be prioritized over routine prevention.

**Decision**: Emergency/urgent assessment runs BEFORE any routine prevention logic.

**Rationale**:
- Safety first — acute needs take precedence
- Clear separation in code (safetyRules.ts first)
- Prevents inappropriate prevention advice during emergencies
- Provides 999/A&E/NHS 111 routing when needed

---

### Decision: No QRISK Score Calculation

**Context**: QRISK3 is a clinical risk score for cardiovascular disease.

**Decision**: Only assess QRISK data readiness. Never calculate or display score.

**Rationale**:
- Risk scores require clinician interpretation
- QRISK has specific input requirements beyond self-report
- Educational value: "what data you might need"
- Avoids inappropriate risk communication

---

### Decision: "Registered GP Practice" Not "Any GP"

**Context**: GP access in England requires registration.

**Decision**: All GP route references specify "your registered GP practice."

**Rationale**:
- Accurate to NHS system
- Prevents expectation that any GP can help
- Encourages registration checking
- Aligns with NHS service boundaries

---

### Decision: Separate Urgent Care

**Context**: Urgent and acute care pathways differ from routine prevention.

**Decision**: Urgent care distinctly separated throughout information architecture.

**Rationale**:
- Prevents confusion about when to seek urgent help
- Clear routing (999/A&E/NHS 111 vs routine)
- Reduces risk of delayed urgent care
- Aligns with NHS triage patterns

---

## Language Decisions

### Decision: Cautious Language Only

**Context**: Health tools can overstate certainty.

**Decision**: Strict language pattern enforcement.

| Avoid | Use |
|-------|-----|
| "You are eligible" | "You may be eligible" |
| "You need" | "Consider asking about" |
| "Your risk is..." | "This may indicate..." |
| "Do this" | "Consider..." |

**Rationale**:
- Maintains appropriate uncertainty
- Prevents overpromising
- Keeps clinician as decision-maker
- Reduces legal/clinical risk

---

## Technical Decisions

### Decision: Deterministic Rules Engine

**Context**: LLM-based health tools can hallucinate.

**Decision**: Pure TypeScript rules engine. No LLM inference on clinical outputs.

**Rationale**:
- Reproducible outputs for given inputs
- Testable with standard unit tests
- Transparent logic (readable code)
- No hallucination risk

---

### Decision: Type-Safe Architecture

**Context**: Health data has complex relationships.

**Decision**: Full TypeScript type coverage across rules engine.

**Rationale**:
- Catches errors at compile time
- Self-documenting type contracts
- IDE support for safe development
- Clear interfaces for future expansion

---

### Decision: Defensive Input Handling

**Context**: User input can be incomplete, malformed, or malicious.

**Decision**: All inputs validated with safe defaults.

**Rationale**:
- Prevents crashes from bad data
- Graceful degradation when data missing
- No assumption about input quality
- Safer in production

---

### Decision: NHS Cyan Primary Color

**Context**: Brand alignment builds trust.

**Decision**: NHS cyan (#005EB8) as primary color.

**Rationale**:
- Immediate NHS recognition
- Builds user trust
- Clear brand identity
- Accessible contrast ratios

---

### Decision: Dark Mode Base

**Context**: Modern health apps often use light themes.

**Decision**: Linear-inspired dark theme (#0A0E14 background).

**Rationale**:
- Modern, polished appearance
- Good contrast for accessibility
- Reduces eye strain for extended use
- Differentiates from clinical/medical tools

---

## Summary Table

| Category | Decision | Rationale |
|----------|----------|-----------|
| **Product** | Prevention-first, not diagnosis | Safe, non-diagnostic domain |
| **Product** | Conversation starter templates | Clinicians make treatment decisions |
| **Product** | England-specific scope | Clearer implementation boundaries |
| **Product** | Local processing only | Maximum privacy protection |
| **Safety** | Urgency gate first | Acute needs take precedence |
| **Safety** | No QRISK score calculation | Requires clinician interpretation |
| **Safety** | "Registered GP practice" | Accurate to NHS system |
| **Safety** | Separate urgent care | Prevents confusion, appropriate routing |
| **Language** | Cautious language only | Maintains appropriate uncertainty |
| **Technical** | Deterministic rules engine | Reproducible, testable, transparent |
| **Technical** | Type-safe architecture | Compile-time error catching |
| **Technical** | Defensive input handling | Safe defaults, graceful degradation |
| **Technical** | NHS cyan primary | Brand alignment, trust building |
| **Technical** | Dark mode base | Modern, accessible, differentiated |

---

*Prepared for Z.ai x Orbit Builder Workflow Award*  
*VibeHack London 2026*