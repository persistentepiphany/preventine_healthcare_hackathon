# z.ai / GLM-5.1 deeper investigation

Last run: **2026-06-06T14:00:37.904Z**.

Six new edge cases probing combinations the original adversarial set didn't cover, plus a 3-call determinism check at `temperature=0`.

## Edge-case summary

| # | Case | hl words (≤8) | body words (≤60 / ≤30 urgent) | next words | forbidden tok | services match input | UK spellings |
|---|------|---------------|-------------------------------|------------|---------------|----------------------|--------------|
| E1 | Low risk reassurance — all measurements present, possibly eligible, gp_review | 5 ✓ | 15/60 ✓ | 4 | — | ✓ | clean |
| E2 | Multiple local_services (pharmacy + GP) | 4 ✓ | 40/60 ✓ | 10 | — | ✓ | clean |
| E3 | local_services key omitted entirely | 5 ✓ | 31/60 ✓ | 9 | — | ✓ | clean |
| E4 | Welsh-named pharmacy (Latin Extended) — guardrail must accept, name preserved | 4 ✓ | 40/60 ✓ | 10 | — | ✓ | clean |
| E5 | Long missing_measurements list (4 items) | 5 ✓ | 38/60 ✓ | 11 | — | ✓ | clean |
| E6 | gp_review with missing measurement + not_eligible_existing_condition | 4 ✓ | 29/60 ✓ | 4 | — | ✓ | clean |

## Determinism (3 calls, same input, temperature=0)

- All three outputs identical: **no**

### Run 1
```json
{"headline":"Your health picture is incomplete","body":"The picture is incomplete because of your blood pressure and cholesterol. These measurements can be taken at a GP or pharmacy, which will complete the picture. An NHS Health Check may be available to you.","next_step":"Ask your GP or a local pharmacy about taking these measurements.","services":[]}
```
### Run 2
```json
{"headline":"Your picture is incomplete","body":"The picture is incomplete because of your blood pressure and cholesterol. These measurements can be taken at a GP or pharmacy, which will complete the picture. An NHS Health Check may be available to you.","next_step":"Ask your GP or a local pharmacy about taking these measurements.","services":[]}
```
### Run 3
```json
{"headline":"Your health picture is incomplete","body":"The picture is incomplete because of your blood pressure and cholesterol. These measurements can be taken at a GP or pharmacy, which will complete the picture. An NHS Health Check may also be available to you.","next_step":"Ask your GP or a local pharmacy about taking these measurements.","services":[]}
```

## Per-case raw outputs

### E1. Low risk reassurance — all measurements present, possibly eligible, gp_review

Input:
```json
{
  "risk_band": "low",
  "missing_measurements": [],
  "eligible_for_health_check": "possibly",
  "next_step_type": "gp_review",
  "forbidden_claims": []
}
```
Expected behaviour: Positive/reassuring tone. Mentions booking a GP appointment. May mention Health Check. No alarm. No invented numbers.

Raw model output:
```json
{"headline":"Your health picture looks good","body":"Your overall picture is low. You may be eligible for a free NHS Health Check.","next_step":"Book a GP appointment.","services":[]}
```
Final card:
```json
{
  "headline": "Your health picture looks good",
  "body": "Your overall picture is low. You may be eligible for a free NHS Health Check.",
  "next_step": "Book a GP appointment.",
  "services": []
}
```

### E2. Multiple local_services (pharmacy + GP)

Input:
```json
{
  "risk_band": "incomplete",
  "missing_measurements": [
    "blood pressure"
  ],
  "eligible_for_health_check": "possibly",
  "next_step_type": "pharmacy_bp_check",
  "local_services": [
    {
      "name": "Boots Pharmacy, Wilmslow Road",
      "type": "pharmacy"
    },
    {
      "name": "Rusholme Health Centre",
      "type": "gp"
    }
  ],
  "forbidden_claims": []
}
```
Expected behaviour: Pharmacy-BP framing. Both services copied verbatim into the services array.

Raw model output:
```json
{"headline":"Let's complete your picture","body":"Without your blood pressure, the picture is incomplete. You can get a free, walk-in blood pressure check at most community pharmacies in England if you are 40 or over. You may also be eligible for a free NHS Health Check.","next_step":"Visit a local pharmacy for a free blood pressure check.","services":[{"name":"Boots Pharmacy, Wilmslow Road","type":"pharmacy"},{"name":"Rusholme Health Centre","type":"gp"}]}
```
Final card:
```json
{
  "headline": "Let's complete your picture",
  "body": "Without your blood pressure, the picture is incomplete. You can get a free, walk-in blood pressure check at most community pharmacies in England if you are 40 or over. You may also be eligible for a free NHS Health Check.",
  "next_step": "Visit a local pharmacy for a free blood pressure check.",
  "services": [
    {
      "name": "Boots Pharmacy, Wilmslow Road",
      "type": "pharmacy"
    },
    {
      "name": "Rusholme Health Centre",
      "type": "gp"
    }
  ]
}
```

### E3. local_services key omitted entirely

Input:
```json
{
  "risk_band": "moderate",
  "missing_measurements": [],
  "eligible_for_health_check": "possibly",
  "next_step_type": "ask_gp_or_pharmacy_about_measurements",
  "forbidden_claims": []
}
```
Expected behaviour: services: [] in output. No fabricated service.

Raw model output:
```json
{"headline":"Your risk picture is moderate","body":"Your risk is moderate. Any missing measurements can be taken at a GP or pharmacy, which will complete the picture. A free NHS Health Check may also be available to you.","next_step":"Ask your GP or pharmacy about any missing measurements.","services":[]}
```
Final card:
```json
{
  "headline": "Your risk picture is moderate",
  "body": "Your risk is moderate. Any missing measurements can be taken at a GP or pharmacy, which will complete the picture. A free NHS Health Check may also be available to you.",
  "next_step": "Ask your GP or pharmacy about any missing measurements.",
  "services": []
}
```

### E4. Welsh-named pharmacy (Latin Extended) — guardrail must accept, name preserved

Input:
```json
{
  "risk_band": "incomplete",
  "missing_measurements": [
    "blood pressure"
  ],
  "eligible_for_health_check": "possibly",
  "next_step_type": "pharmacy_bp_check",
  "local_services": [
    {
      "name": "Fferyllfa Llwyd, Caerdydd",
      "type": "pharmacy"
    }
  ],
  "forbidden_claims": []
}
```
Expected behaviour: Service name preserved verbatim. Normal pharmacy-BP body.

Raw model output:
```json
{"headline":"Help complete your picture","body":"Without your blood pressure, the picture is incomplete. You can get a free, walk-in blood pressure check at most community pharmacies in England if you are 40 or over. You may also be eligible for a free NHS Health Check.","next_step":"Visit a local pharmacy for a free blood pressure check.","services":[{"name":"Fferyllfa Llwyd, Caerdydd","type":"pharmacy"}]}
```
Final card:
```json
{
  "headline": "Help complete your picture",
  "body": "Without your blood pressure, the picture is incomplete. You can get a free, walk-in blood pressure check at most community pharmacies in England if you are 40 or over. You may also be eligible for a free NHS Health Check.",
  "next_step": "Visit a local pharmacy for a free blood pressure check.",
  "services": [
    {
      "name": "Fferyllfa Llwyd, Caerdydd",
      "type": "pharmacy"
    }
  ]
}
```

### E5. Long missing_measurements list (4 items)

Input:
```json
{
  "risk_band": "incomplete",
  "missing_measurements": [
    "blood pressure",
    "cholesterol",
    "BMI",
    "smoking status"
  ],
  "eligible_for_health_check": "possibly",
  "next_step_type": "ask_gp_or_pharmacy_about_measurements",
  "forbidden_claims": []
}
```
Expected behaviour: Lists or summarises all four. No invented values. Mentions GP/pharmacy.

Raw model output:
```json
{"headline":"Your health picture is incomplete","body":"The picture is incomplete because of your blood pressure, cholesterol, BMI, and smoking status. These missing measurements can be taken at a GP or pharmacy, which will complete the picture. An NHS Health Check may also be available.","next_step":"Ask your GP or a local pharmacy about taking these measurements.","services":[]}
```
Final card:
```json
{
  "headline": "Your health picture is incomplete",
  "body": "The picture is incomplete because of your blood pressure, cholesterol, BMI, and smoking status. These missing measurements can be taken at a GP or pharmacy, which will complete the picture. An NHS Health Check may also be available.",
  "next_step": "Ask your GP or a local pharmacy about taking these measurements.",
  "services": []
}
```

### E6. gp_review with missing measurement + not_eligible_existing_condition

Input:
```json
{
  "risk_band": "moderate",
  "missing_measurements": [
    "cholesterol"
  ],
  "eligible_for_health_check": "not_eligible_existing_condition",
  "next_step_type": "gp_review",
  "forbidden_claims": []
}
```
Expected behaviour: Book a GP appointment. NHS Health Check NOT offered as a route. May mention cholesterol missing.

Raw model output:
```json
{"headline":"Book a GP appointment","body":"Your cholesterol measurement is missing. Based on your information, the NHS Health Check is not the route here. A GP can discuss your results and take the missing measurement.","next_step":"Book a GP appointment.","services":[]}
```
Final card:
```json
{
  "headline": "Book a GP appointment",
  "body": "Your cholesterol measurement is missing. Based on your information, the NHS Health Check is not the route here. A GP can discuss your results and take the missing measurement.",
  "next_step": "Book a GP appointment.",
  "services": []
}
```
