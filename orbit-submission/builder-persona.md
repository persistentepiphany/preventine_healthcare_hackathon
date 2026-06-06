# Builder Persona Capture

## Identity

**Name**: [Captured at VibeHack London 2026]
**Event**: VibeHack London 2026
**Lens**: Z.ai x Orbit Builder Workflow Award
**Date**: June 6, 2026

---

## Cognitive Dimensions

### D1: Discovery & Research Orientation

- **Pattern**: Scans NHS guidance and health policy before defining product boundaries
- **Approach**: Constraints-first — states what NOT to do before what to do
- **Verification**: Uses adversarial checks on language patterns and safety boundaries
- **Evidence**: "Do not diagnose, prescribe, confirm eligibility" constraints established upfront

### D3: System Thinking & Architecture

- **Pattern**: Modular separation of concerns (safety gates, routine logic, presentation)
- **Approach**: Type-safe contracts for all interfaces
- **Verification**: Full TypeScript coverage, defensive input handling
- **Evidence**: 14-module rules engine with clear separation of safety and routine pathways

### D5: Iteration Style

- **Pattern**: Breaks large tasks into modular components
- **Approach**: Each component gets a focused prompt, iterated with review
- **Verification**: 24 landing page components, each independently reviewed
- **Evidence**: Component-based build with AI review at each step

---

## Engineering Dimensions

### D2: Technical Preferences

| Preference | Choice |
|------------|--------|
| **Frontend** | Next.js 14 + TypeScript + Tailwind CSS |
| **State** | Local processing (no backend for assessment) |
| **Styling** | Aceternity UI + custom design system |
| **Colors** | NHS cyan (#005EB8) + Linear-inspired dark theme |
| **Icons** | Lucide React |
| **Testing** | Demo cases, defensive tests, integration tests |

### D4: Code Style

- **Type Safety**: Strict TypeScript, no `any`
- **Defensive**: All inputs validated with safe defaults
- **Deterministic**: Pure functions, no LLM inference on clinical outputs
- **Readable**: Self-documenting type contracts, clear separation of concerns
- **Modular**: Each rule/safety check in its own module

---

## Collaboration Pattern

### With AI Agents

| Phase | AI Role | Builder Role |
|-------|---------|--------------|
| **Research** | Scan NHS guidance, frame boundaries | Review, approve, refine |
| **Design** | Propose architecture, suggest modules | Approve, adjust, confirm |
| **Development** | Generate scaffolding, write types | Review, test, refine |
| **Review** | Check language patterns, verify safety | Approve, correct, iterate |
| **Documentation** | Capture workflow, format submission | Approve, add details |

### Key Constraint

**"AI supported workflow, not clinical decisions."**

- Rules engine: deterministic TypeScript only
- Risk scores: not calculated, only data readiness assessed
- Eligibility: never confirmed, only "possibly eligible"
- Urgency: rule-based red flags, not AI triage

---

## Communication Style

- **Constraints First**: Always states safety boundaries before features
- **Cautious Language**: Uses "may," "possible," "consider asking"
- **Clear Separation**: Urgent vs routine, clinical vs administrative
- **Complete Context**: Provides NHS scope, England specificity upfront

---

## Project Preferences

| Preference | Value |
|------------|-------|
| **Scope** | England-specific (can expand to nations later) |
| **Privacy** | Local processing only |
| **Brand** | NHS-aligned (cyan, trust-building) |
| **Safety** | Urgency gate first, always |
| **Language** | Cautious, conversational starter framing |
| **Boundaries** | Explicit "what we do not do" sections |

---

## Safety Mindset

1. **Diagnosis is a clinician's job** — tool only prepares for conversation
2. **Urgency trumps prevention** — acute needs always first
3. **Registered GP, not any GP** — accurate to NHS system
4. **Eligibility is not confirmed** — only "possibly eligible"
5. **Risk scores are not displayed** — only data readiness assessed

---

## Workflow Signature

```
1. Establish constraints → 2. Research independently →
3. Propose structure → 4. Iterate code →
5. Safety check → 6. Document workflow
```

---

*Persona captured by Orbie — Orbit's on-site companion*
*VibeHack London 2026*
*Z.ai x Orbit Builder Workflow Award*