# NHS / public source verification

Last probed: **2026-06-06**. Re-run before the demo.

| # | Source | Endpoint tested | Status | Fields / shape confirmed | Verdict |
|---|---|---|---|---|---|
| 1 | postcodes.io | `GET https://api.postcodes.io/postcodes/M13%209PL` | **200** | `latitude`, `longitude`, `admin_district` ("Manchester"), `codes.admin_district` ("E08000003"), `lsoa`, `msoa`, `region` ("North West"), `nhs_ha`, `nhs_region`, `ccg` ("NHS Greater Manchester"), `icb` ("NHS Greater Manchester Integrated Care Board"), `cancer_alliance` ("Greater Manchester"), `parliamentary_constituency`, `admin_ward`, `country`, `outcode`, `incode`. **`imd` was NOT in the returned payload** — needs the separate `/postcodes/{p}/imd` endpoint, otherwise treat as absent. | **live-safe** |
| 2 | postcodes.io | `GET https://api.postcodes.io/postcodes/NOTAREALPOSTCODE` | **404** | clean error path | **live-safe** |
| 3 | NHS Website Content API (sandbox) | `GET https://sandbox.api.service.nhs.uk/nhs-website-content/conditions/` | **503** | sandbox unavailable on probe | **cache-it** |
| 4 | NHS Website Content API (sandbox) | `GET https://sandbox.api.service.nhs.uk/nhs-website-content/tests-and-treatments/` | **503** | sandbox unavailable on probe | **cache-it** |
| 5 | NHS Service Search (sandbox) | `GET https://sandbox.api.service.nhs.uk/service-search-api/?api-version=3&search=Bletchley&searchFields=Address3,City,County&$top=5` | **200** | OData shape: `@odata.count: 22`, `value: [{Address3, City, County, Latitude, Longitude, Postcode, Country, @search.score}, ...]`. **No API key was needed for the sandbox.** Production tier requires onboarding. | **live-safe in sandbox** + ship one cached row for the demo postcode |
| 6 | Fingertips / OHID | `GET https://fingertips.phe.org.uk/api/profiles` | **200** | JSON. **NHS Health Check profile: `Id=65`, `Name="NHS Health Check"`** | **live-safe** |
| 7 | Fingertips / OHID | `GET https://fingertips.phe.org.uk/api/area_types` | **200** | JSON. Current local-authority area type for post-Apr-2023 reporting: **`Id=502` ("Upper tier local authorities (post 4/23)")**. Older still-valid options: `Id=170` ("UA unchanged"), `Id=160` ("LA unchanged"). | **live-safe** |

## What we lean on live
- **postcodes.io** — postcode → location, NHS region, ICB, CCG, LSOA/MSOA. No key. Clean 404 on invalid input.
- **Fingertips** — `profileId=65` (NHS Health Check) and `areaTypeId=502` (upper-tier LA, post-April-2023) for the population-simulation tab.
- **NHS Service Search sandbox** — works today without a key. Used as primary for the demo, with a cached fallback row for the chosen demo postcode in case the sandbox flakes mid-run.

## What we serve from cache
- **NHS Website Content API** — sandbox returned `503` on both probes. We do not depend on it live; static content cards are shipped in the demo data pack.
- **A cached service-search row for the demo postcode** — pre-pulled so the demo survives a sandbox outage between rehearsal and stage.

## What we will never invent
- Personal clinical numbers (BP, cholesterol, CVD risk %) — if absent from input, the renderer reports the picture as incomplete and never fabricates a number.
- IMD — postcodes.io did not return it on the standard endpoint; treated as absent rather than guessed.
- Any field not present in the upstream payload.

## How to re-probe before the demo
```sh
curl -s -o /dev/null -w "%{http_code}\n" "https://api.postcodes.io/postcodes/M13%209PL"
curl -s -o /dev/null -w "%{http_code}\n" "https://fingertips.phe.org.uk/api/profiles"
curl -s -o /dev/null -w "%{http_code}\n" "https://sandbox.api.service.nhs.uk/service-search-api/?api-version=3&search=Bletchley&searchFields=Address3,City,County&\$top=5"
```
All three should print `200`. If any flips, update the **Verdict** column above and flip the corresponding `dataQuality` badge in the ingestion adapter to `cached`.
