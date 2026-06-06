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
- **IMD**: an earlier note said "imd was NOT in the returned payload." That was wrong — the field is named **`index_of_multiple_deprivation`** (not `imd`) and is present on the standard postcode lookup. Value for M13 9PL is `11725` (LSOA rank within England; lower = more deprived, 1..~32,844).
- **NHS Service Search sandbox**: an earlier note said "live-safe in sandbox + ship one cached fallback row." Wrong — the sandbox dataset is a tiny canned demo (~50 records, mostly dentists in scattered UK towns), `$filter` is silently ignored, and `City=Manchester` / `Postcode=M13` return zero results. Treat as **demo-only**; the cached pack is the primary source.

## How to re-probe before the demo
```sh
curl -s -o /dev/null -w "%{http_code}\n" "https://api.postcodes.io/postcodes/M13%209PL"
curl -s -o /dev/null -w "%{http_code}\n" "https://fingertips.phe.org.uk/api/profiles"
curl -s -o /dev/null -w "%{http_code}\n" "https://sandbox.api.service.nhs.uk/service-search-api/?api-version=3&search=Bletchley&searchFields=Address3,City,County&\$top=5"
```
All three should print `200`. If any flips, update the **Verdict** column above and flip the corresponding `dataQuality` badge in the ingestion adapter to `cached`.
