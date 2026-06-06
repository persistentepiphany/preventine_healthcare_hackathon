# UI ↔ backend integration guide

This document walks the Claude Design artifact through wiring up to the
PreventPath backend. Everything you need is in this file plus
`docs/ui-api-client.js`.

The TL;DR is two endpoints:

1. `GET  /api/nhs/context?postcode=…` — geography + nearby NHS services +
   waiting-time context + curated NHS content cards + (synthetic) population
   notes. Drives the "your location" header and the right-hand panels.
2. `POST /api/nhs/profile` — runs the full pipeline (rules engine → bridge →
   factor projection → LLM-rendered safety card) for a patient. Drives the
   factor chips, the readiness ring, the GP-summary card, eligibility, and
   QRISK readiness.

There are also four LLM-rendered sub-endpoints (`/api/nhs/gp-summary`,
`/api/nhs/factor-explain`, `/api/nhs/questions-to-ask`,
`/api/nhs/unlock-narration`) — these are convenience pieces if the UI wants
per-factor explanations, copy-pasteable GP questions, or a celebration
when the patient unlocks a previously-missing measurement. Skip them on
v1; `/api/nhs/profile` is enough to get the dashboard live.

---

## 0. Where to host the backend

The downloaded Claude Design artifact runs locally (file:// or a localhost
dev server). The backend is a dep-free `node:http` process. Pick one:

| Option | When | How |
|---|---|---|
| Same-machine localhost | Demo on the dev laptop | `npx tsx src/http/server.ts` — defaults to `0.0.0.0:3000`. Open the artifact and `setApiBase("http://localhost:3000")`. |
| Tunnel (ngrok / Cloudflare Tunnel) | Demo from a different machine | `npx tsx src/http/server.ts` + `ngrok http 3000`. Use the public URL in `setApiBase()`. CORS is permissive by default. |
| Deployed (Fly.io / Railway / Render) | Long-running demo | Containerise `node dist/http/server.js` after `npm run build`. Set `HOST=0.0.0.0`, `PORT=<assigned>`. |

The server reads two env vars:
- `HOST` — bind address, defaults to `0.0.0.0`.
- `PORT` — defaults to `3000`.
- `CORS_ORIGINS` — comma-separated allowlist. Unset / empty / `*` →
  permissive (Allow-Origin echoes the request Origin). When set, non-listed
  origins get 403 on preflight.

---

## 1. Get the client into the artifact

The Claude Design HTML downloads as a single file. You have two options:

**Option A — keep `ui-api-client.js` as a sibling file.** Open the artifact
HTML; add `<script type="module" src="./ui-api-client.js"></script>` just
before the `<script>` block that drives the page. Now your scripts can
`import { fetchProfile } from "./ui-api-client.js"`.

**Option B — inline.** Paste the contents of `docs/ui-api-client.js` into
the page's `<script>` block (after stripping the `export` keywords and
flattening into one namespace). Less elegant but works in artifacts that
can't reference external files.

Either way, at startup call `setApiBase("http://…")` once.

---

## 2. Map your form to `PatientInput`

The seam expects these fields. Required fields are bold; optional fields
(measurements + `sexAtBirth`) drive whether a factor shows as "recorded"
or "unknown".

```ts
{
  age: number,                                  // **required**, 0–120
  livesInEngland: boolean,                      // **required**
  sexAtBirth?: "male" | "female" | "intersex" | "prefer_not_to_say",

  // NHS Health Check exclusions — **required** booleans
  hasCvd, hasChronicKidneyDisease, hasDiabetes, hasHypertension,
  hasAtrialFibrillation, hasStrokeOrTia, hasFamilialHypercholesterolaemia,
  hasHeartFailure, hasPeripheralArterialDisease, onStatins,
  previousHighCvdRisk: boolean,

  // Measurements — optional. Undefined → factor shows as "unknown".
  systolicBp?: number,
  diastolicBp?: number,
  totalCholesterol?: number,
  hdlCholesterol?: number,
  bmi?: number,
  waistCircumferenceCm?: number,
  smokingStatus?: "never" | "former" | "current",

  // **required**
  bpCheckedLast6Months: boolean,

  // Red-flag symptoms — **required** booleans. Any true → urgent_care route.
  chestPain: boolean,
  strokeSymptoms: boolean,
  severeBreathlessness: boolean,
}
```

Start from `emptyPatientInput()` in `ui-api-client.js`, merge your form
fields in, then call `fetchProfile({ patient, postcode })`. If the seam
validation fails the response is `{ ok: false, status: 400, error: "invalid patient", issues: [...] }`
— each issue has a `path` you can highlight in the form.

---

## 3. Render the profile response

```js
const result = await fetchProfile({ patient, postcode: "M13 9PL" });
if (!result.ok) { /* render error/loading/empty state */ return; }
const profile = result.data;
```

`profile` has these fields:

| UI element | Field | Type |
|---|---|---|
| Source badge (live / cache / safe-fallback) | `profile.source` | enum |
| GP-summary card text | `profile.card.headline`, `.body`, `.next_step` | strings |
| Services list (under the card) | `profile.card.services` | `[{name, type, address?}]` |
| 9 factor chips | `profile.factors` | `[{id, status, priority, label, statusLabel, whyItMatters, nhsUrl}]` |
| Readiness ring (percent + counts) | `profile.readiness` | `{total, recorded, protective, unknown, percent}` |
| Eligibility tag | `profile.eligibility.status` | enum |
| Next-step pill | `profile.nextStep` | enum |
| QRISK readiness chip | `profile.qrisk.ready` + `profile.qrisk.missingInputs` | `boolean + string[]` |
| Screening matches list | `profile.screening` | `[{type, status}]` |
| "Missing X" reminders | `profile.missing` | `string[]` |
| Urgent banner (red) | `profile.urgencyLevel === "emergency"` | bool |

The factor `status` is one of:
- `"recorded"` — patient gave us a value
- `"protective"` — patient gave us a value AND it's the favourable state (no condition / non-smoker)
- `"unknown"` — patient field is undefined

The factor `priority` is `"high" | "medium" | "low"`. Use it to size the
chip / pick a colour ramp.

If `profile.source === "safe_fallback"`, the LLM card content is the
generic fallback text — display a small "personalised summary unavailable"
banner so the user knows their card isn't tailored. Everything else in the
profile (factors, readiness, eligibility, etc.) is still derived
deterministically and is safe to show.

If `profile.nextStep === "urgent_care"` (or `urgencyLevel === "emergency"`):
- `card.services` is `[]` and the card text is the safe urgent message.
- Hide the local-services panel.
- Hide the NHS Health Check eligibility chip — it'll be `"not_applicable"`.
- Promote the card to the top of the page; consider a red banner.

---

## 4. Loading / error / empty states

| Condition | What to render |
|---|---|
| Request in-flight | Skeleton: ring outline, 9 dim chip placeholders, dim card |
| `result.ok === false && result.status === 0` | "Network issue — backend unreachable. Check your connection or the API URL." |
| `result.ok === false && result.status === 400` | "We couldn't read that form" + list `result.issues[].path` and `.message` |
| `result.ok === false && result.status === 404` (postcode endpoint) | "We couldn't find that postcode. Try again or skip this step." |
| `result.ok === true && profile.source === "safe_fallback"` | Show the dashboard but with a "personalised summary unavailable" banner over the card |
| `profile.urgencyLevel === "emergency"` | Replace the dashboard with the urgent card and a 999/111 panel; hide everything else |
| `profile.factors[].status === "unknown"` | Show the chip as a dashed outline with `statusLabel` ("Missing") and a CTA "How to get this checked" linking to `nhsUrl` |
| `profile.screening.length === 0` | Hide the screening list entirely; don't render an empty state |
| `profile.qrisk.ready === false && profile.qrisk.missingInputs.length > 0` | "QRISK estimate not yet ready — fill in: X, Y" |

---

## 5. The "data quality" badges (from `/api/nhs/context`)

`/api/nhs/context` returns a `dataQuality` block:

```json
{
  "postcode": "live" | "failed",
  "services": "live" | "cached" | "mock" | "failed",
  "waitingTimes": "live" | "cached" | "mock" | "failed",
  "officialContent": "live" | "cached" | "failed",
  "population": "live" | "cached" | "synthetic" | "not_loaded"
}
```

Use `dataQualityBadge(value)` from the client to map each enum to
`{label, tone}` for a corner badge per panel. Helps reviewers see what's
real vs. cached vs. synthetic at a glance.

---

## 6. Worked example — minimal page

```html
<script type="module">
  import {
    setApiBase, fetchContext, fetchProfile, emptyPatientInput
  } from "./ui-api-client.js";

  setApiBase("http://localhost:3000");

  const patient = emptyPatientInput();
  patient.age = 52;
  patient.livesInEngland = true;
  // BP missing on purpose — chip will show "unknown"
  patient.totalCholesterol = 5.1;
  patient.hdlCholesterol = 1.4;
  patient.bmi = 26;
  patient.smokingStatus = "former";
  patient.bpCheckedLast6Months = false;

  const [ctx, profile] = await Promise.all([
    fetchContext("M13 9PL"),
    fetchProfile({ patient, postcode: "M13 9PL" }),
  ]);

  if (!profile.ok) {
    document.body.textContent = `error ${profile.status}: ${profile.error}`;
  } else {
    document.querySelector("#headline").textContent = profile.data.card.headline;
    document.querySelector("#body").textContent = profile.data.card.body;
    document.querySelector("#nextStep").textContent = profile.data.card.next_step;
    document.querySelector("#readiness").textContent =
      `${profile.data.readiness.recorded + profile.data.readiness.protective} of ${profile.data.readiness.total} recorded`;
    for (const f of profile.data.factors) {
      const li = document.createElement("li");
      li.textContent = `${f.label}: ${f.statusLabel}`;
      document.querySelector("#factors").appendChild(li);
    }
  }
</script>
```

---

## 7. Sessions — local draft persistence

The backend ships a tiny file-backed session store so the UI can save the
patient draft across page reloads without standing up a database. Each
session is a JSON file under `data/sessions/<uuid>.json` (gitignored,
unencrypted, 24h TTL by default). **Do not use this with real patient
data** — it's intended for the demo laptop only.

### Lifecycle

```js
import {
  createSession, loadSession, patchSession, clearSession
} from "./ui-api-client.js";

// First load
let session = (await createSession({ patient: { livesInEngland: true } })).data;
localStorage.setItem("sid", session.id);

// Later
const sid = localStorage.getItem("sid");
const r = await loadSession(sid);
if (!r.ok && r.status === 404) {
  // TTL expired — start fresh
  const fresh = await createSession();
  localStorage.setItem("sid", fresh.data.id);
}

// On form change
await patchSession(sid, { patient: { systolicBp: 122 } });

// On "Clear demo data" button
await clearSession(sid);
localStorage.removeItem("sid");
```

### When to call which

| Action | Call |
|---|---|
| Page first load, no session in localStorage | `createSession({ patient, postcode })` then save `.id` |
| Page load with `sid` in localStorage | `loadSession(sid)` — on 404, create fresh |
| User edits a field | `patchSession(sid, { patient: { [field]: value } })` |
| User edits postcode | `patchSession(sid, { postcode })` |
| Before calling `/api/nhs/profile` | merge session's `patient` into the body OR rely on UI state directly — sessions are persistence, not a request transport |
| After rendering profile | `patchSession(sid, { previouslyMissing: profile.missing })` so the next call to `/api/nhs/unlock-narration` can diff |
| "Reset / clear demo" | `clearSession(sid)` |
| Show "saved drafts" admin | `listSessions()` — id + updatedAt only |

### Server env vars

- `SESSION_TTL_MS` (default 86_400_000 = 24h) — how long a session lives before being pruned on next read.
- `SESSION_MAX_COUNT` (default 500) — soft cap; on each create() the oldest are pruned past this.

### Safety

- The store rejects any session id that isn't UUID-shaped — protects against
  path traversal (`../../etc/passwd`).
- Atomic writes (`write-temp + rename`) — a crashed write leaves either the
  old file or the new file, never a half-written JSON.
- `data/sessions/` is in `.gitignore`. Don't ever push patient data to
  origin.

## 8. Safety contract reminder

The backend is built so that any free text reaching the user has been
either:

- generated by the LLM and screened by the renderer's forbidden-token list, OR
- engineer-authored in `data/ui-vocabulary.json` and `data/officialContentCards.json` against the same discipline.

Do **not** concatenate your own clinical-sounding strings with API output.
Use `card.body` verbatim. Use `factor.whyItMatters` verbatim. If you need a
new short phrase, add it to `data/ui-vocabulary.json` first so the
regression tests sweep it.
