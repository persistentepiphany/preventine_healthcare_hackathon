/* PreventPath demo patient seeds.
   - DEFAULT_SEED reproduces the original James Whitfield fixture exactly.
   - RANDOM_SEEDS is a small hand-curated set used for the Demo ↻ randomize.
   - Every seed sets all three red-flag symptoms to false so the engine's
     urgent_care branch never fires during a demo.
   - buildPatientInput() shapes a seed into the backend's PatientInput;
     buildPresentation() shapes the UI-only dressing (name, sparklines,
     lifestyle prose, ethnicity) that the backend doesn't carry. */

(function () {

  // -- Helpers ----------------------------------------------------------

  // Builds a 6-point monotonic sparkline that ends at `end`. Used for BMI/waist
  // trends. Direction "up" rises slowly to end; "down" falls slowly to end;
  // "flat" stays within ±2% of end. Deterministic per (end, direction).
  function spark6(end, direction) {
    var n = end == null ? 0 : Number(end);
    if (!isFinite(n)) return [];
    var out = [];
    for (var i = 0; i < 6; i++) {
      var t = i / 5; // 0..1
      var delta = 0;
      if (direction === "up") delta = -(1 - t) * (n * 0.05);
      else if (direction === "down") delta = (1 - t) * (n * 0.05);
      else delta = Math.sin(i) * (n * 0.01);
      out.push(Math.round((n + delta) * 10) / 10);
    }
    return out;
  }

  // Pulse-style sparkline for heart rate (12 weeks).
  function pulseSpark(center) {
    var c = center == null ? 72 : center;
    return [c - 2, c - 1, c - 3, c, c + 1, c - 1, c - 2, c, c + 2, c, c - 1, c];
  }

  // -- The stable default seed -----------------------------------------
  //
  // Mirrors the original window.APP_DATA.patient + measurements + lifestyle.
  // Keep field-for-field stable so reload-in-Default = exact original UI.

  var DEFAULT_SEED = {
    id: "james-whitfield",
    patient: {
      age: 52,
      livesInEngland: true,
      sexAtBirth: "male",
      hasCvd: false,
      hasChronicKidneyDisease: false,
      hasDiabetes: false,
      hasHypertension: false,
      hasAtrialFibrillation: false,
      hasStrokeOrTia: false,
      hasFamilialHypercholesterolaemia: false,
      hasHeartFailure: false,
      hasPeripheralArterialDisease: false,
      onStatins: false,
      previousHighCvdRisk: false,
      bpCheckedLast6Months: false,
      chestPain: false,
      strokeSymptoms: false,
      severeBreathlessness: false,
      // measurements undefined → backend factors will say "unknown"
      systolicBp: undefined,
      diastolicBp: undefined,
      totalCholesterol: undefined,
      hdlCholesterol: undefined,
      bmi: 28.4,
      waistCircumferenceCm: 102,
      smokingStatus: "former",
    },
    presentation: {
      name: "James Whitfield",
      initials: "JW",
      sex: "Male",
      ethnicity: "White British",
      postcode: "M13 9PL",
      location: {
        latitude: 53.4668, longitude: -2.23,
        localAuthority: "Manchester", localAuthorityCode: "E08000003",
        icb: "NHS Greater Manchester ICB", nhsRegion: "North West",
        lsoa: "Manchester 035C", imdDecile: 2,
      },
      lifestyle: {
        smoking: "Ex-smoker — quit 2019 (20 pack-years)", smokingFlag: "history",
        alcohol: "~16 units / week", alcoholFlag: "raised",
        activity: "Low — mostly sedentary", activityFlag: "raised",
        familyHistory: "Father — heart attack, age 58", familyHistoryFlag: "raised",
      },
      heartRate: { value: 74, unit: "bpm", status: "good", spark: pulseSpark(74), source: "Connected watch" },
      steps: { value: 5240, target: 8000, status: "raised", spark: [6100, 5800, 5200, 4900, 5400, 5240], trend: "down" },
      bmiSpark: [27.1, 27.4, 27.8, 28.0, 28.2, 28.4],
      waistSpark: [99, 100, 100, 101, 101, 102],
    },
  };

  // -- Random demo seeds (six hand-curated archetypes) ------------------
  //
  // All keep livesInEngland=true and all three red-flag symptoms false.
  // Postcodes are real and resolve live via postcodes.io.

  var RANDOM_SEEDS = [
    DEFAULT_SEED,
    {
      id: "aisha-khan",
      patient: {
        age: 58, livesInEngland: true, sexAtBirth: "female",
        hasCvd: false, hasChronicKidneyDisease: false, hasDiabetes: false,
        hasHypertension: false, hasAtrialFibrillation: false, hasStrokeOrTia: false,
        hasFamilialHypercholesterolaemia: false, hasHeartFailure: false,
        hasPeripheralArterialDisease: false, onStatins: false, previousHighCvdRisk: false,
        bpCheckedLast6Months: true,
        chestPain: false, strokeSymptoms: false, severeBreathlessness: false,
        systolicBp: 138, diastolicBp: 86,
        totalCholesterol: undefined, hdlCholesterol: undefined,
        bmi: 27.1, waistCircumferenceCm: 89, smokingStatus: "current",
      },
      presentation: {
        name: "Aisha Khan", initials: "AK", sex: "Female", ethnicity: "British Pakistani",
        postcode: "B14 7BX",
        location: {
          latitude: 52.418, longitude: -1.897,
          localAuthority: "Birmingham", localAuthorityCode: "E08000025",
          icb: "NHS Birmingham and Solihull ICB", nhsRegion: "Midlands",
          lsoa: "Birmingham 121A", imdDecile: 3,
        },
        lifestyle: {
          smoking: "Current smoker — 10/day", smokingFlag: "raised",
          alcohol: "Rarely drinks", alcoholFlag: "good",
          activity: "Moderate — walks daily", activityFlag: "good",
          familyHistory: "No first-degree CVD history", familyHistoryFlag: "good",
        },
        heartRate: { value: 78, unit: "bpm", status: "good", spark: pulseSpark(78), source: "Self-reported" },
        steps: { value: 7100, target: 8000, status: "good", spark: [6400, 6800, 7200, 7000, 7300, 7100], trend: "flat" },
        bmiSpark: spark6(27.1, "up"), waistSpark: spark6(89, "up"),
      },
    },
    {
      id: "daniel-reeves",
      patient: {
        age: 67, livesInEngland: true, sexAtBirth: "male",
        hasCvd: false, hasChronicKidneyDisease: false, hasDiabetes: false,
        hasHypertension: true, hasAtrialFibrillation: false, hasStrokeOrTia: false,
        hasFamilialHypercholesterolaemia: false, hasHeartFailure: false,
        hasPeripheralArterialDisease: false, onStatins: true, previousHighCvdRisk: false,
        bpCheckedLast6Months: true,
        chestPain: false, strokeSymptoms: false, severeBreathlessness: false,
        systolicBp: 132, diastolicBp: 80,
        totalCholesterol: 4.2, hdlCholesterol: 1.4,
        bmi: 26.5, waistCircumferenceCm: 95, smokingStatus: "never",
      },
      presentation: {
        name: "Daniel Reeves", initials: "DR", sex: "Male", ethnicity: "White British",
        postcode: "LS6 3HN",
        location: {
          latitude: 53.821, longitude: -1.567,
          localAuthority: "Leeds", localAuthorityCode: "E08000035",
          icb: "NHS West Yorkshire ICB", nhsRegion: "North East and Yorkshire",
          lsoa: "Leeds 099C", imdDecile: 6,
        },
        lifestyle: {
          smoking: "Never smoked", smokingFlag: "good",
          alcohol: "~6 units / week", alcoholFlag: "good",
          activity: "Active — cycling 3×/wk", activityFlag: "good",
          familyHistory: "Mother — stroke, age 71", familyHistoryFlag: "raised",
        },
        heartRate: { value: 68, unit: "bpm", status: "good", spark: pulseSpark(68), source: "Connected watch" },
        steps: { value: 8900, target: 8000, status: "good", spark: [8200, 8600, 9100, 8800, 9000, 8900], trend: "flat" },
        bmiSpark: spark6(26.5, "flat"), waistSpark: spark6(95, "flat"),
      },
    },
    {
      id: "emma-carter",
      patient: {
        age: 44, livesInEngland: true, sexAtBirth: "female",
        hasCvd: false, hasChronicKidneyDisease: false, hasDiabetes: false,
        hasHypertension: false, hasAtrialFibrillation: false, hasStrokeOrTia: false,
        hasFamilialHypercholesterolaemia: false, hasHeartFailure: false,
        hasPeripheralArterialDisease: false, onStatins: false, previousHighCvdRisk: false,
        bpCheckedLast6Months: true,
        chestPain: false, strokeSymptoms: false, severeBreathlessness: false,
        systolicBp: 118, diastolicBp: 74,
        totalCholesterol: 4.9, hdlCholesterol: 1.6,
        bmi: 23.5, waistCircumferenceCm: 76, smokingStatus: "never",
      },
      presentation: {
        name: "Emma Carter", initials: "EC", sex: "Female", ethnicity: "White British",
        postcode: "BS3 4HZ",
        location: {
          latitude: 51.438, longitude: -2.610,
          localAuthority: "Bristol", localAuthorityCode: "E06000023",
          icb: "NHS Bristol, North Somerset and South Gloucestershire ICB", nhsRegion: "South West",
          lsoa: "Bristol 048B", imdDecile: 7,
        },
        lifestyle: {
          smoking: "Never smoked", smokingFlag: "good",
          alcohol: "~4 units / week", alcoholFlag: "good",
          activity: "Active — runs 3×/wk", activityFlag: "good",
          familyHistory: "No first-degree CVD history", familyHistoryFlag: "good",
        },
        heartRate: { value: 62, unit: "bpm", status: "good", spark: pulseSpark(62), source: "Connected watch" },
        steps: { value: 9400, target: 8000, status: "good", spark: [8800, 9100, 9600, 9200, 9500, 9400], trend: "flat" },
        bmiSpark: spark6(23.5, "flat"), waistSpark: spark6(76, "flat"),
      },
    },
    {
      id: "mark-ellison",
      patient: {
        age: 49, livesInEngland: true, sexAtBirth: "male",
        hasCvd: false, hasChronicKidneyDisease: false, hasDiabetes: false,
        hasHypertension: false, hasAtrialFibrillation: false, hasStrokeOrTia: false,
        hasFamilialHypercholesterolaemia: false, hasHeartFailure: false,
        hasPeripheralArterialDisease: false, onStatins: false, previousHighCvdRisk: false,
        bpCheckedLast6Months: false,
        chestPain: false, strokeSymptoms: false, severeBreathlessness: false,
        systolicBp: 126, diastolicBp: 80,
        totalCholesterol: 5.0, hdlCholesterol: 1.3,
        bmi: undefined, waistCircumferenceCm: undefined,
        smokingStatus: "former",
      },
      presentation: {
        name: "Mark Ellison", initials: "ME", sex: "Male", ethnicity: "White British",
        postcode: "NE2 1AD",
        location: {
          latitude: 54.984, longitude: -1.605,
          localAuthority: "Newcastle upon Tyne", localAuthorityCode: "E08000021",
          icb: "NHS North East and North Cumbria ICB", nhsRegion: "North East and Yorkshire",
          lsoa: "Newcastle 011D", imdDecile: 5,
        },
        lifestyle: {
          smoking: "Ex-smoker — quit 2021", smokingFlag: "history",
          alcohol: "~12 units / week", alcoholFlag: "raised",
          activity: "Moderate — walks daily", activityFlag: "good",
          familyHistory: "Brother — high cholesterol, age 45", familyHistoryFlag: "raised",
        },
        heartRate: { value: 70, unit: "bpm", status: "good", spark: pulseSpark(70), source: "Self-reported" },
        steps: { value: 7800, target: 8000, status: "good", spark: [7300, 7500, 7900, 7700, 7900, 7800], trend: "flat" },
        bmiSpark: [], waistSpark: [],
      },
    },
    {
      id: "priya-sharma",
      patient: {
        age: 62, livesInEngland: true, sexAtBirth: "female",
        hasCvd: false, hasChronicKidneyDisease: false, hasDiabetes: false,
        hasHypertension: false, hasAtrialFibrillation: false, hasStrokeOrTia: false,
        hasFamilialHypercholesterolaemia: false, hasHeartFailure: false,
        hasPeripheralArterialDisease: false, onStatins: false, previousHighCvdRisk: false,
        bpCheckedLast6Months: false,
        chestPain: false, strokeSymptoms: false, severeBreathlessness: false,
        systolicBp: undefined, diastolicBp: undefined,
        totalCholesterol: undefined, hdlCholesterol: undefined,
        bmi: undefined, waistCircumferenceCm: undefined,
        smokingStatus: "never",
      },
      presentation: {
        name: "Priya Sharma", initials: "PS", sex: "Female", ethnicity: "British Indian",
        postcode: "SW2 5JE",
        location: {
          latitude: 51.450, longitude: -0.118,
          localAuthority: "Lambeth", localAuthorityCode: "E09000022",
          icb: "NHS South East London ICB", nhsRegion: "London",
          lsoa: "Lambeth 027C", imdDecile: 4,
        },
        lifestyle: {
          smoking: "Never smoked", smokingFlag: "good",
          alcohol: "Rarely drinks", alcoholFlag: "good",
          activity: "Low — mostly sedentary", activityFlag: "raised",
          familyHistory: "Father — heart attack, age 60", familyHistoryFlag: "raised",
        },
        heartRate: { value: 76, unit: "bpm", status: "good", spark: pulseSpark(76), source: "Self-reported" },
        steps: { value: 4100, target: 8000, status: "raised", spark: [3900, 4200, 3800, 4300, 4100, 4100], trend: "flat" },
        bmiSpark: [], waistSpark: [],
      },
    },
    {
      id: "tom-bryant",
      patient: {
        age: 55, livesInEngland: true, sexAtBirth: "male",
        hasCvd: false, hasChronicKidneyDisease: false, hasDiabetes: false,
        hasHypertension: false, hasAtrialFibrillation: false, hasStrokeOrTia: false,
        hasFamilialHypercholesterolaemia: false, hasHeartFailure: false,
        hasPeripheralArterialDisease: false, onStatins: false, previousHighCvdRisk: false,
        bpCheckedLast6Months: true,
        chestPain: false, strokeSymptoms: false, severeBreathlessness: false,
        systolicBp: 142, diastolicBp: 90,
        totalCholesterol: 5.8, hdlCholesterol: 1.1,
        bmi: 29.7, waistCircumferenceCm: 101, smokingStatus: "former",
      },
      presentation: {
        name: "Tom Bryant", initials: "TB", sex: "Male", ethnicity: "White British",
        postcode: "L8 7SN",
        location: {
          latitude: 53.388, longitude: -2.961,
          localAuthority: "Liverpool", localAuthorityCode: "E08000012",
          icb: "NHS Cheshire and Merseyside ICB", nhsRegion: "North West",
          lsoa: "Liverpool 062B", imdDecile: 2,
        },
        lifestyle: {
          smoking: "Ex-smoker — quit 2018", smokingFlag: "history",
          alcohol: "~20 units / week", alcoholFlag: "raised",
          activity: "Low — mostly sedentary", activityFlag: "raised",
          familyHistory: "No first-degree CVD history", familyHistoryFlag: "good",
        },
        heartRate: { value: 75, unit: "bpm", status: "good", spark: pulseSpark(75), source: "Self-reported" },
        steps: { value: 4800, target: 8000, status: "raised", spark: [4600, 4900, 4500, 5000, 4700, 4800], trend: "flat" },
        bmiSpark: spark6(29.7, "up"), waistSpark: spark6(101, "up"),
      },
    },
  ];

  function pickRandomSeed(rng) {
    var r = typeof rng === "function" ? rng : Math.random;
    // Skip index 0 (default) so randomize feels different from default.
    var i = 1 + Math.floor(r() * (RANDOM_SEEDS.length - 1));
    if (i >= RANDOM_SEEDS.length) i = RANDOM_SEEDS.length - 1;
    return RANDOM_SEEDS[i];
  }

  function buildPatientInput(seed) {
    if (!seed || !seed.patient) return null;
    // Clone so the consumer can't mutate the canonical seed.
    return JSON.parse(JSON.stringify(seed.patient));
  }

  function buildPresentation(seed) {
    if (!seed || !seed.presentation) return null;
    return JSON.parse(JSON.stringify(seed.presentation));
  }

  window.PPSeeds = {
    DEFAULT_SEED: DEFAULT_SEED,
    RANDOM_SEEDS: RANDOM_SEEDS,
    pickRandomSeed: pickRandomSeed,
    buildPatientInput: buildPatientInput,
    buildPresentation: buildPresentation,
    spark6: spark6,
    pulseSpark: pulseSpark,
  };
})();
