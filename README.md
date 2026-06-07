# Preventive Healthcare

**An NHS preventive-care navigator that turns "I have some numbers and questions" into "here is the specific thing you can do tomorrow, and here is where to do it." Built on `glm-5.1` (z.ai) as the patient-language layer over a deterministic clinical engine.**

---

## The problem

Preventive care in the NHS is genuinely good — free pharmacy BP checks for 40+, the NHS Health Check programme, ICB-funded screening, walk-in services — but **most people don't know any of it exists or what they qualify for.** They don't know whether their symptoms are urgent or not, what's worth telling a GP about, where the nearest pharmacy that does a BP check is, or how long they'll wait if they book one. They look at the NHS website and bounce off because the navigation is built for the system, not for them.

The other side of the problem: any tool that tries to fix this has to be **defensibly safe**. It can't invent diagnoses, fabricate risk percentages, recommend specific drugs, or personalise area-level data into a fake personal prediction. The minute it does, it stops being preventive care and starts being a liability.

## The pitch

A small API + UI that does both:
1. **Answers the three questions every user is stuck on** — *what can I do, where do I go, how long will it take* — using real NHS data per postcode.
2. **Does it safely** by splitting the clinical decision (a deterministic rules engine, no LLM) from the patient-language layer (`glm-5.1` z.ai, with hard guardrails). The engine decides; z.ai talks; a vocabulary cross-check in the test suite holds the seam together.

The result is something that feels like a friendly NHS navigator while behaving like a regulated clinical tool.

---

## What a user gets back

Submit a patient profile (age, country, condition flags, current measurements, red-flag symptoms) and a UK postcode. One round-trip to `POST /api/nhs/full?mode=light` returns:

1. **A short patient-facing card** — headline + body + next step — written in plain English by z.ai:
   > *"We need your blood pressure reading. You can get a free, walk-in check at most community pharmacies in England if you are 40 or over. An NHS Health Check may also be available."*
   > → **Visit a local pharmacy for a free blood pressure check.**

2. **A 9-factor risk picture** for the dashboard — every preventive-care factor (age, BP, cholesterol, smoking, BMI/waist, CVD history, diabetes, hypertension, kidney) labelled `recorded` / `protective` / `unknown`, plus a readiness ring ("7 of 9 known, 89% complete").

3. **NHS Health Check eligibility** based on the 11-condition NHS exclusion list — *possibly eligible*, *age out of range*, *existing condition*, or *not applicable* (urgent override).

4. **QRISK3 readiness** — *what's missing* to compute it. The system **never computes the score** unless every input is present, because making up a CVD risk percentage is the most common LLM-in-healthcare failure mode.

5. **Real nearby NHS services** — GP practices, pharmacies, hospital/urgent-treatment-centre sites for that postcode, fetched live from the open NHS Spine Directory (ODS). No API key. Every UK postcode.

6. **Real local waiting times** — the most recent per-ICB monthly percentage of patients seen within 18 weeks for elective treatment, from NHS England's RTT statistics. Hard-flagged `isPersonalPrediction: false`.

7. **Real population health context** — 5 indicators per upper-tier local authority (life expectancy, smoking prevalence, overweight/obesity, physical activity, diabetes diagnosis rate) from Fingertips (PHE/OHID). Also keyless.

8. **Verified NHS content links** — the specific `nhs.uk` pages that match the patient's situation (NHS Health Check, pharmacy BP, cholesterol, smoking, healthy weight).

9. **Honest data-quality badges** — every panel carries `live`, `live-aggregate`, `cached`, `cached-fallback`, `synthetic`, or `missing` so the UI shows the user what's real-time vs illustrative.

---

## How it addresses preventive care

The clinical core is a **deterministic rules engine** that classifies any patient into exactly one of four NHS-aligned preventive routes:

| Route | When | Why this route exists |
|---|---|---|
| **`urgent_care`** | Red-flag symptom (chest pain, stroke symptoms, severe breathlessness). Beats everything. | Call 999 / NHS 111. Health-check framing is suppressed. |
| **`pharmacy_bp_check`** | Adult ≥40 in England, no hypertension, BP not checked in 6 months. | The NHS literally funds free walk-in pharmacy BP checks for exactly this case. |
| **`ask_gp_or_pharmacy_about_measurements`** | Any other routine measurement missing (cholesterol, BMI, smoking status). | Most preventive care starts with getting the missing numbers in. |
| **`gp_review`** | All measurements present, no red flags. | A routine GP review is the most defensible next step. |

**The engine is purely deterministic** — no LLM in the decision path. Same input → same route, every time. It also outputs:

- NHS Health Check eligibility (40–74 + the full 11-condition NHS exclusion list).
- Missing-measurement detection so users know what to ask for.
- Population screening matches (cervical, breast, colorectal, AAA, diabetic eye) when age/sex/condition criteria are met.
- A 9-factor risk picture that reframes missing data as the next action, not a failure.

The output is intentionally a **next-step, not a diagnosis** — nudging users to the specific preventive action the NHS funds and they qualify for.

## How it addresses NHS admin

Three questions, real answers per UK postcode:

- **What can I do?** → The card's `next_step` is one specific action ("Visit a local pharmacy for a free blood pressure check") matched to the NHS service that funds that action.
- **Where do I go?** → 3–24 real NHS services per postcode from the open Spine Directory (ODS). No login, no key, every UK postcode including Scotland / Wales / Northern Ireland.
- **How long will it take?** → Real per-ICB monthly RTT figures from NHS England (e.g. *"In your area (NHS Greater Manchester ICB), 58.4% of patients are seen within 18 weeks (NHS England, 2026-04)"*) — `live-aggregate`, hard-flagged as not a personal prediction.

Plus verified `nhs.uk` content links for whatever's relevant to the patient.

`POST /api/nhs/full` returns all of it in one round-trip so the UI can render a complete page from a single fetch.

---

## What `glm-5.1` (z.ai) does

z.ai is the **patient-language layer**. Without it the engine outputs are clean but inert (`next_step_type: "pharmacy_bp_check"`, `eligible_for_health_check: "possibly"`). z.ai is what turns those enums into something a person actually wants to read, click on, and follow up on.

It runs across **five distinct generative surfaces**, each with its own prompt, schema, and safety net:

| Surface | What z.ai produces |
|---|---|
| **GP card** (`/api/nhs/gp-summary`) | The headline + body + next-step in the patient's voice. *"We need your blood pressure reading. You can get a free, walk-in check at most community pharmacies in England if you are 40 or over."* |
| **Tone toggle** (`/api/nhs/gp-summary?tone=simple\|detailed`) | The same card re-rendered at a different reading register — *simple* (shorter sentences, year-9 reading age) or *detailed* (one extra sentence of context per field). Same card, different voice. |
| **Factor explain** (`/api/nhs/factor-explain`) | When a user taps a chip on the risk picture ("why does my waist matter?"), z.ai writes a short personalised explanation pinned to the patient's value — not a textbook definition, a "for someone with your numbers, here's what this changes." |
| **Questions to ask** (`/api/nhs/questions-to-ask`) | 3–4 questions the patient can take into their next GP appointment, tailored to what's missing. *"Should I get a cholesterol test now, or is it part of the Health Check?"* |
| **Unlock narration** (`/api/nhs/unlock-narration`) | When a measurement moves from missing → present, z.ai narrates the change in one sentence. *"Now that your blood pressure is in, more of the picture is clear — your GP can talk this through with you."* |

These five surfaces are why the app feels like a product rather than a clinical decision tree. The engine knows *what* should happen next; z.ai makes the app *understand* what the user is going through and talk back like a person.

### Why z.ai is allowed to be expressive

It can be, because it never makes a clinical decision and never sees clinical data:

- The engine projects every patient input into structured enums before z.ai sees anything. **z.ai is shown a `PreventiveAssessment` object — never the raw measurements.** It can't restate a BP number because it was never given one. It can't fabricate a CVD risk percentage because the engine emitted `risk_band: "incomplete"`, not a number.
- Every output is **schema-validated** (right keys, right types, within char limits).
- Every output is **forbidden-token-swept** against a hand-authored list — `diagnos`, `prescrib`, `%`, `hypertension`, `diabetes`, `heart attack`, `stroke`, etc. If z.ai sneaks a forbidden token in, the safe-fallback response is served.
- Urgent-route cards are **swept a second time** for "preventive", "health check", or "pharmacy" — those must not appear when the patient has a red-flag symptom.
- Every surface has its own **safe-fallback** payload — *"Worth a chat with your GP"* / *"More of the picture is in. Bring this to your GP."* — so if z.ai is down, slow, or misbehaves, the user still gets a useful response.

### The seam that holds it together

The engine emits a `forbidden_claims: string[]` list (the claims the renderer is contractually barred from producing). The guardrails sweep against `FORBIDDEN_OUTPUT_TOKENS`. The test suite (`test/seam.test.ts`) asserts every engine-emitted claim is catchable by an existing token. **If the engine ever started forbidding a claim the guardrail couldn't catch, the build fails.** This cross-check is the load-bearing safety property of the whole project.

z.ai gets to be expressive across five surfaces — real prose, real warmth, real personality — without ever being allowed to drive the clinical part of the experience.

---

## Architecture (five clean layers)

**1. Contracts (`src/contracts/`)** — Zod-validated shapes for `PatientInput` and `LocalPreventiveContext`. Frozen across the project so every other layer relies on them.

**2. Rules engine (`src/rules/`)** — Two deterministic engines side-by-side. The "flat seam" engine (`engine.ts`) emits exactly what the renderer expects; a "rich" engine (`src/lib/rules/`) carries QRISK readiness, screening matches, and prioritised recommendation cards. A safety bridge (`safety_bridge.ts`) projects the rich engine's output down to the flat seam so the rich signal can be surfaced without changing the renderer's contract.

**3. Ingestion (`src/ingestion/`)** — One adapter per upstream, all with `Promise.allSettled` so one dead source can't sink the rest:

| Source | Key required? | Status | What we use |
|---|---|---|---|
| postcodes.io | No | live | postcode → admin district, ICB, lat/lng, ONS codes |
| **NHS Spine Directory (ODS)** | **No** | **live** | Real GP / pharmacy / NHS-trust-site listings per postcode |
| **Fingertips (PHE/OHID)** | **No** | **live** | 5 public-health indicators per upper-tier local authority |
| **RTT-by-ICB** | No | live-aggregate | Per-ICB monthly % within 18 weeks (24 verified codes) |
| Official NHS content | No | cached, URL-verified | Health Check / pharmacy BP / cholesterol / etc. cards |
| NHS Service Search | **Yes** (Apigee) | optional | Geo-distance-ranked services (mode=full only) |

**4. Rendering (`src/rendering/`)** — z.ai client + system prompts + few-shots + guardrails + safe fallback. Five rendered surfaces (GP card, tone variants, factor explain, questions, unlock narration), each with its own schema and safety sweep.

**5. HTTP (`src/http/`)** — Dep-free `node:http` server with CORS (default-permissive + `CORS_ORIGINS` allowlist mode), per-request stderr logging, and a JSON router. Endpoints:

- `GET /api/nhs/postcode` — postcode lookup
- `GET /api/nhs/services` — nearby services
- `GET /api/nhs/waiting-times` — area waiting prose
- `GET /api/nhs/population` — population indicators
- `GET /api/nhs/context` — full orchestrated context bundle
- `POST /api/nhs/gp-summary` — card with optional `tone`
- `POST /api/nhs/factor-explain` — chip-click explanation
- `POST /api/nhs/questions-to-ask` — GP appointment prep
- `POST /api/nhs/unlock-narration` — measurement-came-in narration
- `POST /api/nhs/profile` — card + 9 factors + readiness + QRISK + screening
- **`POST /api/nhs/full`** — context + profile in one round-trip *(what the UI calls)*

---

## Mode toggle: `demo` / `light` / `full`

Every endpoint takes `?mode=demo|light|full` to select fidelity. Default is `demo`.

|  | demo (default) | light | full |
|---|---|---|---|
| Postcode | live | live | live |
| Services | cached pack | **ODS live** (no key) | NHS Service Search (key) → else cached-fallback |
| Waiting times | cached prose | **RTT-by-ICB live-aggregate** | RTT-by-ICB live-aggregate |
| Population | synthetic | **Fingertips live** (5 indicators) | Fingertips live |
| Content | cached | cached | cached |
| Card render | M13 9PL file cache | live z.ai | live z.ai |

**`mode=light` is fully live with no API key required.** The unlock was finding that the NHS Spine Directory ODS is keyless and covers every UK postcode; Fingertips is also keyless. Combined with hand-curated RTT-by-ICB data, every English ICB gets fully-live per-area data with zero NHS onboarding.

`mode=full` adds NHS Service Search via `NHS_API_KEY` when set. Without it, services degrade cleanly to `cached-fallback` (the rest of `full` still goes live).

---

## Safety properties (tested, not promised)

Every property is enforced by the test suite (`test/`), not by careful reading:

- **Never invent a number.** No fabricated CVD risk %, no made-up waiting time. If a number isn't sourced, it's not in the output.
- **Never personalise area-level waiting times.** The waiting-times shape carries a hardcoded `isPersonalPrediction: false`; the renderer is contractually barred from saying "your wait will be X days".
- **Never give a diagnosis.** The engine emits `forbidden_claims` (e.g. *"you have hypertension"*, *"your CVD risk is X%"*); the guardrail has a parallel token list; if z.ai's output contains a forbidden token, the safe-fallback card is served. The seam test cross-checks that every engine-forbidden claim is catchable by an existing guardrail token.
- **Urgent override beats preventive framing.** On `urgent_care` the card must not mention "preventive", "health check", or "pharmacy". Second guardrail sweep enforces this.
- **Honest data-quality badges.** Each adapter self-reports its real status; the UI shows users what's live vs cached vs synthetic vs missing.
- **No deprivation claims.** The IMD value is in postcodes.io's response but is deliberately *not* field-picked. The Fingertips deprivation indicator (93553) is also excluded. A single deprivation rank without national normalisation is too easy to misuse in a patient card.

---

## Live verification across 16 UK postcodes

Probed live on 2026-06-06:

| Postcode | Area | Services | Population | Waiting times |
|---|---|---|---|---|
| M13 9PL | Manchester | 21 live | live (Manchester) | 58.4% (Greater Manchester ICB) |
| B1 1BB | Birmingham | 24 live | live | 56.2% (Birmingham & Solihull) |
| LS1 4DT | Leeds | 24 live | live | 60.7% (West Yorkshire) |
| L1 8JQ | Liverpool | 24 live | live | 56.9% (Cheshire & Merseyside) |
| BS1 1AD | Bristol | 24 live | live | 62.4% (BNSSG) |
| NE1 4ST | Newcastle | 24 live | live | 54.6% (NENC) |
| PL1 2HJ | Plymouth | 24 live | live | 63.1% (Devon) |
| BN1 1UB | Brighton | 24 live | live | 61.5% (Sussex) |
| SW1A 1AA | Westminster | 3 live | live | 61.2% (NW London) |
| E1 6AN | City of London | 24 live | live | 57.5% (NE London) |
| N1 9GU | Islington | 24 live | live | 59.7% (NC London) |
| NG1 5DT | Nottingham | 24 live | live | 58.6% (Notts) |
| OX1 4AR | Oxford | 24 live | missing¹ | 64.2% (BOB) |
| CB1 1NL | Cambridge | 24 live | missing¹ | 59.5% (Cambs & Peterborough) |
| CF10 1EP | Cardiff (Wales) | 14 live | missing² | cached³ |
| EH1 1YZ | Edinburgh (Scotland) | 3 live | missing² | cached³ |
| BT1 5GS | Belfast (NI) | 3 live | missing² | cached³ |

¹ Known ONS code-reissue gap (postcodes.io returns a code Fingertips doesn't index yet) — degrades to `missing`, not wrong-area.
² Fingertips is England-only; devolved nations badge `missing`.
³ Generic NHS-wide prose, not wrong-area Manchester data.

`scripts/probe-live.ts` reruns this entire matrix and exits non-zero if any postcode × mode returns non-200.

---

## Running it

```bash
# Install
npm install

# Boot the API
PORT=3000 npx tsx src/http/server.ts

# Default demo (stage-safe, cached/synthetic — everything is fast)
curl "http://localhost:3000/api/nhs/context?postcode=M13%209PL"

# Light mode — fully live, no key
curl "http://localhost:3000/api/nhs/context?postcode=M13%209PL&mode=light"

# Full UI round-trip
curl -X POST "http://localhost:3000/api/nhs/full?mode=light" \
  -H "content-type: application/json" \
  -d @sample-patient.json

# Cross-postcode × cross-mode smoke probe
npx tsx scripts/probe-live.ts

# Full test suite (247 tests, no live network needed)
SEAM_STUB=1 npm test
```

`manual-tests.http` is set up for editor HTTP clients (VS Code REST Client, JetBrains HTTP) with worked examples for every endpoint and every mode.

`source-verification.md` documents every upstream we probed, the date, what shape it returned, and the verdict — re-probe before stage with the commands in that file.

---

## What's in the repo

```
src/
  contracts/          Zod-validated PatientInput, LocalPreventiveContext
  rules/              Flat seam engine, rich engine bridge, factor projection
  lib/rules/          Rich engine internals (QRISK readiness, screening matches)
  ingestion/          Postcode, ODS services, Fingertips, RTT, content, orchestrator
  rendering/          z.ai client + 5 renderers + guardrails + safe fallback
  http/               Dep-free server + router with CORS + per-request log
  storage/            In-memory session store for the UI

data/
  rttByIcb.json       24 verified English ICB codes + monthly RTT %
  demoServices.json   Manchester fallback pack
  ui-vocabulary.json  Engineer-authored NHS-sourced factor labels
  officialContentCards.json   URL-verified nhs.uk content cards
  cache/              File-cached cards for M13 9PL stage path

test/                 247 tests, 16 files, seam test guards engine→guardrail vocabulary
scripts/              probe-live.ts, demo-mock-profile.ts, demo-multi-profile.ts
ui/                   Claude Design artifact (Preventive Care.html + jsx app)
docs/                 UI integration guide + sample API response
source-verification.md   What's live, what's cached, what we never trust
```

---

## Tech stack

- **Backend:** TypeScript + `node:http` (zero runtime dependencies in the server). Vitest. Zod for input contracts.
- **LLM:** `glm-5.1` via the z.ai API. JSON-mode, temperature 0, hard char limits per surface.
- **Live data:** postcodes.io, NHS Spine Directory (ODS), Fingertips (PHE/OHID), hand-curated RTT-by-ICB.
- **Optional live data (key required):** NHS Service Search via Apigee — wired but gracefully degrades to cached-fallback without a key.
- **Frontend:** Static HTML + JSX (Claude Design artifact in `ui/`), calls `POST /api/nhs/full` once per page render.

---

## One-line summary

**A clinical engine that decides, an LLM that talks, and a guardrail layer that keeps them in their lanes — all running on real NHS data so the talking is grounded in what's actually in your area, what the NHS actually offers, and how long things actually take.**
## Z.ai / GLM-5.1 Integration

PreventPath uses GLM-5.1 via the Z.ai API (https://api.z.ai/v1 ) across five surfaces in the shipped product:

1. **GP-Ready Summary** — GLM-5.1 renders the rules engine output as plain English for patients to show their GP
2. **Simple / Detailed tone toggle** — two system prompts produce a patient-friendly and a clinical version of the same facts
3. **Factor chip explain** — clicking any of the 9 risk factor chips calls GLM-5.1 to explain why that factor matters for this specific patient
4. **Questions to ask your GP** — GLM-5.1 generates 3–4 tailored questions based on the patient's missing measurements
5. **Unlock narration** — when a patient adds a missing measurement, GLM-5.1 writes a sentence explaining which NHS pathway has now opened up

**Architecture**: The deterministic TypeScript rules engine makes every clinical decision. GLM-5.1 only writes the words. Every output passes a forbidden-token sweep that blocks any diagnosis, prescription, or invented risk percentage.

**Z.ai model**: GLM-5.1 Flash via api.z.ai/v1 — used for all five natural language rendering surfaces listed above.
