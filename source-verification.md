# NHS / public source verification

Last probed: **2026-06-06**. Re-run before the demo.

| # | Source | Endpoint tested | Status | Fields / shape confirmed | Verdict |
|---|---|---|---|---|---|
| 1 | postcodes.io | `GET https://api.postcodes.io/postcodes/M13%209PL` | **200** | `latitude` (53.466926), `longitude` (-2.233578), `admin_district` ("Manchester"), `codes.admin_district` ("E08000003"), `lsoa` ("Manchester 018F"), `msoa`, `region` ("North West"), `nhs_ha`, `nhs_region`, `ccg` ("NHS Greater Manchester"), `icb` ("NHS Greater Manchester Integrated Care Board"), `cancer_alliance` ("Greater Manchester"), `parliamentary_constituency`, `admin_ward`, `country`, `outcode`, `incode`, **`index_of_multiple_deprivation` (11725 — LSOA rank)**. | **live-safe** |
| 2 | postcodes.io | `GET https://api.postcodes.io/postcodes/NOTAREALPOSTCODE` | **404** | clean error path | **live-safe** |
| 3 | NHS Website Content API (sandbox) | `GET https://sandbox.api.service.nhs.uk/nhs-website-content/conditions/` | **503** | sandbox unavailable on probe | **cache-it** |
| 4 | NHS Website Content API (sandbox) | `GET https://sandbox.api.service.nhs.uk/nhs-website-content/tests-and-treatments/` | **503** | sandbox unavailable on probe | **cache-it** |
| 5 | NHS Service Search (sandbox) | `GET https://sandbox.api.service.nhs.uk/service-search-api/?api-version=3&...` | **200** but unusable | Sandbox responds JSON, but **the dataset is a ~50-record canned demo** (mostly dentists in Herts / Shropshire / Walsall / Bognor / Penzance / Liverpool / Glasgow / Newport). **`$filter` is silently ignored** (geospatial queries return the same demo set regardless of POINT). **`$top` is capped at 50.** Search by `City=Manchester` returns **0 results**; search by `Postcode=M13` returns **0**. The earlier "200" verdict was a false positive — Bletchley/MK happens to be in the canned demo set. | **demo-only — cached fallback pack is load-bearing** |
| 6 | Fingertips / OHID | `GET https://fingertips.phe.org.uk/api/profiles` | **200** | JSON. **NHS Health Check profile: `Id=65`, `Name="NHS Health Check"`** | **live-safe** |
| 7 | Fingertips / OHID | `GET https://fingertips.phe.org.uk/api/area_types` | **200** | JSON. Current local-authority area type for post-Apr-2023 reporting: **`Id=502` ("Upper tier local authorities (post 4/23)")**. Older still-valid options: `Id=170` ("UA unchanged"), `Id=160` ("LA unchanged"). | **live-safe** |

## What we lean on live
- **postcodes.io** — postcode → location, NHS region, ICB, CCG, LSOA/MSOA, IMD rank. No key. Clean 404 on invalid input.
- **Fingertips** — `profileId=65` (NHS Health Check) and `areaTypeId=502` (upper-tier LA, post-April-2023) for the population-simulation tab.

## What we serve from cache / synthetic
- **NHS Website Content API** — sandbox returned `503` on both probes. Static content cards are shipped in the demo data pack.
- **NHS Service Search (DoHS)** — sandbox is functional but ships only a ~50-record canned demo; `$filter` is ignored. The cached `demoServices.json` pack (owned by the parallel ingestion task) is now **load-bearing** for any postcode the demo cares about. Surface `dataQuality.services = "cached"` so judges see the honest picture.

## What we will never invent
- Personal clinical numbers (BP, cholesterol, CVD risk %) — if absent from input, the renderer reports the picture as incomplete and never fabricates a number.
- Any field not present in the upstream payload.

## Corrections to earlier verdicts
- **IMD**: an earlier note said "imd was NOT in the returned payload." That was wrong — the field is named **`index_of_multiple_deprivation`** (not `imd`) and is present on the standard postcode lookup. Value for M13 9PL is `11725` (LSOA rank within England; lower = more deprived, 1..~32,844). Re-probed `GET /postcodes/M13%209PL` on 2026-06-06 — field is genuinely present, settling the verdict as **field-name mismatch**, not absence. NOTE: postcodes.io does NOT expose a `/postcodes/{p}/imd` sub-endpoint (returns 404); the field is on the main lookup. The ingestion adapter deliberately field-picks AWAY from IMD anyway (`src/ingestion/postcode.ts` IMD GUARD): a single LSOA rank without national normalisation is too easy to misuse in a patient-facing card, and the project rule is no deprivation claims in any rendered text.
- **NHS Service Search sandbox**: an earlier note said "live-safe in sandbox + ship one cached fallback row." Wrong — the sandbox dataset is a tiny canned demo (~50 records, mostly dentists in scattered UK towns), `$filter` is silently ignored, and `City=Manchester` / `Postcode=M13` return zero results. Treat as **demo-only**; the cached pack is the primary source. Re-probed 2026-06-06 with a geospatial POINT query against the real M13 9PL coords (`$filter=geo.distance(Geocode,POINT(-2.233578 53.466926)) le 10`) — same 50-record canned set returned, zero Manchester rows, Bognor Regis / Penzance / Liverpool / Glasgow as before. Verdict stands: cached `data/demoServices.json` is load-bearing and dataQuality.services surfaces "cached".

## How to re-probe before the demo
```sh
curl -s -o /dev/null -w "%{http_code}\n" "https://api.postcodes.io/postcodes/M13%209PL"
curl -s -o /dev/null -w "%{http_code}\n" "https://fingertips.phe.org.uk/api/profiles"
curl -s -o /dev/null -w "%{http_code}\n" "https://sandbox.api.service.nhs.uk/service-search-api/?api-version=3&search=Bletchley&searchFields=Address3,City,County&\$top=5"
```
All three should print `200`. If any flips, update the **Verdict** column above and flip the corresponding `dataQuality` badge in the ingestion adapter to `cached`.

## What changed (2026-06-06, mode + live wiring)

- **Fingertips wired live** via `src/ingestion/population.ts → fetchPopulationContextLive`. The bulk endpoint `/api/latest_data/all_indicators_in_profile_group_for_child_areas?profile_id=65&group_id=1938132701&area_type_id=502&parent_area_code=E92000001` is hit once per process per day (24h in-memory memo via `src/lib/memo.ts`); per-area lookups are then O(1) by `codes.admin_district`. Five engineer-curated indicators are surfaced: life expectancy, smoking, overweight/obesity, physical activity, diabetes diagnosis rate. IID 93553 (Deprivation score) is INTENTIONALLY excluded — same rule as the IMD guard in postcode.ts. Bulk fetch is ~2.8 MB and takes 10–12 s cold; timeout pinned at 20s.
- **NHS Service Search live** wired but gated on `NHS_API_KEY` env var in `src/ingestion/services.ts → fetchNearbyServicesLive`. Without the key, mode=full degrades services to `dataQuality:"cached-fallback"` (with a one-shot stderr warning). With the key, hits the production Apigee endpoint with a 5 km geo.distance filter at the resolved lat/lng and maps SearchType to our flat taxonomy.
- **RTT-by-ICB shipped** as a hand-curated `data/rttByIcb.json` (~16 ICBs, sourced from the April 2026 NHS England RTT release). `getWaitingTimeContextForIcb()` produces an honest per-ICB "% within 18 weeks" line; `dataQuality.waitingTimes = "live-aggregate"`. Disclaimer + `isPersonalPrediction:false` invariant preserved.
- **Mode toggle** (`?mode=demo|light|full`) added to `/api/nhs/context`, `/api/nhs/profile`, `/api/nhs/gp-summary`, and a new aggregate `/api/nhs/full`. Default `demo`. `light` = postcode + Fingertips + RTT live. `full` = light + Service Search (if key) + forced live z.ai render.
- **dataQuality vocab extended**: `"live-aggregate"` (real but monthly-aggregate signal) and `"cached-fallback"` (live attempted, upstream failed → cached pack returned with a different badge from plain "cached").
- **postcodes.io field extraction extended**: location now carries `adminDistrictCode` and `icbCode` (the ONS codes, not just names). These gate the Fingertips and RTT lookups respectively.
- **Per-request log line** added in `src/http/server.ts` via `src/http/log.ts` — stderr, one line per request: timestamp, method, path, status, total ms, mode if set. Set `LOG_REQUESTS=0` to silence (used by tests).
- **Smoke probe** at `scripts/probe-live.ts` — boots dispatch in-process and runs every postcode × mode combo; prints a dataQuality+latency table. Use before a demo to confirm upstream state.

### Re-probe specifically for the new live paths

```sh
# Fingertips bulk endpoint
curl -s -o /dev/null -w "%{http_code} %{size_download}b\n" -H "Accept: application/json" \
  "https://fingertips.phe.org.uk/api/latest_data/all_indicators_in_profile_group_for_child_areas?profile_id=65&group_id=1938132701&area_type_id=502&parent_area_code=E92000001"

# ODS open endpoint — no key
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations?PostCode=M13%209PL&PrimaryRoleId=RO182&Status=Active&Limit=5"

# Smoke probe (boots dispatcher in-process, no HTTP server needed)
npx tsx scripts/probe-live.ts
```

## What changed (2026-06-06, ODS live services + ICB code fixes)

- **ODS live services wired** (`src/ingestion/services.ts → fetchNearbyServicesViaODS`). Open Spine Directory endpoint `directory.spineservices.nhs.uk/ORD/2-0-0/organisations` — no API key, no onboarding. Three parallel role-keyed queries per outward postcode: RO177 (Prescribing Cost Centres = GP practices), RO182 (Pharmacies), RO198 (NHS Trust Sites = hospitals + UTCs). Memoized 24h per outward code. Wired into `mode=light` so the demo gets real NHS organisation names + postcodes nationwide without any key.
- **`titleCase()`** converts ODS's ALL-CAPS names to title case, preserving common acronyms (NHS, GP, MRI, UTC, A&E, PCN) and handling ampersand-joined initialisms ("W&B" stays "W&B").
- **24 ICB codes verified live** via postcodes.io and shipped in `data/rttByIcb.json`. Every English ICB now resolves to a live-aggregate % within 18 weeks. Earlier file had several guessed codes that didn't match — now every code was verified against a real probe.
- **Devolved-nation sentinel handling** in `src/ingestion/postcode.ts` — extended the sentinel-code filter from `E99999999` to any `[A-Z]99999999`. Scotland/Wales/NI postcodes resolve their `adminDistrictCode` and `icbCode` to `null` (not the sentinel), so the orchestrator falls back to generic-prose waiting times and "missing" population without surfacing wrong-area Manchester data.
- **Mode=light is now fully live**: postcode → postcodes.io live, services → ODS live, population → Fingertips live, waiting times → RTT-by-ICB live-aggregate. **No API key required.** `mode=full` adds Service Search live on top when `NHS_API_KEY` is set; without the key it degrades services to `cached-fallback`.
- **Population fallback now postcode-aware** — Edinburgh / Cardiff / Belfast get a clean `"missing"` rather than the Manchester synthetic pack.

### Coverage tested (16 postcodes, 2026-06-06)

All major English ICBs return live data:
Manchester, Birmingham, Leeds, Liverpool, Bristol, Newcastle, Plymouth, Brighton, Westminster, Nottingham, Oxford, Cambridge — all `dataQuality.services="live"` + `population="live"` + `waitingTimes="live-aggregate"`.

Devolved nations degrade honestly:
Cardiff (Wales), Edinburgh (Scotland), Belfast (NI) — services still live (ODS covers them), population "missing", waiting "cached" (generic NHS-wide prose, not wrong-area Manchester).

### Known limitations

- Some English UTLA codes have been re-issued by ONS (e.g. Sheffield postcodes.io returns `E08000039` but Fingertips data is indexed under the older `E08000019`). For these postcodes population shows `"missing"` rather than falling back to wrong data. A future fix would maintain a translation table.
- ODS lookup is by outward postcode (e.g. "M13"), not coordinates. It returns real organisations but doesn't rank by walking distance. For geo-ranked results, a Service Search key (mode=full) is required.
