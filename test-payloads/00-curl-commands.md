# Sample patient inputs for testing

Seven scenarios covering every route and edge case. Each JSON file has a
`_meta` block describing the scenario + expected outcome, then a top-level
`patient` + `postcode` ready for the `/api/nhs/full` endpoint.

| # | File | Postcode | Scenario | Expected route |
|---|---|---|---|---|
| 1 | `01-routine-review-manchester.json` | M13 9PL | All measurements present, no red flags | `gp_review` |
| 2 | `02-pharmacy-bp-westminster.json` | SW1A 1AA | Missing BP, 40+ in England | `pharmacy_bp_check` |
| 3 | `03-ask-gp-leeds.json` | LS1 4DT | BP recorded, cholesterol missing | `ask_gp_or_pharmacy_about_measurements` |
| 4 | `04-urgent-chest-pain.json` | M13 9PL | Red-flag symptom | `urgent_care` (services must be empty) |
| 5 | `05-not-eligible-diabetic-bristol.json` | BS1 1AD | Diabetes diagnosis | Health Check NOT applicable |
| 6 | `06-age-out-newcastle.json` | NE1 4ST | Age 32 (under 40) | Not age-eligible |
| 7 | `07-edinburgh-scotland.json` | EH1 1YZ | Scotland — Fingertips degrades to missing | Honest degradation |

## Running them

### Against local server

```bash
# Boot
PORT=3000 npx tsx src/http/server.ts &

# Per-scenario probe (light mode = fully live, no key)
for f in samples/0[1-7]-*.json; do
  echo "=== $f ==="
  curl -s -X POST "http://localhost:3000/api/nhs/full?mode=light" \
    -H "content-type: application/json" \
    -d "@$f" | jq '{
      mode,
      source: .profile.source,
      route: .profile.nextStep,
      headline: .profile.card.headline,
      next_step: .profile.card.next_step,
      services: (.context.services // [] | length)
    }'
  echo ""
done
```

### Against the deployed API

Replace the URL:

```bash
curl -s -X POST "https://preventive-api-production.up.railway.app/api/nhs/full?mode=light" \
  -H "content-type: application/json" \
  -d @samples/01-routine-review-manchester.json | jq .
```

### Single one-liner (most useful for demo)

```bash
curl -s -X POST "http://localhost:3000/api/nhs/full?mode=light" \
  -H "content-type: application/json" \
  -d @samples/02-pharmacy-bp-westminster.json | jq '.profile.card'
```

## Notes

- The `_meta` block is decorative — the backend's Zod parser ignores unknown
  fields at the top level of the request body (it only reads `patient` and
  `postcode`).
- `mode=light` is fully live with no API key. The card will be a deterministic
  template card if z.ai is out of balance, or a z.ai-generated card if z.ai is
  available — either way you get a real patient-readable card, not the generic
  apology fallback.
- `mode=demo` uses cached data for everything; useful for stage when
  upstreams might be flaky.
- `mode=full` adds NHS Service Search via `NHS_API_KEY`. Without the key,
  services degrade to `cached-fallback` cleanly.
