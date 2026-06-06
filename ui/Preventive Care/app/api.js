/* PreventPath UI ↔ backend client (browser globals — no ES module).
   Mirrors docs/ui-api-client.js, but exposes window.PPApi.* so it can load
   from a plain <script> tag alongside Babel-standalone. No throws — every
   call resolves to { ok, data?, status, error?, issues? }. */

(function () {
  var API_BASE = "http://localhost:3000";
  var DEFAULT_TIMEOUT_MS = 12000;

  function setApiBase(url) {
    if (typeof url !== "string" || url.length === 0) {
      throw new Error("api base must be a non-empty string");
    }
    API_BASE = url.replace(/\/+$/, "");
  }

  function getApiBase() {
    return API_BASE;
  }

  async function jsonFetch(path, init, timeoutMs) {
    init = init || {};
    timeoutMs = timeoutMs || DEFAULT_TIMEOUT_MS;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    var res;
    try {
      res = await fetch(API_BASE + path, Object.assign({}, init, { signal: controller.signal }));
    } catch (err) {
      clearTimeout(timer);
      return {
        ok: false,
        status: 0,
        error: err && err.name === "AbortError" ? "timeout" : "network",
      };
    }
    clearTimeout(timer);
    var body = null;
    try {
      body = await res.json();
    } catch (e) {
      return { ok: false, status: res.status, error: "non-json response" };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: (body && body.error) || ("http " + res.status),
        issues: body && body.issues,
      };
    }
    return { ok: true, data: body, status: res.status };
  }

  function fetchPostcode(postcode) {
    var q = new URLSearchParams({ postcode: postcode }).toString();
    return jsonFetch("/api/nhs/postcode?" + q);
  }

  function fetchContext(postcode, mode) {
    var params = { postcode: postcode };
    if (mode) params.mode = mode;
    var q = new URLSearchParams(params).toString();
    return jsonFetch("/api/nhs/context?" + q);
  }

  function fetchProfile(opts) {
    opts = opts || {};
    if (!opts.patient || typeof opts.patient !== "object") {
      return Promise.resolve({ ok: false, status: 0, error: "patient required" });
    }
    var q = opts.live ? "?live=1" : "";
    return jsonFetch("/api/nhs/profile" + q, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patient: opts.patient, postcode: opts.postcode }),
    });
  }

  function fetchFull(opts) {
    opts = opts || {};
    if (!opts.patient || typeof opts.patient !== "object") {
      return Promise.resolve({ ok: false, status: 0, error: "patient required" });
    }
    var mode = opts.mode || "demo";
    var q = "?mode=" + encodeURIComponent(mode) + (opts.live ? "&live=1" : "");
    return jsonFetch("/api/nhs/full" + q, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patient: opts.patient, postcode: opts.postcode }),
    });
  }

  function emptyPatientInput() {
    return {
      age: 0,
      livesInEngland: true,
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
    };
  }

  function dataQualityBadge(value) {
    switch (value) {
      case "live": return { label: "Live", tone: "ok" };
      case "live-aggregate": return { label: "Live (aggregate)", tone: "ok" };
      case "cached": return { label: "Cached", tone: "info" };
      case "cached-fallback": return { label: "Cached fallback", tone: "info" };
      case "synthetic": return { label: "Demo data", tone: "warn" };
      case "mock": return { label: "Mock", tone: "warn" };
      case "failed": return { label: "Unavailable", tone: "error" };
      case "not_loaded": return { label: "Not loaded", tone: "muted" };
      case "safe_fallback": return { label: "Cached", tone: "info" };
      default: return { label: String(value), tone: "muted" };
    }
  }

  window.PPApi = {
    setApiBase: setApiBase,
    getApiBase: getApiBase,
    fetchPostcode: fetchPostcode,
    fetchContext: fetchContext,
    fetchProfile: fetchProfile,
    fetchFull: fetchFull,
    emptyPatientInput: emptyPatientInput,
    dataQualityBadge: dataQualityBadge,
  };
})();
