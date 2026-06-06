export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const incompletePharmacyUser = {
  risk_band: "incomplete",
  missing_measurements: ["blood pressure", "cholesterol"],
  eligible_for_health_check: "possibly",
  next_step_type: "pharmacy_bp_check",
  local_services: [{ name: "Boots Pharmacy, Oxford Road", type: "pharmacy" }],
  forbidden_claims: ["your CVD risk is X%", "you have hypertension"],
};

const incompletePharmacyAssistant = {
  headline: "We need a couple of numbers first",
  body: "Without your blood pressure and cholesterol we can't give a complete picture. A free blood pressure check is available at most pharmacies in England if you're 40 or over — no appointment needed. You may also be eligible for a free NHS Health Check.",
  next_step: "Pop into a local pharmacy for a free blood pressure check.",
  services: [{ name: "Boots Pharmacy, Oxford Road", type: "pharmacy" }],
};

const urgentUser = {
  risk_band: "high",
  missing_measurements: [],
  eligible_for_health_check: "not_eligible_existing_condition",
  next_step_type: "urgent_care",
  local_services: [{ name: "Boots Pharmacy, Oxford Road", type: "pharmacy" }],
  forbidden_claims: ["you are having a heart attack", "take aspirin"],
};

const urgentAssistant = {
  headline: "Please get help now",
  body: "Based on what you've told us, you should speak to a clinician straight away. If this feels life-threatening, call 999. Otherwise use NHS 111 online at 111.nhs.uk or call 111.",
  next_step: "Call 999 if life-threatening; otherwise NHS 111.",
  services: [],
};

const smuggledUser = {
  risk_band: "moderate",
  missing_measurements: [],
  eligible_for_health_check: "possibly",
  next_step_type: "gp_review",
  diagnosis: "type 2 diabetes",
  prescribed_drug: "metformin 500mg",
  forbidden_claims: ["you have diabetes", "take metformin"],
};

const smuggledAssistant = {
  headline: "We can't show a personalised result right now",
  body: "We couldn't produce a tailored summary from your information. Your GP or local pharmacy can talk you through what's most useful next, including any free NHS checks you may be eligible for.",
  next_step: "Speak to your GP or a local pharmacy.",
  services: [],
};

export const FEW_SHOT_MESSAGES: ChatMessage[] = [
  { role: "user", content: JSON.stringify(incompletePharmacyUser) },
  { role: "assistant", content: JSON.stringify(incompletePharmacyAssistant) },
  { role: "user", content: JSON.stringify(urgentUser) },
  { role: "assistant", content: JSON.stringify(urgentAssistant) },
  { role: "user", content: JSON.stringify(smuggledUser) },
  { role: "assistant", content: JSON.stringify(smuggledAssistant) },
];
