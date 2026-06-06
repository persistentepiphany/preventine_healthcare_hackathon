/* Preventive Care — synthetic demo data layer.
   Everything here is clearly synthetic / pre-loaded for demonstration.
   Mirrors the public-data strategy: postcodes.io geography, NHS Health Check
   rules, cached service + waiting-time samples. No live calls in the prototype. */

window.PPFallback = window.PPFallback || {};
window.PPFallback.STATIC_DATA = (function () {
  // ---- The pre-loaded demo patient -------------------------------------
  const patient = {
    name: "James Whitfield",
    initials: "JW",
    age: 52,
    sex: "Male",
    ethnicity: "White British",
    postcode: "M13 9PL",
    livesInEngland: true,
    location: {
      latitude: 53.4668,
      longitude: -2.23,
      localAuthority: "Manchester",
      localAuthorityCode: "E08000003",
      icb: "NHS Greater Manchester ICB",
      nhsRegion: "North West",
      lsoa: "Manchester 035C",
      imdDecile: 2, // 1 = most deprived
    },
    // Conditions that would exclude from the standard NHS Health Check route
    conditions: [], // none recorded
    medications: [], // none recorded
    lifestyle: {
      smoking: "Ex-smoker — quit 2019 (20 pack-years)",
      smokingFlag: "history",
      alcohol: "~16 units / week",
      alcoholFlag: "raised",
      activity: "Low — mostly sedentary",
      activityFlag: "raised",
      familyHistory: "Father — heart attack, age 58",
      familyHistoryFlag: "raised",
    },
  };

  // ---- Measurements: the heart of the missing-data story ---------------
  // status: good | raised | high | missing
  const measurements = [
    {
      id: "bp",
      label: "Blood Pressure",
      icon: "heart",
      color: "#FF2D55",
      value: null,
      unit: "mmHg",
      status: "missing",
      statusLabel: "Not recorded",
      note: "Key input for any CVD risk estimate.",
      source: null,
      key: true,
      unlockValue: "128/82",
      unlockStatus: "raised",
      unlockStatusLabel: "Slightly raised",
      unlockNote: "Sample added in demo · confirm at a check.",
    },
    {
      id: "cholesterol",
      label: "Cholesterol / HDL",
      icon: "droplet",
      color: "#AF52DE",
      value: null,
      unit: "mmol/L",
      status: "missing",
      statusLabel: "Not recorded",
      note: "Total & HDL needed for the best CVD estimate (NICE).",
      source: null,
      key: true,
      unlockValue: "5.4",
      unlockStatus: "raised",
      unlockStatusLabel: "Borderline",
      unlockNote: "Sample added in demo · confirm at a check.",
    },
    {
      id: "bmi",
      label: "Body Mass Index",
      icon: "scale",
      color: "#5E5CE6",
      value: "28.4",
      unit: "kg/m²",
      status: "raised",
      statusLabel: "Overweight",
      note: "178 cm · 90 kg",
      source: "Self-reported",
      key: true,
      spark: [27.1, 27.4, 27.8, 28.0, 28.2, 28.4],
      trend: "up",
    },
    {
      id: "waist",
      label: "Waist",
      icon: "ruler",
      color: "#FF9500",
      value: "102",
      unit: "cm",
      status: "raised",
      statusLabel: "Raised",
      note: "Above 94 cm guidance for men.",
      source: "Self-reported",
      key: true,
      spark: [99, 100, 100, 101, 101, 102],
      trend: "up",
    },
    {
      id: "hr",
      label: "Resting Heart Rate",
      icon: "pulse",
      color: "#FF3B30",
      value: "74",
      unit: "bpm",
      status: "good",
      statusLabel: "Normal",
      note: "30-day average.",
      source: "Connected watch",
      key: false,
      spark: [72, 73, 71, 74, 75, 73, 72, 74, 76, 74, 73, 74],
      trend: "flat",
    },
    {
      id: "steps",
      label: "Daily Activity",
      icon: "activity",
      color: "#34C759",
      value: "5,240",
      unit: "steps/day",
      status: "raised",
      statusLabel: "Below target",
      note: "30-day average · target 8,000.",
      source: "Connected watch",
      key: true,
      spark: [6100, 5800, 5200, 4900, 5400, 5240],
      trend: "down",
    },
  ];

  // ---- NHS Health Check eligibility (rules-based) ----------------------
  const healthCheck = {
    status: "possibly_eligible", // never "definitely"
    headline: "You may be eligible for a free NHS Health Check",
    reason:
      "You're 52 (the check is for ages 40–74) and have no recorded condition that would exclude you.",
    includes: [
      "Height, weight & waist",
      "Blood pressure",
      "Cholesterol",
      "Diabetes risk",
      "Lifestyle review",
    ],
    cadence: "Eligible adults are invited every 5 years.",
    action:
      "If you haven't been invited, NHS guidance is to contact your GP practice — or your local authority if your practice doesn't offer it.",
    source: "NHS.uk — NHS Health Check",
    bookUrl: "https://www.nhs.uk/tests-and-treatments/nhs-health-check/",
    // Plain-rules eligibility check — each criterion shown transparently
    criteria: [
      { label: "Aged 40–74", met: true, detail: "You're 52." },
      { label: "No existing CVD diagnosis", met: true, detail: "None recorded on your profile." },
      { label: "Not already monitored for a related condition", met: true, detail: "No diabetes, kidney or heart condition on file." },
      { label: "No check in the last 5 years", met: "unknown", detail: "We can't see a previous check — worth confirming with your GP." },
    ],
  };

  // ---- CVD risk: deliberately incomplete -------------------------------
  const cvdRisk = {
    state: "incomplete",
    headline: "CVD risk can't be calculated yet",
    body:
      "A reliable 10-year cardiovascular risk estimate (QRISK3) needs your blood pressure and cholesterol — both are missing. Below is what we can already see.",
    knownFactors: [
      { label: "Age 52", weight: "context" },
      { label: "Male", weight: "context" },
      { label: "Family history of early heart disease", weight: "raises" },
      { label: "Ex-smoker (20 pack-years)", weight: "raises" },
      { label: "BMI 28.4 — overweight", weight: "raises" },
      { label: "Raised waist (102 cm)", weight: "raises" },
      { label: "Low physical activity", weight: "raises" },
    ],
    missingHighValue: ["Blood pressure", "Total cholesterol & HDL"],
    // What completing the two missing checks unlocks (value of acting)
    unlocks: [
      "A 10-year heart & stroke risk estimate (QRISK3), run by your clinician",
      "Personalised blood-pressure & cholesterol targets for your age",
      "Whether a statin conversation is worth having",
    ],
    readyHeadline: "Ready for a QRISK3 assessment",
    readyBody:
      "All the inputs QRISK3 needs are now present. Your GP or nurse can calculate your formal 10-year risk — this tool deliberately leaves the number to a clinician.",
    safety:
      "This is an educational prevention prototype, not clinical decision support. It does not diagnose or recommend treatment.",
  };

  // ---- Prevention profile completeness ---------------------------------
  const profileChecklist = [
    { label: "Blood pressure", done: false },
    { label: "Cholesterol / HDL", done: false },
    { label: "Body measurements (BMI, waist)", done: true },
    { label: "Smoking & lifestyle", done: true },
    { label: "Family & medical history", done: true },
  ];
  const completeness = Math.round(
    (profileChecklist.filter((c) => c.done).length / profileChecklist.length) * 100
  );

  // ---- Local NHS services (cached demo sample) -------------------------
  // Distances are straight-line from M13 9PL.
  const services = [
    {
      id: "svc-brunswick",
      name: "Brunswick Health Centre",
      type: "gp_practice",
      typeLabel: "GP Practice",
      address: "Hartfield Close, Manchester M13 9YL",
      phone: "0161 273 1791",
      lat: 53.464,
      lon: -2.228,
      distanceKm: 0.4,
      relevantFor: ["NHS Health Check", "GP review"],
      open: "Open · closes 6:30pm",
      whyHere: "Offers NHS Health Checks and routine GP review. You'd need to be registered to be seen — M13 9PL falls inside their catchment area, so you can register here as your home practice.",
      rating: "CQC: Good",
      nextAvail: "Health Check appts ~1 week (registered patients)",
      offers: ["NHS Health Check", "Cholesterol/lipid blood test", "Blood pressure", "Diabetes (HbA1c) test", "GP consultation"],
      eligibility: "Registered patients only. M13 9PL is inside their catchment, so registration is straightforward. Bring photo ID and proof of address.",
      catchmentStatus: "in",
      access: ["Step-free access", "Accessible toilet", "Hearing loop"],
      hours: "Mon–Fri 8:00–18:30 · Sat 9:00–12:00",
      bring: "Photo ID + proof of address if registering · medicines list + questions if registered."
    },
    {
      id: "svc-ardwick",
      name: "Ardwick Medical Practice",
      type: "gp_practice",
      typeLabel: "GP Practice",
      address: "Ardwick Green North, Manchester M12 6FZ",
      phone: "0161 273 6262",
      lat: 53.471,
      lon: -2.221,
      distanceKm: 0.9,
      relevantFor: ["NHS Health Check", "GP review"],
      open: "Open · closes 6:00pm",
      whyHere: "Alternative practice offering NHS Health Checks. M13 9PL sits at the edge of their catchment — you can register here if you'd rather, but only one practice is your registered home at a time.",
      rating: "CQC: Good",
      nextAvail: "Routine appts ~3 days (registered patients)",
      offers: ["NHS Health Check", "Blood pressure", "Cholesterol/lipid blood test", "GP consultation"],
      eligibility: "Registered patients only. M13 9PL is at the boundary of their catchment — registration is usually accepted at the practice's discretion. Bring photo ID and proof of address.",
      catchmentStatus: "boundary",
      access: ["Step-free access", "Accessible parking"],
      hours: "Mon–Fri 8:00–18:00",
      bring: "Photo ID + proof of address if registering."
    },
    {
      id: "svc-rusholme-pharm",
      name: "Rusholme Pharmacy",
      type: "pharmacy",
      typeLabel: "Pharmacy",
      address: "Wilmslow Road, Manchester M14 5TP",
      phone: "0161 224 4096",
      lat: 53.457,
      lon: -2.227,
      distanceKm: 1.1,
      relevantFor: ["Free BP check", "Cholesterol pathway"],
      badge: "Free BP check",
      open: "Open · closes 7:00pm",
      whyHere: "Free NHS blood-pressure check for anyone aged 40+ in England — no registration, no catchment, no appointment. This one is closest, but any participating pharmacy will do.",
      rating: "Distance-selling & community pharmacy",
      nextAvail: "Walk-in today · any participating pharmacy works",
      offers: ["Free NHS blood pressure check (40+)", "Pharmacy First minor illness", "Cholesterol point-of-care test (£)", "Medicines advice"],
      eligibility: "Free BP check for anyone 40+ in England. No registration, no booking, no postcode rules — walk into any participating pharmacy.",
      access: ["Step-free access", "Private consultation room"],
      hours: "Mon–Sat 9:00–19:00 · Sun 11:00–16:00",
      bring: "Nothing. Takes about 5 minutes. Avoid caffeine just beforehand."
    },
    {
      id: "svc-oxford-pharm",
      name: "Oxford Road Pharmacy",
      type: "pharmacy",
      typeLabel: "Pharmacy",
      address: "Oxford Road, Manchester M1 7ED",
      phone: "0161 236 1311",
      lat: 53.472,
      lon: -2.237,
      distanceKm: 1.0,
      relevantFor: ["Free BP check"],
      badge: "Free BP check",
      open: "Open · closes 6:00pm",
      whyHere: "Same free NHS BP-check, on your commute along Oxford Road. No registration, no catchment — any participating pharmacy works.",
      rating: "Community pharmacy",
      nextAvail: "Walk-in today",
      offers: ["Free NHS blood pressure check (40+)", "Pharmacy First", "Flu & travel vaccines"],
      eligibility: "Free BP check for anyone 40+ in England. No registration or booking needed.",
      access: ["Step-free access"],
      hours: "Mon–Fri 8:30–18:00",
      bring: "Nothing — just walk in."
    },
    {
      id: "svc-mri",
      name: "Manchester Royal Infirmary",
      type: "hospital",
      typeLabel: "Hospital",
      address: "Oxford Road, Manchester M13 9WL",
      phone: "0161 276 1234",
      lat: 53.463,
      lon: -2.225,
      distanceKm: 0.5,
      relevantFor: ["Only if your GP refers you"],
      open: "A&E open 24 hours",
      whyHere: "Your nearest acute hospital. There is no walk-in route for preventive checks here — planned cardiology / diabetes care happens by GP referral only. A&E is for emergencies, not health checks.",
      rating: "Major teaching hospital",
      nextAvail: "By GP referral only",
      offers: ["Cardiology (referral)", "Diabetes medicine (referral)", "Outpatient diagnostics", "A&E 24h"],
      eligibility: "Referral from your GP for planned cardiology / diabetes care. A&E is for emergencies only — not the route for routine checks.",
      access: ["Step-free access", "Accessible parking", "Patient transport eligible"],
      hours: "A&E 24 hours · outpatients Mon–Fri",
      bring: "Referral letter and appointment reference."
    },
    {
      id: "svc-wythenshawe",
      name: "Wythenshawe Hospital",
      type: "hospital",
      typeLabel: "Hospital",
      address: "Southmoor Road, Manchester M23 9LT",
      phone: "0161 998 7070",
      lat: 53.391,
      lon: -2.291,
      distanceKm: 9.2,
      relevantFor: ["Cardiology referrals"],
      open: "A&E open 24 hours",
      whyHere: "Regional cardiology centre — relevant only if a GP later refers you for specialist heart assessment. Not a walk-in destination.",
      rating: "Specialist cardiothoracic centre",
      nextAvail: "By GP referral only",
      offers: ["Cardiology & cardiothoracic (referral)", "Heart investigations", "A&E 24h"],
      eligibility: "Referral required for planned cardiology care. A&E for emergencies only.",
      access: ["Step-free access", "Accessible parking"],
      hours: "A&E 24 hours · outpatients Mon–Fri",
      bring: "Referral letter and appointment reference."
    },
  ];

  // ---- Waiting-time context (cached public sample) ---------------------
  const waitingTimes = {
    disclaimer:
      "Provider-level public waiting-time signals — not a personal prediction. Actual waits depend on clinical need and referral pathway.",
    sourceNote: "Modelled on My Planned Care",
    rttStandard: 18, // NHS 18-week referral-to-treatment standard
    explainer:
      "These are average waits each hospital reports for the whole pathway — from your GP's referral to your first appointment, and on to treatment. The NHS aims for treatment within 18 weeks. You can choose where you're referred.",
    records: [
      {
        provider: "Wythenshawe Hospital",
        specialty: "Cardiology",
        firstAppt: 7,
        treatment: 12,
        trend: "down",
        note: "Regional cardiology centre. Currently the shortest cardiology wait near you, and trending down over the last quarter.",
      },
      {
        provider: "Manchester Royal Infirmary",
        specialty: "Cardiology",
        firstAppt: 9,
        treatment: 15,
        trend: "flat",
        note: "Your nearest acute hospital for cardiology. Slightly longer than Wythenshawe but far closer if travel matters.",
      },
      {
        provider: "Manchester Royal Infirmary",
        specialty: "Diabetes Medicine",
        firstAppt: 6,
        treatment: 10,
        trend: "down",
        note: "Comfortably inside the 18-week standard. Relevant only if a diabetes referral comes out of your Health Check.",
      },
    ],
  };

  // ---- Action plan (deterministic, rules-first) ------------------------
  const actions = [
    {
      priority: 1,
      tag: "Do first",
      tone: "high",
      title: "Get your blood pressure checked",
      body:
        "It's your single highest-value missing measurement. Adults 40+ in England can get a free BP check at a participating pharmacy — no appointment needed.",
      where: "Rusholme Pharmacy · 1.1 km · Free BP check",
      source: "NHS pharmacy BP check guidance",
    },
    {
      priority: 2,
      tag: "Next",
      tone: "attention",
      title: "Arrange a cholesterol (lipid) test",
      body:
        "Total cholesterol and HDL are needed for a proper CVD risk estimate. Ask your GP for a lipid test, or have it done as part of an NHS Health Check.",
      where: "Brunswick Health Centre · 0.4 km",
      source: "NICE NG238",
    },
    {
      priority: 3,
      tag: "Next",
      tone: "attention",
      title: "Book or ask about an NHS Health Check",
      body:
        "You appear eligible. This bundles BP, cholesterol, diabetes risk and a lifestyle review into one free appointment.",
      where: "Your GP practice or Manchester City Council",
      source: "NHS.uk — NHS Health Check",
    },
    {
      priority: 4,
      tag: "Lifestyle",
      tone: "info",
      title: "Build back daily activity",
      body:
        "You're averaging 5,240 steps against an 8,000 target. Gradual increases are one of the highest-yield preventive steps alongside the measurements above.",
      where: "Self-directed · review at GP visit",
      source: "NHS Live Well",
    },
  ];

  const gpQuestions = [
    { q: "Am I eligible for an NHS Health Check, and how do I book one?", why: "You're 52 with no excluding condition, so you likely qualify for the 40–74 check.", url: "https://www.nhs.uk/tests-and-treatments/nhs-health-check/", link: "About the NHS Health Check" },
    { q: "Can I have my cholesterol and HDL ratio measured?", why: "Total and HDL cholesterol are needed for a proper CVD risk estimate and aren't on file yet.", url: "https://www.nhs.uk/conditions/high-cholesterol/", link: "High cholesterol" },
    { q: "Given my father's heart attack at 58, should my CVD risk be assessed formally with QRISK3?", why: "Early family heart disease is a recognised risk factor that QRISK3 accounts for.", url: "https://www.nhs.uk/conditions/cardiovascular-disease/", link: "Cardiovascular disease" },
    { q: "What blood pressure range should I be aiming for at my age?", why: "Blood pressure isn't recorded — knowing your target helps you act on a reading.", url: "https://www.nhs.uk/conditions/high-blood-pressure-hypertension/", link: "Blood pressure" },
    { q: "What support is available to increase my activity levels safely?", why: "You're averaging 5,240 steps against an 8,000 target.", url: "https://www.nhs.uk/live-well/exercise/", link: "Exercise guidance" },
  ];

  const gpSummary =
    "I'd like to discuss preventive cardiovascular risk. I'm 52, an ex-smoker (quit 2019), with a BMI of 28.4 and a family history of early heart disease (father, heart attack at 58). I don't currently know my blood pressure or cholesterol/HDL ratio. Based on the NHS Health Check criteria I believe I may be eligible. Could we formally assess my CVD risk and arrange the measurements that are missing?";

  // ---- Official NHS content cards (static, credible links) -------------
  const content = [
    {
      title: "NHS Health Check",
      summary: "Free check-up for ages 40–74 to assess cardiovascular and related risk.",
      url: "https://www.nhs.uk/tests-and-treatments/nhs-health-check/",
      relevance: "Health Check",
    },
    {
      title: "Free pharmacy blood pressure checks",
      summary: "Ages 40+ in England can get a free BP check at participating pharmacies.",
      url: "https://www.nhs.uk/nhs-services/pharmacies/find-a-pharmacy-that-offers-free-blood-pressure-checks/",
      relevance: "Blood pressure",
    },
    {
      title: "High cholesterol",
      summary: "Why cholesterol and HDL matter, and how a lipid test works.",
      url: "https://www.nhs.uk/conditions/high-cholesterol/",
      relevance: "Cholesterol",
    },
    {
      title: "Guide to NHS waiting times",
      summary: "How elective waiting times work and how to compare hospitals.",
      url: "https://www.nhs.uk/nhs-services/hospitals/guide-to-nhs-waiting-times-in-england/",
      relevance: "Waiting times",
    },
  ];

  // ---- Data provenance (honesty layer) ---------------------------------
  const provenance = [
    { label: "Location & NHS geography", source: "postcodes.io", mode: "live" },
    { label: "Health Check rules", source: "NHS.uk", mode: "static" },
    { label: "Risk logic", source: "NICE NG238 / QRISK3 fields", mode: "static" },
    { label: "Local services", source: "NHS Directory of Services", mode: "demo cache" },
    { label: "Waiting times", source: "My Planned Care", mode: "demo cache" },
    { label: "Population stats", source: "Fingertips / OHID", mode: "not loaded" },
  ];

  // ---- Data sources for the Profile screen -----------------------------
  const dataSources = [
    {
      id: "nhs-login",
      label: "NHS login",
      desc: "Securely link your NHS account to pull records.",
      icon: "shield",
      state: "preloaded",
    },
    {
      id: "wearable",
      label: "Connected watch",
      desc: "Resting heart rate, activity and sleep.",
      icon: "watch",
      state: "connected",
    },
    {
      id: "upload",
      label: "Upload a record",
      desc: "Drop a PDF or photo of test results.",
      icon: "upload",
      state: "available",
    },
    {
      id: "manual",
      label: "Enter manually",
      desc: "Type in BP, cholesterol, BMI or waist yourself.",
      icon: "check",
      state: "available",
    },
    {
      id: "manual",
      label: "Enter manually",
      desc: "Type in measurements you already know.",
      icon: "edit",
      state: "available",
    },
  ];

  // ---- Health trends (for charts/diagrams) -----------------------------
  const trends = {
    steps: {
      title: "Daily steps",
      unit: "steps",
      target: 8000,
      avg: 5240,
      data: [
        { label: "Mon", value: 4820 },
        { label: "Tue", value: 6310 },
        { label: "Wed", value: 3990 },
        { label: "Thu", value: 7180 },
        { label: "Fri", value: 5460 },
        { label: "Sat", value: 4120 },
        { label: "Sun", value: 5800 },
      ],
    },
    restingHr: {
      title: "Resting heart rate",
      unit: "bpm",
      bandLow: 60,
      bandHigh: 80,
      data: [72, 73, 71, 74, 75, 73, 72, 74, 76, 74, 73, 74],
      weeks: 12,
    },
    // Where each number sits against healthy / raised / high zones
    ranges: [
      {
        label: "BMI",
        value: 28.4,
        unit: "kg/m²",
        min: 16,
        max: 40,
        zones: [
          { upto: 18.5, tone: "info", name: "Under" },
          { upto: 25, tone: "good", name: "Healthy" },
          { upto: 30, tone: "raised", name: "Overweight" },
          { upto: 40, tone: "high", name: "Obese" },
        ],
      },
      {
        label: "Waist",
        value: 102,
        unit: "cm",
        min: 70,
        max: 120,
        zones: [
          { upto: 94, tone: "good", name: "Healthy" },
          { upto: 102, tone: "raised", name: "Raised" },
          { upto: 120, tone: "high", name: "High" },
        ],
      },
      {
        label: "Resting HR",
        value: 74,
        unit: "bpm",
        min: 40,
        max: 110,
        zones: [
          { upto: 60, tone: "info", name: "Low" },
          { upto: 80, tone: "good", name: "Healthy" },
          { upto: 100, tone: "raised", name: "Raised" },
          { upto: 110, tone: "high", name: "High" },
        ],
      },
    ],
    // Risk factor mix for a simple breakdown diagram
    factorMix: [
      { label: "Recorded risk factors", value: 5, tone: "raised" },
      { label: "Protective / normal", value: 2, tone: "good" },
      { label: "Still unknown", value: 2, tone: "info" },
    ],
  };

  // ---- Inline detail for each vital (shown when a tile is expanded) ----
  const measurementDetail = {
    bp: { what: "The pressure in your arteries. High blood pressure usually has no symptoms but is a leading, treatable cause of heart attack and stroke.", target: "Aim below 140/90 mmHg (clinic) for most adults under 80.", action: "Get a free pharmacy BP check (40+) — no appointment needed.", cta: "Find a free BP check", goLocal: true },
    cholesterol: { what: "Fats in your blood. A high total-to-HDL ratio raises cardiovascular risk and is needed to estimate it accurately.", target: "Your GP will set targets based on your overall risk.", action: "Ask your GP for a lipid blood test, or have it done at an NHS Health Check.", cta: "See GP practices", goLocal: true },
    bmi: { what: "Weight relative to height. A screening signal, not a diagnosis — muscle and build affect it.", target: "Healthy range 18.5–24.9 kg/m². You're in the 25–30 (overweight) band.", action: "Small sustained changes to activity and diet move this most." },
    waist: { what: "Waist circumference reflects fat around your organs, which carries more cardiovascular risk than weight alone.", target: "Below 94 cm for men; 102 cm+ is high risk.", action: "Often improves alongside activity before weight does." },
    hr: { what: "Beats per minute at rest. A lower resting rate generally reflects better cardiovascular fitness.", target: "Typical healthy adult range 60–80 bpm.", action: "No action needed — yours is normal. Trending stable." },
    steps: { what: "Daily movement is one of the highest-yield preventive habits — it influences BP, weight, mood and more.", target: "Work toward 8,000 steps/day; any increase helps.", action: "Add a short daily walk; build gradually." },
  };

  // ---- Resources page content ------------------------------------------
  const resources = [
    { group: "Understand your risk", items: [
      { title: "NHS Health Check", desc: "What the free 40–74 check covers and how to book.", url: "https://www.nhs.uk/tests-and-treatments/nhs-health-check/", tag: "Eligibility" },
      { title: "Cardiovascular disease", desc: "How heart and circulatory disease develops and what lowers risk.", url: "https://www.nhs.uk/conditions/cardiovascular-disease/", tag: "Risk" },
      { title: "High blood pressure", desc: "Why it matters, how it's measured, and treatment options.", url: "https://www.nhs.uk/conditions/high-blood-pressure-hypertension/", tag: "Blood pressure" },
      { title: "High cholesterol", desc: "Understanding lipids, HDL and the cholesterol ratio.", url: "https://www.nhs.uk/conditions/high-cholesterol/", tag: "Cholesterol" },
    ]},
    { group: "Take action", items: [
      { title: "Free pharmacy BP checks", desc: "Anyone 40+ in England can get a free check — no appointment.", url: "https://www.nhs.uk/nhs-services/pharmacies/find-a-pharmacy-that-offers-free-blood-pressure-checks/", tag: "Blood pressure" },
      { title: "Get active", desc: "NHS Live Well guidance on building activity safely.", url: "https://www.nhs.uk/live-well/exercise/", tag: "Lifestyle" },
      { title: "Quit smoking support", desc: "Free NHS tools and local stop-smoking services.", url: "https://www.nhs.uk/live-well/quit-smoking/", tag: "Lifestyle" },
      { title: "Healthier eating", desc: "Practical steps for weight, cholesterol and blood pressure.", url: "https://www.nhs.uk/live-well/eat-well/", tag: "Lifestyle" },
    ]},
    { group: "Waiting & referrals", items: [
      { title: "Guide to NHS waiting times", desc: "How elective waits work and how to compare providers.", url: "https://www.nhs.uk/nhs-services/hospitals/guide-to-nhs-waiting-times-in-england/", tag: "Access" },
      { title: "Your choices in the NHS", desc: "Your right to choose where you're referred.", url: "https://www.nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs/", tag: "Access" },
    ]},
  ];

  // ---- Support page content --------------------------------------------
  const support = {
    urgent: [
      { label: "Emergency — 999", desc: "Chest pain, stroke symptoms (FAST), severe breathlessness.", tone: "high", action: "tel:999" },
      { label: "NHS 111", desc: "Urgent but not life-threatening — 24/7 advice.", tone: "attn", action: "tel:111" },
    ],
    faqs: [
      { q: "Is this a medical diagnosis?", a: "No. PreventPath is an educational prevention navigator. It flags what's missing and points to NHS pathways — it never diagnoses or recommends treatment. A clinician makes those decisions." },
      { q: "Where does my data come from?", a: "Geography is resolved live from your postcode (postcodes.io). Eligibility and risk logic follow published NHS and NICE rules. Service and waiting-time samples are cached for the demo." },
      { q: "How is my data handled?", a: "In this prototype nothing is sent anywhere — data stays in your browser session. A production version would use NHS login and follow NHS data-handling standards." },
      { q: "What does 'AI-assisted' mean?", a: "Short summaries (like the GP note and 'why this place' line) are drafted by a language model from your structured data, then checked against NHS rules. They're clearly tagged." },
      { q: "Can I use my own data?", a: "Yes — switch to Live mode to start from scratch and link your NHS record or upload results. Demo mode uses a sample profile." },
    ],
    contact: [
      { label: "Help centre", desc: "Browse guides and answers.", icon: "info" },
      { label: "Message support", desc: "Typically replies within a day.", icon: "doc" },
      { label: "Accessibility", desc: "Tell us how we can improve access.", icon: "shield" },
    ],
  };

  const account = {
    plan: "NHS-linked account",
    member: "Connected since 2024",
    settings: [
      { label: "Connected sources", value: "NHS login · Watch", icon: "link" },
      { label: "Notifications", value: "On — reminders & results", icon: "info" },
      { label: "Data & privacy", value: "Stored in this session only", icon: "shield" },
      { label: "Accessibility", value: "System default", icon: "user" },
    ],
  };

  return {
    patient,
    measurements,
    measurementDetail,
    trends,
    healthCheck,
    cvdRisk,
    profileChecklist,
    completeness,
    services,
    waitingTimes,
    actions,
    gpQuestions,
    gpSummary,
    content,
    resources,
    support,
    account,
    provenance,
    dataSources,
  };
})();

/* ------------------------------------------------------------------ */
/* Live data loader                                                    */
/* ------------------------------------------------------------------ */
/* loadAppData({mode, seed?, patientInput?, postcode?}) -> Promise.
   - default: returns STATIC_DATA synchronously, no network.
   - demo: pick (or use given) seed → call backend → compose APP_DATA.
     On any backend error, fall back to STATIC_DATA with source="safe_fallback".
   - live: caller passes patientInput + postcode → call backend → compose. */

// Initial sync render: UI must boot with valid APP_DATA before React mounts.
window.APP_DATA = window.PPFallback.STATIC_DATA;

/* ------------------------------------------------------------------ */
/* Blank shell for Live mode (pre-submission)                          */
/* ------------------------------------------------------------------ */
/* Used when user is in Live mode but has not yet submitted to the
   backend. Reuses educational/reference content (services, waitingTimes,
   official NHS content, measurementDetail) from STATIC_DATA, but clears
   anything that's patient-specific. Connect stage renders this so that
   manually-entered measurements aren't joined onto a fictional patient's
   values — i.e. "no autofill". */

window.PPFallback.BLANK_DATA = (function () {
  var S = window.PPFallback.STATIC_DATA;
  var blankMeasurement = function (id, label, icon, color, unit, note, key) {
    return {
      id: id, label: label, icon: icon, color: color, unit: unit,
      value: null, status: "missing", statusLabel: "Not recorded",
      note: note, source: null, key: !!key, spark: [],
    };
  };
  return {
    patient: {
      name: "You", initials: "Yo", age: null, sex: "—", ethnicity: "—",
      postcode: "M13 9PL", livesInEngland: true,
      // Map fallback so Connect's Leaflet doesn't crash before postcode lookup.
      location: S.patient.location,
      conditions: [], medications: [], lifestyle: {},
    },
    measurements: [
      blankMeasurement("bp", "Blood Pressure", "heart", "#FF2D55", "mmHg", "Key input for any CVD risk estimate.", true),
      blankMeasurement("cholesterol", "Cholesterol / HDL", "droplet", "#AF52DE", "mmol/L", "Total & HDL needed for the best CVD estimate (NICE).", true),
      blankMeasurement("bmi", "Body Mass Index", "scale", "#5E5CE6", "kg/m²", "BMI helps frame general preventive advice.", true),
      blankMeasurement("waist", "Waist", "ruler", "#FF9500", "cm", "Waist measurement complements BMI.", true),
      blankMeasurement("hr", "Resting Heart Rate", "pulse", "#FF3B30", "bpm", "30-day average from a connected watch.", false),
      blankMeasurement("steps", "Daily Activity", "activity", "#34C759", "steps/day", "30-day average · target 8,000.", true),
    ],
    measurementDetail: S.measurementDetail,
    trends: S.trends,
    healthCheck: {
      status: "awaiting_data",
      headline: "Add your measurements to check eligibility",
      reason: "We need your age and any pre-existing conditions to apply the NHS Health Check rules.",
      includes: S.healthCheck.includes,
      cadence: S.healthCheck.cadence,
      action: S.healthCheck.action,
      source: S.healthCheck.source,
      bookUrl: S.healthCheck.bookUrl,
      criteria: [
        { label: "Aged 40–74", met: "unknown", detail: "Tell us your age." },
        { label: "No existing CVD diagnosis", met: "unknown", detail: "Add your medical history." },
        { label: "Not already monitored for a related condition", met: "unknown", detail: "Add your medical history." },
        { label: "No check in the last 5 years", met: "unknown", detail: "We can't see a previous check." },
      ],
    },
    cvdRisk: {
      state: "incomplete",
      headline: "CVD risk can't be calculated yet",
      body: "Add your blood pressure and cholesterol to begin. Your report will reflect only what you enter.",
      knownFactors: [],
      missingHighValue: ["Blood pressure", "Total cholesterol & HDL"],
      unlocks: S.cvdRisk.unlocks,
      readyHeadline: S.cvdRisk.readyHeadline,
      readyBody: S.cvdRisk.readyBody,
      safety: S.cvdRisk.safety,
    },
    profileChecklist: [
      { label: "Blood pressure", done: false },
      { label: "Cholesterol / HDL", done: false },
      { label: "Body measurements (BMI, waist)", done: false },
      { label: "Smoking & lifestyle", done: false },
      { label: "Family & medical history", done: false },
    ],
    completeness: 0,
    services: S.services,
    waitingTimes: S.waitingTimes,
    actions: [],
    gpQuestions: [],
    gpSummary: "",
    content: S.content,
    resources: S.resources,
    support: S.support,
    account: { plan: "Live mode", member: "Signed in", settings: S.account.settings },
    provenance: S.provenance,
    dataSources: S.dataSources,
    _backend: { source: "live-blank", urgencyLevel: "routine", nextStep: null, card: null, factors: [], readiness: { total: 9, recorded: 0, protective: 0, unknown: 9, percent: 0 } },
  };
})();

(function () {
  // Monotonic request token — older requests resolve to a stale-flag so the
  // caller can drop them. Prevents Demo→Default mid-load races.
  var REQ = 0;

  function safeFallback() {
    return {
      appData: window.PPFallback.STATIC_DATA,
      source: "safe_fallback",
      dataQuality: { postcode: "cached", services: "cached", waitingTimes: "cached", officialContent: "cached", population: "synthetic" },
      reason: "static fixture",
    };
  }

  function blankLive() {
    return {
      appData: window.PPFallback.BLANK_DATA,
      source: "live-blank",
      dataQuality: { postcode: "cached", services: "cached", waitingTimes: "cached", officialContent: "cached", population: "synthetic" },
      seedId: "live-user",
    };
  }

  async function loadAppData(opts) {
    opts = opts || {};
    var mode = opts.mode || "default";
    var token = ++REQ;
    var fallback = window.PPFallback.STATIC_DATA;

    if (mode === "default") {
      return {
        appData: fallback,
        source: "default",
        dataQuality: { postcode: "cached", services: "cached", waitingTimes: "cached", officialContent: "cached", population: "synthetic" },
        seedId: "james-whitfield",
        token: token,
      };
    }

    // demo mode: pick a seed (or use provided), call backend, compose.
    // live mode: caller-provided patientInput, call backend, compose.
    var seed = opts.seed;
    var patientInput;
    var postcode;

    if (mode === "demo") {
      seed = seed || window.PPSeeds.pickRandomSeed();
      patientInput = window.PPSeeds.buildPatientInput(seed);
      postcode = seed.presentation && seed.presentation.postcode;
    } else if (mode === "live") {
      patientInput = opts.patientInput;
      postcode = opts.postcode;
      // No data yet → load the empty Live shell instead of the static fixture.
      // This prevents "auto-fill" from STATIC_DATA leaking into Connect tiles.
      if (!patientInput || !postcode) {
        return Object.assign(blankLive(), { token: token });
      }
      // Synthesise a minimal seed for presentation dressing.
      seed = seed || {
        id: "live-user",
        patient: patientInput,
        presentation: opts.presentation || synthesisePresentation(patientInput, postcode),
      };
    } else {
      return safeFallback();
    }

    if (!patientInput || !postcode) {
      return safeFallback();
    }

    // Fire both calls in parallel.
    var profileP = window.PPApi.fetchProfile({ patient: patientInput, postcode: postcode });
    var contextP = window.PPApi.fetchContext(postcode, "demo");
    var profileR, contextR;
    try {
      var results = await Promise.all([profileP, contextP]);
      profileR = results[0]; contextR = results[1];
    } catch (e) {
      console.warn("[PreventPath] loadAppData backend failure", e);
      return Object.assign(safeFallback(), { token: token });
    }

    // Race guard: if a newer request started, drop this one.
    if (token !== REQ) {
      return { appData: window.APP_DATA, source: "stale", dataQuality: {}, token: token, stale: true };
    }

    if (!profileR || !profileR.ok) {
      console.warn("[PreventPath] /api/nhs/profile not ok:", profileR);
      return Object.assign(safeFallback(), { token: token, profileError: profileR && profileR.error });
    }
    var profile = profileR.data;
    var context = (contextR && contextR.ok) ? contextR.data : null;

    var appData;
    try {
      appData = window.PPAdapt.composeAppData(seed, profile, context, fallback);
    } catch (e) {
      console.warn("[PreventPath] composeAppData failed", e);
      return Object.assign(safeFallback(), { token: token });
    }

    return {
      appData: appData,
      source: profile.source || "live",
      dataQuality: (context && context.dataQuality) || { services: "cached", waitingTimes: "cached", officialContent: "cached", population: "synthetic", postcode: contextR && contextR.ok ? "live" : "failed" },
      seedId: seed && seed.id,
      token: token,
    };
  }

  function synthesisePresentation(patientInput, postcode) {
    // Minimal presentation for a live form-driven user. UI components
    // expect name/initials/sex/etc so we fill in benign placeholders.
    return {
      name: "You", initials: "Yo", sex: patientInput.sexAtBirth === "female" ? "Female" : (patientInput.sexAtBirth === "male" ? "Male" : "—"),
      ethnicity: "—",
      postcode: postcode,
      location: null,
      lifestyle: { smoking: patientInput.smokingStatus || "—", smokingFlag: patientInput.smokingStatus === "current" ? "raised" : "good" },
      heartRate: { value: 72, unit: "bpm", status: "good", spark: window.PPSeeds.pulseSpark(72), source: "Self-reported" },
      steps: { value: 6000, target: 8000, status: "raised", spark: [5500, 5800, 6200, 5900, 6100, 6000], trend: "flat" },
      bmiSpark: patientInput.bmi != null ? window.PPSeeds.spark6(patientInput.bmi, "flat") : [],
      waistSpark: patientInput.waistCircumferenceCm != null ? window.PPSeeds.spark6(patientInput.waistCircumferenceCm, "flat") : [],
    };
  }

  window.loadAppData = loadAppData;
})();

