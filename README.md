# Preventive Healthcare — NHS preventive-care navigator

A hackathon project that takes a person's health profile, figures out the safe
preventive-care next step, and renders it as patient-friendly text alongside
real local NHS context (nearby services, area waiting times, population health
indicators).

The whole point is to bridge the gap between *"I have some health numbers
and questions"* and *"here is the specific thing the NHS lets me do next, and
here is where to do it"* — without overstepping, without inventing clinical
claims, and without breaking when an upstream is flaky.

---

## What the app does

Given a patient profile (age, country, condition flags, measurements, symptoms)
and a postcode, the API returns:

1. **A short patient-facing card** — headline, body, next step — written in plain
   English. *"You can get a free blood pressure check at most pharmacies in
   England if you are 40 or over. An NHS Health Check may also be available."*
2. **A 9-factor risk picture** — for each preventive-care factor (age, BP,
   cholesterol, smoking, BMI/waist, CVD history, diabetes, hypertension,
   kidney) we say whether it's `recorded` / `protective` / `unknown`, and a
   readiness ring (e.g. *"7 of 9 factors known, 89% complete"*).
3. **NHS Health Check eligibility** — possibly eligible, age-out-of-range, or
   not eligible because of an existing condition.
4. **QRISK3 readiness** — we never compute the score; we say what's missing to
   compute it (e.g. *"need blood pressure and sex at birth"*).
5. **Local NHS services** — real GP practices, pharmacies, and hospital sites
   near the postcode, fetched live from the open NHS Spine Directory.
6. **Local health context** — area-level public-health indicators (life
   expectancy, smoking, obesity, activity, diabetes diagnosis rate) and the
   most recent published per-ICB waiting-time figure for elective treatment.
7. **Official NHS content links** — verified `nhs.uk` URLs for the conditions
   relevant to the patient (NHS Health Check, pharmacy BP, etc.).
8. **Honest data-quality badges** — every panel of the response carries a
   status: `live`, `live-aggregate`, `cached`, `cached-fallback`, `synthetic`,
   or `missing`. The UI shows users when something is real-time vs. stale vs.
   illustrative.

---

## How it addresses preventive care

The clinical core is a **deterministic rules engine** that classifies any
patient into exactly one of four NHS-aligned preventive routes:

| Route | When |
|---|---|
| **`urgent_care`** | Red-flag symptom present (chest pain, stroke symptoms, severe breathlessness). Beats everything else. Call 999 / NHS 111. |
| **`pharmacy_bp_check`** | Adult ≥40 in England without hypertension, BP not checked in last 6 months. NHS funds free walk-in pharmacy BP checks for exactly this case. |
| **`ask_gp_or_pharmacy_about_measurements`** | Any other missing routine measurement (cholesterol, BMI, smoking status). |
| **`gp_review`** | All measurements present and no red flags — a routine GP review is the most defensible next step. |

The engine is **purely deterministic** — no LLM is involved in the decision.
Same patient input → same route, every time. The engine never invents a CVD
risk percentage; until QRISK3 inputs are all present, the `risk_band` is
`incomplete` and we say so.

On top of the routing, the system surfaces:

- **NHS Health Check eligibility** (40–74, no excluding condition — uses the
  full 11-condition NHS exclusion list).
- **Missing-measurement detection** so the user knows what to ask for at the
  pharmacy or GP.
- **Population screening matches** (cervical, breast, colorectal, AAA,
  diabetic eye) when age/sex/condition criteria are met.
- **A 9-factor risk picture** for the dashboard — so users see what's already
  known about them, what's protective, and what's a gap. This frames missing
  data as an opportunity rather than a failure.

The output is intentionally a **next-step**, not a diagnosis. The whole point
is to nudge users toward the specific preventive action the NHS funds and
they qualify for.

---

## How it addresses NHS admin

Most people don't know what they're eligible for, where to go, or how long
it'll take. The system answers all three for any UK postcode:

- **"What can I do?"** → The card's `next_step` is one specific action ("Visit
  a local pharmacy for a free blood pressure check") matched to the NHS
  service that actually funds that action.
- **"Where do I go?"** → Real nearby NHS services (GPs, pharmacies, hospital
  sites) for the postcode, fetched live from the open NHS Spine Directory.
  No login, no key, every UK postcode.
- **"How long will it take?"** → Real per-ICB monthly waiting-time figures
  from NHS England's RTT statistics (e.g. *"In your area (NHS Greater
  Manchester ICB), 58.4% of patients are seen within 18 weeks"*). We label
  this `live-aggregate` because it's real but monthly, not a personal
  prediction — that distinction is hardcoded into the contract.
- **"What's the reading material?"** → Verified NHS Health Check / pharmacy
  BP / cholesterol / smoking / weight cards with `nhs.uk` URLs.

The single `POST /api/nhs/full` endpoint returns all of this in one round-trip
so the UI can render a complete page from one fetch.

---

## What role z.ai plays

z.ai (the GLM model family — we run on `glm-5.1`) is the **patient-language
layer** of the whole app. Without it, the engine outputs would be a clean but
inert set of enums (`next_step_type: "pharmacy_bp_check"`,
`eligible_for_health_check: "possibly"`, `missing_measurements: ["blood
pressure"]`). z.ai is what turns those enums into something a patient
actually wants to read, click on, and ask follow-up questions about.

It runs across **five distinct generative surfaces**, each with its own
prompt, schema, and safety net:

| Surface | What z.ai does |
|---|---|
| **GP card** (`/api/nhs/gp-summary`) | Writes the headline + body + next-step in the patient's voice. *"We need your blood pressure reading. You can get a free, walk-in check at most community pharmacies in England if you are 40 or over. Visit a local pharmacy for a free blood pressure check."* |
| **Tone toggle** (`/api/nhs/gp-summary?tone=simple\|detailed`) | Re-renders the same card at a different reading register — *simple* (shorter sentences, year-9 reading age) or *detailed* (one extra sentence of context per field). Same card, different voice. |
| **Factor explain** (`/api/nhs/factor-explain`) | When a user clicks a chip on the risk picture ("why does my waist matter?"), z.ai writes a short plain-English explanation pinned to the patient's specific value — *not* a textbook definition, but a personalised "for someone with your numbers, here's what this factor changes." |
| **Questions to ask** (`/api/nhs/questions-to-ask`) | Drafts 3–4 questions the patient can take into their next GP appointment, tailored to whatever's missing from their profile. ("What's a good way to track my blood pressure between checks?", "Should I be getting a cholesterol test now, or is it part of the Health Check?") |
| **Unlock narration** (`/api/nhs/unlock-narration`) | When a measurement moves from missing → present (e.g. user adds a BP reading), z.ai narrates the change in one sentence: *"Now that your blood pressure is in, more of the picture is clear — your GP can talk this through with you."* It's the small moment of feedback that makes the dashboard feel alive. |

These five surfaces are why the app feels like a product rather than a
clinical decision tree. The engine knows *what* should happen next; z.ai
makes it feel like the app *understands* what the user is going through and
talks back to them like a person.

### How each surface is wired

Every z.ai call follows the same five-step pattern:

1. **The deterministic rules engine runs first** and produces a
   `PreventiveAssessment` — structured enums and strings only.
2. **The renderer projects the engine's output into a chat prompt** — a
   surface-specific system prompt + few-shots telling z.ai exactly what
   shape JSON to produce (headline + body + next_step / explanation /
   questions array / narration string / etc.) and the length / vocabulary
   constraints.
3. **z.ai returns JSON** matching that surface's schema.
4. **Guardrails sweep the output** before it leaves the server:
    - **Schema validation** — right keys, right types, within char limits.
    - **Forbidden-token sweep** against a hand-authored list (`diagnos`,
      `prescrib`, `%`, `hypertension`, `diabetes`, `heart attack`, `stroke`,
      etc.). If z.ai tried to slip a claim in, the sweep catches it.
    - **Urgent-text leak guard** (GP card only) — on the `urgent_care`
      route, the card must not contain "preventive", "health check", or
      "pharmacy". Second guardrail enforces this.
5. **Safe-fallback if anything fails.** Each surface has its own
   defensive fallback (the unlock narration falls back to *"More of the
   picture is in. Bring this to your GP, who can talk it through with
   you."*; questions falls back to three generic talking-points; the card
   falls back to a defensive *"Worth a chat with your GP"*).

### Why z.ai never makes a clinical decision (even though it generates a lot of text)

The hard separation is intentional. z.ai never sees the patient's actual
measurements — it sees the *already-projected* enums and the engine's
`forbidden_claims` list. It cannot restate a BP number because it was never
shown one. It can't say "your cholesterol is high" because the engine
emitted `eligible_for_health_check: "possibly"` and `missing_measurements:
["cholesterol"]`, not the numeric value.

The safety contract is enforced at test time: the engine's
`forbidden_claims` list is cross-checked against the guardrail's token list
in `test/seam.test.ts`. If the engine ever started emitting a claim the
guardrails couldn't catch in rendered text, the build would fail. That
cross-check is **the** load-bearing safety property of the app — the engine
and the guardrails are tied at the hip, by tests, by design.

So z.ai gets to be expressive, generative, and genuinely useful — five
different surfaces, real personality, real warmth — without ever being
allowed to drive the clinical part of the experience.

---

## Architecture in plain terms

There are five layers, each one talking to the next through a frozen contract:

**1. Contracts (`src/contracts/`)** — Zod-validated shapes for `PatientInput`
and `LocalPreventiveContext`. Frozen across the project so every other layer
can rely on them.

**2. Rules engine (`src/rules/`)** — Two deterministic engines. A "flat seam"
engine (`engine.ts`) emits the renderer's contract; a "rich" engine
(`src/lib/rules/`) carries extras like screening matches and QRISK
readiness. A safety bridge (`safety_bridge.ts`) lets you run the rich engine
and still get the flat seam shape the renderer expects.

**3. Ingestion (`src/ingestion/`)** — One adapter per upstream:
- **postcodes.io** — postcode → location, ICB, admin district, lat/lng.
- **NHS Spine Directory (ODS)** — open, no key. Real GP / pharmacy / NHS
  trust site listings per outward postcode. Three role-keyed queries
  memoized 24h.
- **Fingertips (PHE/OHID)** — open, no key. Bulk-fetched once per day,
  5 indicators per UTLA, hand-curated for patient-readability.
- **RTT-by-ICB** — hand-curated `data/rttByIcb.json` covering 24 verified
  English ICB codes with monthly % within 18 weeks.
- **Official content** — cached, URL-verified.
- An orchestrator (`context.ts`) fans out via `Promise.allSettled` so one
  dead upstream can't sink the rest.

**4. Rendering (`src/rendering/`)** — z.ai client + system prompts +
few-shots + guardrails + safe fallback. Five rendered surfaces (GP card,
tone variants, factor explain, questions, unlock narration), each with its
own schema and safety sweep.

**5. HTTP (`src/http/`)** — Tiny dep-free `node:http` server with CORS,
per-request stderr logging, and a JSON router exposing:
- `GET /api/nhs/postcode`
- `GET /api/nhs/services`
- `GET /api/nhs/waiting-times`
- `GET /api/nhs/population`
- `GET /api/nhs/context` *(orchestrated bundle)*
- `POST /api/nhs/gp-summary` *(card with optional tone)*
- `POST /api/nhs/factor-explain`
- `POST /api/nhs/questions-to-ask`
- `POST /api/nhs/unlock-narration`
- `POST /api/nhs/profile` *(card + factors + readiness + QRISK + screening)*
- `POST /api/nhs/full` *(context + profile in one round-trip — what the UI calls)*

---

## Mode toggle: demo / light / full

Every endpoint takes `?mode=demo|light|full` to select fidelity. Default is
`demo` — the safest path for stage.

| Source | demo | light | full |
|---|---|---|---|
| Postcode (postcodes.io) | live | live | live |
| Services | cached pack | **NHS ODS live** (no key) | NHS Service Search (key) or cached-fallback |
| Waiting times | cached prose | **RTT-by-ICB live-aggregate** | RTT-by-ICB live-aggregate |
| Population | synthetic | **Fingertips live** (5 indicators) | Fingertips live |
| Official content | cached, URL-verified | cached, URL-verified | cached, URL-verified |
| GP card render | uses M13 9PL cache | live z.ai | live z.ai |

**`mode=light` is fully live with no API key required.** That was a real
break-through — the open NHS Spine Directory ODS gives real GPs / pharmacies /
hospitals nationwide, and Fingertips public-health data is also keyless.

`mode=full` is wired to also try NHS Service Search via `NHS_API_KEY` in
`.env`. Without the key, services degrade to `cached-fallback` (and a
one-shot stderr warning explains why). The rest of `full` still goes live.

---

## Safety properties (what we never do)

These are tested in the seam suite — they don't drift.

- **Never invent a number.** No fabricated CVD risk %, no made-up waiting
  time. If a number isn't sourced, it isn't in the output.
- **Never personalise area waiting times.** The waiting-times shape carries
  a hardcoded `isPersonalPrediction: false` and a disclaimer; the renderer
  is contractually barred from saying "your wait will be X days".
- **Never give a diagnosis.** The engine emits a `forbidden_claims` list
  (e.g. *"you have hypertension"*, *"your CVD risk is X%"*); the guardrail
  has a parallel token list (`hypertension`, `%`, etc.); if z.ai output
  contains any forbidden token, the safe-fallback card is served instead.
- **Urgent override beats preventive framing.** On `urgent_care` the card
  must not mention "preventive", "health check", or "pharmacy"; a second
  guardrail sweep enforces this.
- **Honest data-quality badges.** Every adapter self-reports `live` /
  `cached` / `synthetic` / `missing` / `cached-fallback`. The UI shows
  these so judges and users can see what's real-time vs. illustrative.
- **No deprivation claims.** The IMD (Index of Multiple Deprivation) value
  is in postcodes.io's response but is deliberately *not* picked into our
  shape — a single LSOA rank without national normalisation is too easy to
  misuse in a patient card. The Fingertips deprivation indicator (93553) is
  also intentionally excluded for the same reason.

---

## How to run

```bash
# Install
npm install

# Boot the API
PORT=3000 npx tsx src/http/server.ts

# Default demo (stage-safe, cached/synthetic)
curl "http://localhost:3000/api/nhs/context?postcode=M13%209PL"

# Light mode — fully live, no key
curl "http://localhost:3000/api/nhs/context?postcode=M13%209PL&mode=light"

# Full UI round-trip (light)
curl -X POST "http://localhost:3000/api/nhs/full?mode=light" \
  -H "content-type: application/json" \
  -d @sample-patient.json

# Cross-postcode × cross-mode smoke probe
npx tsx scripts/probe-live.ts

# Test suite
npm test
```

`source-verification.md` documents every upstream we probed, the date we
probed it, what shape it returned, and what verdict (live-safe / cache-it /
demo-only) we settled on. Re-probe before a stage demo with the commands in
that file.
