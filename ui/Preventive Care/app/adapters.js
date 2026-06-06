/* PreventPath UI adapters: backend response → window.APP_DATA shape.
   The backend's /api/nhs/profile + /api/nhs/context responses carry the
   clinical truth (factors, readiness, card text, services, etc.); the seed
   carries UI dressing (name, sparklines, lifestyle prose, heart rate, steps);
   the fallback is the original static fixture. We never invent clinical
   strings — all status labels here come from NHS-standard band names. */

(function () {

  // -- Value→band helpers (NHS-standard categorisation only) -----------

  function bmiBand(v) {
    if (v == null || !isFinite(v)) return { status: "missing", statusLabel: "Not recorded" };
    if (v < 18.5) return { status: "raised", statusLabel: "Underweight" };
    if (v < 25)   return { status: "good",   statusLabel: "Healthy" };
    if (v < 30)   return { status: "raised", statusLabel: "Overweight" };
    return            { status: "high",   statusLabel: "Obese" };
  }

  function waistBand(v, sex) {
    if (v == null || !isFinite(v)) return { status: "missing", statusLabel: "Not recorded" };
    // NHS thresholds: men 94/102, women 80/88
    var lo = sex === "female" ? 80 : 94;
    var hi = sex === "female" ? 88 : 102;
    if (v < lo) return { status: "good", statusLabel: "Healthy" };
    if (v < hi) return { status: "raised", statusLabel: "Raised" };
    return            { status: "high",  statusLabel: "High" };
  }

  function bpBand(sys, dia) {
    if (sys == null || dia == null) return { status: "missing", statusLabel: "Not recorded" };
    if (sys < 120 && dia < 80) return { status: "good", statusLabel: "Healthy" };
    if (sys < 140 && dia < 90) return { status: "raised", statusLabel: "Slightly raised" };
    return                           { status: "high",  statusLabel: "Raised" };
  }

  function cholesterolBand(total, hdl) {
    if (total == null || hdl == null) return { status: "missing", statusLabel: "Not recorded" };
    if (total < 5.0) return { status: "good", statusLabel: "Healthy" };
    if (total < 6.5) return { status: "raised", statusLabel: "Borderline" };
    return                  { status: "high",  statusLabel: "Raised" };
  }

  // -- measurements[] (6 tiles) ----------------------------------------

  function adaptMeasurements(seed, profile, fallback) {
    var p = (seed && seed.patient) || {};
    var pres = (seed && seed.presentation) || {};
    var sex = p.sexAtBirth;
    var hasFactor = function (id) {
      if (!profile || !profile.factors) return null;
      for (var i = 0; i < profile.factors.length; i++) {
        if (profile.factors[i].id === id) return profile.factors[i];
      }
      return null;
    };
    var bpFactor = hasFactor("blood_pressure");
    var cholFactor = hasFactor("cholesterol");
    var bmiFactor = hasFactor("bmi_or_waist");

    var bpVal = (p.systolicBp != null && p.diastolicBp != null)
      ? (p.systolicBp + "/" + p.diastolicBp) : null;
    var bpBandRes = bpBand(p.systolicBp, p.diastolicBp);

    var cholVal = p.totalCholesterol != null ? String(p.totalCholesterol) : null;
    var cholBandRes = cholesterolBand(p.totalCholesterol, p.hdlCholesterol);

    var bmiVal = p.bmi != null ? String(p.bmi) : null;
    var bmiBandRes = bmiBand(p.bmi);

    var waistVal = p.waistCircumferenceCm != null ? String(p.waistCircumferenceCm) : null;
    var waistBandRes = waistBand(p.waistCircumferenceCm, sex);

    var hr = pres.heartRate || (fallback && fallback.measurements && byId(fallback.measurements, "hr")) || null;
    var steps = pres.steps || (fallback && fallback.measurements && byId(fallback.measurements, "steps")) || null;

    var bpKey = !(bpFactor && bpFactor.status !== "unknown");
    var cholKey = !(cholFactor && cholFactor.status !== "unknown");

    return [
      {
        id: "bp", label: "Blood Pressure", icon: "heart", color: "#FF2D55",
        value: bpVal, unit: "mmHg",
        status: bpBandRes.status, statusLabel: bpBandRes.statusLabel,
        note: bpVal ? "Key input for any CVD risk estimate." : "Key input for any CVD risk estimate.",
        source: bpVal ? "Self-reported" : null,
        key: true,
        // Unlock helpers for the demo's "add missing" flow — only meaningful when missing.
        unlockValue: bpVal == null ? "128/82" : undefined,
        unlockStatus: bpVal == null ? "raised" : undefined,
        unlockStatusLabel: bpVal == null ? "Slightly raised" : undefined,
        unlockNote: bpVal == null ? "Sample added in demo · confirm at a check." : undefined,
      },
      {
        id: "cholesterol", label: "Cholesterol / HDL", icon: "droplet", color: "#AF52DE",
        value: cholVal, unit: "mmol/L",
        status: cholBandRes.status, statusLabel: cholBandRes.statusLabel,
        note: "Total & HDL needed for the best CVD estimate (NICE).",
        source: cholVal ? "Self-reported" : null,
        key: true,
        unlockValue: cholVal == null ? "5.4" : undefined,
        unlockStatus: cholVal == null ? "raised" : undefined,
        unlockStatusLabel: cholVal == null ? "Borderline" : undefined,
        unlockNote: cholVal == null ? "Sample added in demo · confirm at a check." : undefined,
      },
      {
        id: "bmi", label: "Body Mass Index", icon: "scale", color: "#5E5CE6",
        value: bmiVal, unit: "kg/m²",
        status: bmiBandRes.status, statusLabel: bmiBandRes.statusLabel,
        note: bmiVal ? noteForBmi(p, pres) : "BMI helps frame general preventive advice.",
        source: bmiVal ? "Self-reported" : null,
        key: true,
        spark: pres.bmiSpark || [],
        trend: trendDirection(pres.bmiSpark),
      },
      {
        id: "waist", label: "Waist", icon: "ruler", color: "#FF9500",
        value: waistVal, unit: "cm",
        status: waistBandRes.status, statusLabel: waistBandRes.statusLabel,
        note: waistVal ? noteForWaist(p) : "Waist measurement complements BMI.",
        source: waistVal ? "Self-reported" : null,
        key: true,
        spark: pres.waistSpark || [],
        trend: trendDirection(pres.waistSpark),
      },
      {
        id: "hr", label: "Resting Heart Rate", icon: "pulse", color: "#FF3B30",
        value: hr ? String(hr.value) : null, unit: "bpm",
        status: (hr && hr.status) || "good", statusLabel: hr && hr.value < 60 ? "Low" : (hr && hr.value > 80 ? "Raised" : "Normal"),
        note: "30-day average.",
        source: (hr && hr.source) || "Connected watch",
        key: false,
        spark: (hr && hr.spark) || [],
        trend: "flat",
      },
      {
        id: "steps", label: "Daily Activity", icon: "activity", color: "#34C759",
        value: steps && steps.value != null ? formatNumber(steps.value) : null, unit: "steps/day",
        status: (steps && steps.status) || "raised",
        statusLabel: steps && steps.value >= (steps.target || 8000) ? "On target" : "Below target",
        note: "30-day average · target " + ((steps && steps.target) || 8000) + ".",
        source: "Connected watch",
        key: true,
        spark: (steps && steps.spark) || [],
        trend: (steps && steps.trend) || "flat",
      },
    ];
  }

  function byId(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }
  function formatNumber(n) {
    if (n == null) return null;
    return Number(n).toLocaleString("en-GB");
  }
  function trendDirection(spark) {
    if (!spark || spark.length < 2) return "flat";
    var first = spark[0], last = spark[spark.length - 1];
    if (last > first * 1.02) return "up";
    if (last < first * 0.98) return "down";
    return "flat";
  }
  function noteForBmi(p, pres) {
    if (p.bmi == null) return null;
    // Avoid inventing height/weight if not provided. Pres lifestyle line is fine.
    return p.bmi.toFixed ? p.bmi.toFixed(1) + " kg/m²" : String(p.bmi);
  }
  function noteForWaist(p) {
    if (p.sexAtBirth === "female") return "NHS guidance: under 80 cm for women.";
    return "NHS guidance: under 94 cm for men.";
  }

  // -- healthCheck ------------------------------------------------------

  function adaptHealthCheck(seed, profile, fallback) {
    var eligibility = profile && profile.eligibility && profile.eligibility.status;
    var age = (seed && seed.patient && seed.patient.age) || (fallback && fallback.patient && fallback.patient.age);
    var fb = (fallback && fallback.healthCheck) || {};

    if (!eligibility) {
      // Fallback path — backend missing.
      return fb;
    }

    var statusMap = {
      possibly: "possibly_eligible",
      not_age_eligible: "not_eligible",
      not_eligible_existing_condition: "not_eligible",
      not_applicable: "not_eligible",
    };
    var headlineMap = {
      possibly: "You may be eligible for a free NHS Health Check",
      not_age_eligible: "The NHS Health Check is for ages 40–74",
      not_eligible_existing_condition: "NHS Health Check route doesn't apply",
      not_applicable: "NHS Health Check route doesn't apply",
    };
    var reasonMap = {
      possibly: age + " falls in the 40–74 age band, and no recorded condition would exclude you.",
      not_age_eligible: "You're " + age + ". The NHS Health Check is offered to adults aged 40 to 74.",
      not_eligible_existing_condition: "A condition on your profile means follow-up happens through your existing care team instead.",
      not_applicable: "This route doesn't apply right now — your existing care team manages the related checks.",
    };

    var p = (seed && seed.patient) || {};
    var ageMet = age >= 40 && age <= 74;
    var exclusions =
      p.hasCvd || p.hasChronicKidneyDisease || p.hasDiabetes || p.hasHypertension ||
      p.hasAtrialFibrillation || p.hasStrokeOrTia || p.hasFamilialHypercholesterolaemia ||
      p.hasHeartFailure || p.hasPeripheralArterialDisease || p.previousHighCvdRisk;

    return {
      status: statusMap[eligibility] || "possibly_eligible",
      headline: headlineMap[eligibility] || fb.headline,
      reason: reasonMap[eligibility] || fb.reason,
      includes: fb.includes || ["Height, weight & waist", "Blood pressure", "Cholesterol", "Diabetes risk", "Lifestyle review"],
      cadence: fb.cadence || "Eligible adults are invited every 5 years.",
      action: fb.action || "If you haven't been invited, NHS guidance is to contact your GP practice — or your local authority if your practice doesn't offer it.",
      source: fb.source || "NHS.uk — NHS Health Check",
      bookUrl: fb.bookUrl || "https://www.nhs.uk/tests-and-treatments/nhs-health-check/",
      criteria: [
        { label: "Aged 40–74", met: ageMet, detail: "You're " + age + "." },
        { label: "No existing CVD diagnosis", met: !p.hasCvd, detail: p.hasCvd ? "CVD on profile — manage through care team." : "None recorded on your profile." },
        { label: "Not already monitored for a related condition", met: !exclusions, detail: exclusions ? "A condition on your profile means follow-up happens elsewhere." : "No diabetes, kidney or heart condition on file." },
        { label: "No check in the last 5 years", met: "unknown", detail: "We can't see a previous check — worth confirming with your GP." },
      ],
    };
  }

  // -- cvdRisk ----------------------------------------------------------

  function adaptCvdRisk(seed, profile, fallback) {
    var qrisk = profile && profile.qrisk;
    var fb = (fallback && fallback.cvdRisk) || {};
    if (!qrisk) return fb;

    var p = (seed && seed.patient) || {};
    var pres = (seed && seed.presentation) || {};

    // Map QRISK missing inputs (factor ids) to UI-facing labels.
    var labelFor = function (input) {
      switch (input) {
        case "blood_pressure": return "Blood pressure";
        case "cholesterol": return "Total cholesterol & HDL";
        case "smoking": return "Smoking status";
        case "bmi_or_waist": return "BMI or waist size";
        case "sex_at_birth": return "Sex at birth";
        case "age": return "Age";
        default:
          var s = input.replace(/_/g, " ");
          return s.charAt(0).toUpperCase() + s.slice(1);
      }
    };
    var missingHighValue = (qrisk.missingInputs || []).map(labelFor);

    var knownFactors = [];
    if (p.age != null) knownFactors.push({ label: "Age " + p.age, weight: "context" });
    if (pres.sex) knownFactors.push({ label: pres.sex, weight: "context" });
    if (pres.ethnicity) knownFactors.push({ label: pres.ethnicity, weight: "context" });
    if (pres.lifestyle && pres.lifestyle.familyHistoryFlag === "raised") {
      knownFactors.push({ label: pres.lifestyle.familyHistory || "Family CVD history", weight: "raises" });
    }
    if (p.smokingStatus === "current") knownFactors.push({ label: "Current smoker", weight: "raises" });
    if (p.smokingStatus === "former") knownFactors.push({ label: "Ex-smoker", weight: "raises" });
    if (p.bmi != null && p.bmi >= 25) knownFactors.push({ label: "BMI " + p.bmi + " — " + (p.bmi >= 30 ? "obese" : "overweight"), weight: "raises" });
    if (p.waistCircumferenceCm != null) {
      var waist = waistBand(p.waistCircumferenceCm, p.sexAtBirth);
      if (waist.status !== "good") knownFactors.push({ label: "Raised waist (" + p.waistCircumferenceCm + " cm)", weight: "raises" });
    }
    if (pres.lifestyle && pres.lifestyle.activityFlag === "raised") {
      knownFactors.push({ label: "Low physical activity", weight: "raises" });
    }

    var state = qrisk.ready ? "ready" : "incomplete";
    var headline = qrisk.ready ? (fb.readyHeadline || "Ready for a QRISK3 assessment") : (fb.headline || "CVD risk can't be calculated yet");
    var body = qrisk.ready
      ? (fb.readyBody || "All the inputs QRISK3 needs are now present. Your GP or nurse can calculate your formal 10-year risk — this tool deliberately leaves the number to a clinician.")
      : ("A reliable 10-year cardiovascular risk estimate (QRISK3) needs your "
         + missingHighValue.join(" and ").toLowerCase()
         + " — " + (missingHighValue.length > 1 ? "all are missing" : "this is missing") + ". Below is what we can already see.");

    return {
      state: state,
      headline: headline,
      body: body,
      knownFactors: knownFactors.length ? knownFactors : (fb.knownFactors || []),
      missingHighValue: missingHighValue,
      unlocks: fb.unlocks || [
        "A 10-year heart & stroke risk estimate (QRISK3), run by your clinician",
        "Personalised blood-pressure & cholesterol targets for your age",
        "Whether a statin conversation is worth having",
      ],
      readyHeadline: fb.readyHeadline || "Ready for a QRISK3 assessment",
      readyBody: fb.readyBody || "All the inputs QRISK3 needs are now present. Your GP or nurse can calculate your formal 10-year risk — this tool deliberately leaves the number to a clinician.",
      safety: fb.safety || "This is an educational prevention prototype, not clinical decision support. It does not diagnose or recommend treatment.",
    };
  }

  // -- profileChecklist + completeness ---------------------------------

  function adaptProfileChecklist(seed, profile, fallback) {
    var p = (seed && seed.patient) || {};
    var bpDone = p.systolicBp != null && p.diastolicBp != null;
    var cholDone = p.totalCholesterol != null && p.hdlCholesterol != null;
    var bodyDone = p.bmi != null || p.waistCircumferenceCm != null;
    var lifestyleDone = p.smokingStatus != null;
    var familyDone = !!(seed && seed.presentation && seed.presentation.lifestyle && seed.presentation.lifestyle.familyHistory);

    var checklist = [
      { label: "Blood pressure", done: bpDone },
      { label: "Cholesterol / HDL", done: cholDone },
      { label: "Body measurements (BMI, waist)", done: bodyDone },
      { label: "Smoking & lifestyle", done: lifestyleDone },
      { label: "Family & medical history", done: familyDone },
    ];
    var completeness = Math.round((checklist.filter(function (c) { return c.done; }).length / checklist.length) * 100);
    return { profileChecklist: checklist, completeness: completeness };
  }

  // -- services --------------------------------------------------------

  // Regional swap: when a Demo seed lives outside Manchester, replace the
  // hospital + GP entries with locally-appropriate ones. Pharmacies stay
  // because their framing ("walk in anywhere, no catchment") is true
  // nationally. UI metadata (whyHere, eligibility, offers, hours, etc.) is
  // generic enough to reuse — we only swap name/address/lat/lon/phone/
  // distance/catchment. Keep this table tight; only seeds we actually ship.
  var REGIONAL_OVERRIDES = {
    "Birmingham": {
      gps: [
        { name: "Hall Green Health", address: "979 Stratford Road, Birmingham B28 8AS", lat: 52.421, lon: -1.840, distanceKm: 1.4, phone: "0121 244 4000", catchmentStatus: "in" },
        { name: "Yardley Wood Health Centre", address: "Mossfield Road, Birmingham B14 4AT", lat: 52.413, lon: -1.875, distanceKm: 0.6, phone: "0121 474 2200", catchmentStatus: "boundary" },
      ],
      hospitals: [
        { name: "Queen Elizabeth Hospital Birmingham", address: "Mindelsohn Way, Edgbaston, Birmingham B15 2GW", lat: 52.452, lon: -1.943, distanceKm: 6.8, phone: "0121 627 2000" },
        { name: "Heartlands Hospital", address: "Bordesley Green East, Birmingham B9 5SS", lat: 52.483, lon: -1.825, distanceKm: 5.9, phone: "0121 424 2000" },
      ],
    },
    "Leeds": {
      gps: [
        { name: "Burley Park Medical Centre", address: "Cardigan Lane, Leeds LS4 2LE", lat: 53.812, lon: -1.575, distanceKm: 0.9, phone: "0113 295 1626", catchmentStatus: "in" },
        { name: "Hyde Park Surgery", address: "Woodsley Road, Leeds LS6 1SG", lat: 53.815, lon: -1.564, distanceKm: 0.4, phone: "0113 295 1133", catchmentStatus: "in" },
      ],
      hospitals: [
        { name: "Leeds General Infirmary", address: "Great George Street, Leeds LS1 3EX", lat: 53.802, lon: -1.553, distanceKm: 2.1, phone: "0113 243 2799" },
        { name: "St James's University Hospital", address: "Beckett Street, Leeds LS9 7TF", lat: 53.808, lon: -1.521, distanceKm: 3.4, phone: "0113 243 3144" },
      ],
    },
    "Bristol": {
      gps: [
        { name: "East Trees Health Centre", address: "Easton Road, Bristol BS5 0DZ", lat: 51.464, lon: -2.575, distanceKm: 3.0, phone: "0117 902 7100", catchmentStatus: "boundary" },
        { name: "Bedminster Family Practice", address: "Regent Road, Bedminster, Bristol BS3 4AT", lat: 51.441, lon: -2.601, distanceKm: 0.6, phone: "0117 902 7180", catchmentStatus: "in" },
      ],
      hospitals: [
        { name: "Bristol Royal Infirmary", address: "Marlborough Street, Bristol BS2 8HW", lat: 51.459, lon: -2.595, distanceKm: 2.4, phone: "0117 923 0000" },
        { name: "Southmead Hospital", address: "Southmead Road, Westbury-on-Trym, Bristol BS10 5NB", lat: 51.498, lon: -2.595, distanceKm: 7.3, phone: "0117 950 5050" },
      ],
    },
    "Newcastle upon Tyne": {
      gps: [
        { name: "Jesmond Health Partnership", address: "Osborne Avenue, Newcastle upon Tyne NE2 1JS", lat: 54.989, lon: -1.605, distanceKm: 0.4, phone: "0191 240 1234", catchmentStatus: "in" },
        { name: "Saville Medical Group", address: "Ridley Place, Newcastle upon Tyne NE1 8JN", lat: 54.977, lon: -1.611, distanceKm: 0.9, phone: "0191 233 1421", catchmentStatus: "in" },
      ],
      hospitals: [
        { name: "Royal Victoria Infirmary", address: "Queen Victoria Road, Newcastle upon Tyne NE1 4LP", lat: 54.980, lon: -1.617, distanceKm: 0.7, phone: "0191 233 6161" },
        { name: "Freeman Hospital", address: "Freeman Road, High Heaton, Newcastle upon Tyne NE7 7DN", lat: 55.003, lon: -1.594, distanceKm: 3.3, phone: "0191 233 6161" },
      ],
    },
    "Lambeth": {
      gps: [
        { name: "Streatham Hill Group Practice", address: "Sternhold Avenue, London SW2 4PA", lat: 51.443, lon: -0.130, distanceKm: 0.7, phone: "020 3049 3535", catchmentStatus: "in" },
        { name: "Brixton Hill Group Practice", address: "Brixton Hill, London SW2 1RJ", lat: 51.456, lon: -0.122, distanceKm: 1.0, phone: "020 8674 7373", catchmentStatus: "in" },
      ],
      hospitals: [
        { name: "King's College Hospital", address: "Denmark Hill, London SE5 9RS", lat: 51.469, lon: -0.094, distanceKm: 2.7, phone: "020 3299 9000" },
        { name: "St Thomas' Hospital", address: "Westminster Bridge Road, London SE1 7EH", lat: 51.498, lon: -0.118, distanceKm: 5.4, phone: "020 7188 7188" },
      ],
    },
    "Liverpool": {
      gps: [
        { name: "Princes Park Health Centre", address: "Bentley Road, Liverpool L8 0SY", lat: 53.394, lon: -2.969, distanceKm: 0.8, phone: "0151 295 8800", catchmentStatus: "in" },
        { name: "Toxteth Annexe Medical Centre", address: "Park Road, Liverpool L8 6QP", lat: 53.391, lon: -2.972, distanceKm: 0.4, phone: "0151 295 9100", catchmentStatus: "in" },
      ],
      hospitals: [
        { name: "Royal Liverpool University Hospital", address: "Mount Vernon Street, Liverpool L7 8YE", lat: 53.408, lon: -2.962, distanceKm: 2.2, phone: "0151 706 2000" },
        { name: "Aintree University Hospital", address: "Longmoor Lane, Liverpool L9 7AL", lat: 53.476, lon: -2.949, distanceKm: 9.7, phone: "0151 525 5980" },
      ],
    },
  };

  function adaptServices(seed, context, fallback) {
    // The backend's context.services only carries {name, type, address} —
    // not enough to render tiles. We use the Manchester fallback as a
    // template, then swap GP + hospital entries for region-appropriate ones
    // when the seed lives elsewhere. Pharmacies stay because the framing
    // ("walk in anywhere, no catchment") is true nationally.
    var fbServices = (fallback && fallback.services) || [];
    var locality = seed && seed.presentation && seed.presentation.location && seed.presentation.location.localAuthority;
    if (!locality || !REGIONAL_OVERRIDES[locality]) return fbServices;

    var overrides = REGIONAL_OVERRIDES[locality];
    var hospitals = (overrides.hospitals || []).slice();
    var gps = (overrides.gps || []).slice();

    return fbServices.map(function (svc) {
      if (svc.type === "hospital" && hospitals.length) {
        var h = hospitals.shift();
        // New id so React keys don't collide across regions.
        return Object.assign({}, svc, h, { id: svc.id + "-" + slug(h.name) });
      }
      if (svc.type === "gp_practice" && gps.length) {
        var g = gps.shift();
        return Object.assign({}, svc, g, { id: svc.id + "-" + slug(g.name) });
      }
      return svc;
    });
  }
  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  // -- waitingTimes ----------------------------------------------------

  function adaptWaitingTimes(context, fallback) {
    // Backend's waitingTimes is just {description, isPersonalPrediction,
    // disclaimer}. The UI's panel expects rttStandard + records[]. Use
    // fallback verbatim — backend's text we surface as a header note when
    // present, otherwise the fallback disclaimer.
    var fbWT = (fallback && fallback.waitingTimes) || {};
    if (!context || !context.waitingTimes) return fbWT;
    return Object.assign({}, fbWT, {
      headerNote: context.waitingTimes.description || fbWT.disclaimer,
    });
  }

  // -- content (NHS official cards) ------------------------------------

  function adaptContent(context, fallback) {
    var fbContent = (fallback && fallback.content) || [];
    if (!context || !Array.isArray(context.officialContent) || !context.officialContent.length) return fbContent;
    // Map backend shape {id,title,url,summary} → UI shape {title,summary,url,relevance}
    return context.officialContent.slice(0, 4).map(function (c) {
      return {
        title: c.title,
        summary: c.summary,
        url: c.url,
        relevance: relevanceFromId(c.id),
      };
    });
  }
  function relevanceFromId(id) {
    if (!id) return "NHS";
    if (id.indexOf("bp") >= 0 || id.indexOf("blood-pressure") >= 0) return "Blood pressure";
    if (id.indexOf("cholesterol") >= 0) return "Cholesterol";
    if (id.indexOf("health-check") >= 0) return "Health Check";
    if (id.indexOf("smoking") >= 0) return "Lifestyle";
    if (id.indexOf("weight") >= 0) return "Lifestyle";
    return "NHS";
  }

  // -- actions ---------------------------------------------------------

  function adaptActions(seed, profile, fallback) {
    if (!profile || !profile.factors) return (fallback && fallback.actions) || [];

    var p = (seed && seed.patient) || {};
    var actions = [];

    // 1. Highest-value missing measurement → first action.
    var bpUnknown = !p.systolicBp;
    var cholUnknown = !p.totalCholesterol;

    if (bpUnknown) {
      actions.push({
        priority: 1, tag: "Do first", tone: "high",
        title: "Get your blood pressure checked",
        body: profile.card && profile.card.body
          ? "It's your single highest-value missing measurement. " + (profile.card.next_step || "")
          : "It's your single highest-value missing measurement. Adults 40+ in England can get a free BP check at a participating pharmacy — no appointment needed.",
        where: "Local pharmacy · Free BP check",
        source: "NHS pharmacy BP check guidance",
      });
    } else if (cholUnknown) {
      actions.push({
        priority: 1, tag: "Do first", tone: "high",
        title: "Arrange a cholesterol (lipid) test",
        body: "Total cholesterol and HDL are needed for a proper CVD risk estimate. Ask your GP for a lipid test, or have it done as part of an NHS Health Check.",
        where: "Your GP practice",
        source: "NICE NG238",
      });
    } else if (profile.nextStep === "urgent_care") {
      actions.push({
        priority: 1, tag: "Urgent", tone: "high",
        title: "Seek urgent care",
        body: profile.card && profile.card.body ? profile.card.body : "Please call NHS 111 or 999 if symptoms feel emergent.",
        where: "NHS 111 / 999",
        source: "NHS urgent care",
      });
    } else {
      actions.push({
        priority: 1, tag: "Do first", tone: "attention",
        title: profile.card && profile.card.headline || "Review with your GP",
        body: profile.card && profile.card.body || "Your measurements look complete — bring them to a routine GP review.",
        where: "Your GP practice",
        source: "NHS Health Check",
      });
    }

    if (bpUnknown && cholUnknown) {
      actions.push({
        priority: 2, tag: "Next", tone: "attention",
        title: "Arrange a cholesterol (lipid) test",
        body: "Total cholesterol and HDL are needed for a proper CVD risk estimate. Ask your GP for a lipid test, or have it done as part of an NHS Health Check.",
        where: "Your GP practice",
        source: "NICE NG238",
      });
    }

    if (profile.eligibility && profile.eligibility.status === "possibly") {
      actions.push({
        priority: actions.length + 1, tag: "Next", tone: "attention",
        title: "Book or ask about an NHS Health Check",
        body: "You appear eligible. This bundles BP, cholesterol, diabetes risk and a lifestyle review into one free appointment.",
        where: "Your GP practice or local council",
        source: "NHS.uk — NHS Health Check",
      });
    }

    // 4. Lifestyle.
    if (p.smokingStatus === "current") {
      actions.push({
        priority: actions.length + 1, tag: "Lifestyle", tone: "info",
        title: "Free NHS stop-smoking support",
        body: "Combining specialist support with stop-smoking aids gives you the best chance of quitting for good.",
        where: "Local stop-smoking service · GP · pharmacy",
        source: "NHS Live Well — Quit smoking",
      });
    } else {
      var pres = (seed && seed.presentation) || {};
      if (pres.lifestyle && pres.lifestyle.activityFlag === "raised") {
        var stepsVal = pres.steps && pres.steps.value;
        actions.push({
          priority: actions.length + 1, tag: "Lifestyle", tone: "info",
          title: "Build back daily activity",
          body: stepsVal
            ? ("You're averaging " + stepsVal + " steps against an 8,000 target. Gradual increases are one of the highest-yield preventive steps alongside the measurements above.")
            : "Gradual increases in daily activity are one of the highest-yield preventive steps.",
          where: "Self-directed · review at GP visit",
          source: "NHS Live Well",
        });
      }
    }

    return actions.slice(0, 4);
  }

  // -- compose: backend response + seed + fallback → APP_DATA -----------

  function composeAppData(seed, profile, context, fallback) {
    fallback = fallback || (window.PPFallback && window.PPFallback.STATIC_DATA) || {};
    if (!seed) return fallback;

    var pres = seed.presentation || {};
    var contextLoc = (context && context.location) || null;
    var p = seed.patient || {};

    // Merge location: prefer live context (when present + matches), else preset.
    var location = contextLoc ? {
      latitude: contextLoc.latitude, longitude: contextLoc.longitude,
      localAuthority: contextLoc.adminDistrict,
      localAuthorityCode: pres.location ? pres.location.localAuthorityCode : null,
      icb: contextLoc.icb, nhsRegion: contextLoc.region,
      lsoa: contextLoc.lsoa,
      imdDecile: pres.location ? pres.location.imdDecile : null,
    } : (pres.location || (fallback.patient && fallback.patient.location));

    var patient = {
      name: pres.name || (fallback.patient && fallback.patient.name) || "Demo Patient",
      initials: pres.initials || (fallback.patient && fallback.patient.initials) || "DP",
      age: p.age,
      sex: pres.sex || (fallback.patient && fallback.patient.sex) || "—",
      ethnicity: pres.ethnicity || (fallback.patient && fallback.patient.ethnicity) || "—",
      postcode: pres.postcode || (fallback.patient && fallback.patient.postcode) || "M13 9PL",
      livesInEngland: p.livesInEngland !== false,
      location: location,
      conditions: deriveConditions(p),
      medications: p.onStatins ? ["Statin (preventive)"] : [],
      lifestyle: pres.lifestyle || (fallback.patient && fallback.patient.lifestyle) || {},
    };

    var checklist = adaptProfileChecklist(seed, profile, fallback);
    var measurements = adaptMeasurements(seed, profile, fallback);

    return {
      patient: patient,
      measurements: measurements,
      measurementDetail: (fallback && fallback.measurementDetail) || {},
      trends: deriveTrends(seed, fallback),
      healthCheck: adaptHealthCheck(seed, profile, fallback),
      cvdRisk: adaptCvdRisk(seed, profile, fallback),
      profileChecklist: checklist.profileChecklist,
      completeness: checklist.completeness,
      services: adaptServices(seed, context, fallback),
      waitingTimes: adaptWaitingTimes(context, fallback),
      actions: adaptActions(seed, profile, fallback),
      gpQuestions: (fallback && fallback.gpQuestions) || [],
      gpSummary: buildGpSummary(seed, profile, fallback),
      content: adaptContent(context, fallback),
      resources: (fallback && fallback.resources) || [],
      support: (fallback && fallback.support) || {},
      account: (fallback && fallback.account) || {},
      provenance: buildProvenance(profile, context, fallback),
      dataSources: (fallback && fallback.dataSources) || [],
      // Backend-only signals carried through for the UI badge layer.
      _backend: {
        source: profile && profile.source,
        urgencyLevel: profile && profile.urgencyLevel,
        nextStep: profile && profile.nextStep,
        card: profile && profile.card,
        factors: profile && profile.factors,
        readiness: profile && profile.readiness,
        eligibility: profile && profile.eligibility,
        screening: profile && profile.screening,
        missing: profile && profile.missing,
        dataQuality: context && context.dataQuality,
      },
    };
  }

  function deriveConditions(p) {
    var c = [];
    if (p.hasCvd) c.push("Cardiovascular disease");
    if (p.hasChronicKidneyDisease) c.push("Chronic kidney disease");
    if (p.hasDiabetes) c.push("Diabetes");
    if (p.hasHypertension) c.push("High blood pressure");
    if (p.hasAtrialFibrillation) c.push("Atrial fibrillation");
    if (p.hasStrokeOrTia) c.push("Stroke / TIA");
    if (p.hasFamilialHypercholesterolaemia) c.push("Familial hypercholesterolaemia");
    if (p.hasHeartFailure) c.push("Heart failure");
    if (p.hasPeripheralArterialDisease) c.push("Peripheral arterial disease");
    return c;
  }

  function deriveTrends(seed, fallback) {
    var fbTrends = (fallback && fallback.trends) || {};
    var pres = (seed && seed.presentation) || {};
    var p = (seed && seed.patient) || {};

    var trends = JSON.parse(JSON.stringify(fbTrends));

    // Update the ranges block to match this seed's actual values.
    if (Array.isArray(trends.ranges) && pres) {
      trends.ranges = trends.ranges.map(function (r) {
        var n = Object.assign({}, r);
        if (r.label === "BMI" && p.bmi != null) n.value = p.bmi;
        if (r.label === "Waist" && p.waistCircumferenceCm != null) n.value = p.waistCircumferenceCm;
        if (r.label === "Resting HR" && pres.heartRate && pres.heartRate.value != null) n.value = pres.heartRate.value;
        return n;
      });
    }
    if (trends.steps && pres.steps && pres.steps.value != null) {
      trends.steps.avg = pres.steps.value;
    }
    return trends;
  }

  function buildGpSummary(seed, profile, fallback) {
    var fb = (fallback && fallback.gpSummary) || "";
    if (!seed) return fb;
    var pres = seed.presentation || {};
    var p = seed.patient || {};
    var bits = [];
    bits.push("I'd like to discuss preventive cardiovascular risk. I'm " + p.age + ".");
    if (p.smokingStatus === "former") bits.push("Ex-smoker.");
    else if (p.smokingStatus === "current") bits.push("Current smoker.");
    if (p.bmi != null) bits.push("BMI " + p.bmi + ".");
    if (pres.lifestyle && pres.lifestyle.familyHistoryFlag === "raised" && pres.lifestyle.familyHistory) {
      bits.push("Family history: " + pres.lifestyle.familyHistory.toLowerCase() + ".");
    }
    var missing = [];
    if (p.systolicBp == null) missing.push("blood pressure");
    if (p.totalCholesterol == null) missing.push("cholesterol/HDL");
    if (missing.length) bits.push("I don't currently know my " + missing.join(" or ") + ".");
    if (profile && profile.eligibility && profile.eligibility.status === "possibly") {
      bits.push("Based on the NHS Health Check criteria I believe I may be eligible.");
    }
    bits.push("Could we formally assess my CVD risk and arrange the measurements that are missing?");
    return bits.join(" ");
  }

  function buildProvenance(profile, context, fallback) {
    var fb = (fallback && fallback.provenance) || [];
    var prov = fb.slice();
    if (context && context.dataQuality) {
      // Tag the modes from live response.
      var map = {
        "Location & NHS geography": context.dataQuality.postcode,
        "Local services": context.dataQuality.services,
        "Waiting times": context.dataQuality.waitingTimes,
        "Official NHS content": context.dataQuality.officialContent,
        "Population stats": context.dataQuality.population,
      };
      prov = prov.map(function (row) {
        var live = map[row.label];
        if (live) return Object.assign({}, row, { mode: live });
        return row;
      });
    }
    if (profile && profile.source) {
      prov.unshift({ label: "Personalised card", source: "z.ai GLM-5.1 (server-screened)", mode: profile.source });
    }
    return prov;
  }

  window.PPAdapt = {
    composeAppData: composeAppData,
    adaptMeasurements: adaptMeasurements,
    adaptHealthCheck: adaptHealthCheck,
    adaptCvdRisk: adaptCvdRisk,
    adaptServices: adaptServices,
    adaptWaitingTimes: adaptWaitingTimes,
    adaptContent: adaptContent,
    adaptActions: adaptActions,
    adaptProfileChecklist: adaptProfileChecklist,
    bmiBand: bmiBand,
    waistBand: waistBand,
    bpBand: bpBand,
    cholesterolBand: cholesterolBand,
  };
})();
