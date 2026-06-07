# 🏥 PreventPath — NHS Preventive Care Navigator

> **VibeHack London 2026 · Track 1: Health Impact · Z.AI × Orbit Builder Workflow Award**

**PreventPath turns "I have some numbers and questions" into "here is the specific thing you can do tomorrow, and here is where to do it."**

Built on `glm-5.1` (Z.ai) as the patient-language layer over a deterministic clinical engine — so it feels like a friendly NHS navigator while behaving like a regulated clinical tool.

---

## 🎯 The Problem

Preventive care in the NHS is genuinely good — free pharmacy BP checks for 40+, the NHS Health Check programme, ICB-funded screening, walk-in services. **But most people don't know any of it exists or what they qualify for.**

They don't know whether their symptoms are urgent, what's worth telling a GP, where the nearest pharmacy that does a BP check is, or how long they'll wait. They land on the NHS website and bounce off because the navigation is built for the system, not for them.

Any tool that tries to fix this has to be **defensibly safe**. It can't invent diagnoses, fabricate risk percentages, or personalise area-level data into a fake personal prediction. The minute it does, it stops being preventive care and starts being a liability.

---

## 💡 The Solution

A clinical engine that **decides**, an LLM that **talks**, and a guardrail layer that keeps them in their lanes — all running on real NHS data so the talking is grounded in what's actually in your area, what the NHS actually offers, and how long things actually take.

### What a user gets back

| # | What you get | How it's powered |
|---|---|---|
| 1 | **Plain-English patient card** — headline + body + next step | Z.ai GLM-5.1 |
| 2 | **9-factor risk picture** — every preventive-care factor labelled `recorded / protective / unknown` | Deterministic rules engine |
| 3 | **NHS Health Check eligibility** — based on the 11-condition NHS exclusion list | Deterministic rules engine |
| 4 | **QRISK3 readiness** — what's missing to compute it (never fabricates a score) | Deterministic rules engine |
| 5 | **Real nearby NHS services** — GP practices, pharmacies, UTCs per postcode | NHS Spine Directory (ODS) — keyless, live |
| 6 | **Real local waiting times** — per-ICB monthly RTT % from NHS England | NHS England RTT statistics — live |
| 7 | **Real population health context** — 5 indicators per local authority | Fingertips (PHE/OHID) — keyless, live |
| 8 | **Verified NHS content links** — specific `nhs.uk` pages matching the patient's situation | Cached, URL-verified |
| 9 | **Honest data-quality badges** — `live / cached / synthetic / missing` on every panel | Per-adapter self-reporting |

---

## 🤖 Z.ai / GLM-5.1 Integration

Z.ai is the **patient-language layer**. Without it the engine outputs are clean but inert. GLM-5.1 is what turns those enums into something a person actually wants to read, click on, and follow up on.

It runs across **five distinct generative surfaces**, each with its own prompt, schema, and safety net:

| Surface | Endpoint | What GLM-5.1 produces |
|---|---|---|
| **GP Card** | `POST /api/nhs/gp-summary` | Headline + body + next-step in the patient's voice |
| **Tone Toggle** | `POST /api/nhs/gp-summary?tone=simple\|detailed` | Same card at year-9 reading age or clinical detail level |
| **Factor Explain** | `POST /api/nhs/factor-explain` | Personalised explanation when user taps a risk chip |
| **Questions to Ask** | `POST /api/nhs/questions-to-ask` | 3–4 tailored questions to bring to the next GP appointment |
| **Unlock Narration** | `POST /api/nhs/unlock-narration` | One sentence narrating when a missing measurement is added |

### Why GLM-5.1 is allowed to be expressive

- The engine projects every patient input into structured enums before GLM-5.1 sees anything. **It never sees raw measurements.**
- Every output is **schema-validated** and **forbidden-token-swept** — `diagnos`, `prescrib`, `%`, `hypertension`, `diabetes`, `heart attack`, `stroke`, etc.
- Urgent-route cards are swept a second time — "preventive", "health check", "pharmacy" must not appear when the patient has a red-flag symptom.
- Every surface has its own **safe-fallback payload** so if Z.ai is down, the user still gets a useful response.
- The test suite (`test/seam.test.ts`) cross-checks that every engine-forbidden claim is catchable by an existing guardrail token. **Build fails if they diverge.**

---

## 🏗️ Architecture

| Layer | What it does |
|---|---|
| **Contracts** `src/contracts/` | Zod-validated PatientInput + LocalPreventiveContext |
| **Rules Engine** `src/rules/` | Deterministic clinical decisions — no LLM in this path |
| **Ingestion** `src/ingestion/` | Promise.allSettled — one dead source can't sink the rest |
| **Rendering** `src/rendering/` | **Z.ai GLM-5.1 lives here** — 5 renderers + guardrails + fallbacks |
| **HTTP** `src/http/` | Dep-free node:http server · 10 endpoints · CORS |

### Clinical routing — deterministic, no LLM

| Route | When triggered |
|---|---|
| `urgent_care` | Red-flag symptom — Call 999 / NHS 111. Preventive framing suppressed. |
| `pharmacy_bp_check` | Adult ≥40, no hypertension, BP not checked in 6 months |
| `ask_gp_or_pharmacy_about_measurements` | Any routine measurement missing |
| `gp_review` | All measurements present, no red flags |

### Live data — 4 APIs, zero keys required for `mode=light`

| Source | Key? | What we use |
|---|---|---|
| **postcodes.io** | No | postcode → ICB, lat/lng, ONS codes |
| **NHS Spine Directory (ODS )** | No | Real GP / pharmacy / NHS-trust listings per postcode |
| **Fingertips (PHE/OHID)** | No | 5 public-health indicators per local authority |
| **RTT-by-ICB** | No | Per-ICB monthly % within 18 weeks (24 verified codes) |

---

## 🛡️ Safety Properties (tested, not promised)

- **Never invent a number.** No fabricated CVD risk %, no made-up waiting time.
- **Never personalise area-level data.** Waiting times carry hardcoded `isPersonalPrediction: false`.
- **Never give a diagnosis.** Engine emits `forbidden_claims`; seam test cross-checks guardrail covers every one. Build fails if they diverge.
- **Urgent override beats preventive framing.** Second guardrail sweep on urgent-route cards.
- **Honest data-quality badges.** Every panel shows live vs cached vs synthetic vs missing.

---

## ✅ Live Verification — 16 UK Postcodes (probed 2026-06-06)

| Postcode | Area | Services | Population | Waiting times |
|---|---|---|---|---|
| M13 9PL | Manchester | 21 live | live | 58.4% |
| B1 1BB | Birmingham | 24 live | live | 56.2% |
| LS1 4DT | Leeds | 24 live | live | 60.7% |
| L1 8JQ | Liverpool | 24 live | live | 56.9% |
| BS1 1AD | Bristol | 24 live | live | 62.4% |
| NE1 4ST | Newcastle | 24 live | live | 54.6% |
| SW1A 1AA | Westminster | 3 live | live | 61.2% |
| E1 6AN | City of London | 24 live | live | 57.5% |
| CF10 1EP | Cardiff | 14 live | missing¹ | cached² |
| EH1 1YZ | Edinburgh | 3 live | missing¹ | cached² |

¹ Fingertips is England-only. ² Generic NHS-wide prose, not wrong-area data.

---

## 🚀 Running It

```bash
npm install
PORT=3000 npx tsx src/http/server.ts

# Light mode — fully live, no key required
curl "http://localhost:3000/api/nhs/context?postcode=M13%209PL&mode=light"

# Full test suite (259 tests )
SEAM_STUB=1 npm test
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | TypeScript + `node:http` (zero runtime dependencies ) |
| **Validation** | Zod |
| **Testing** | Vitest — 259 tests, 16 files |
| **LLM** | `glm-5.1` via Z.ai API — JSON-mode, temperature 0 |
| **Live data** | postcodes.io · NHS ODS · Fingertips · RTT-by-ICB |
| **AI build workflow** | Z.ai GLM-5.1 via VS Code Continue + Manus AI for UI generation |

---

## 👥 Team

Built at **VibeHack London 2026** in 24 hours by a team of three.

---

## 📄 One-Line Summary

**A clinical engine that decides, an LLM that talks, and a guardrail layer that keeps them in their lanes — all running on real NHS data.**
