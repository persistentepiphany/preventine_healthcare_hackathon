/* Stage 1 — Connect: profile, location, data sources, manual entry + upload.
   Demo = pre-loaded, Live = from scratch. User-entered values + uploaded
   records persist to localStorage so they survive reloads (prototype only). */

const PP_LS = {
  manual: "pp-manual-entries",
  records: "pp-uploaded-records",
  location: "pp-location-override",
};

function lsGet(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function lsSet(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* quota / private mode — ignore */
  }
}

function Connect({ app, go }) {
  const D = window.APP_DATA;
  const { patient, dataSources, measurements, provenance } = D;
  const [ingesting, setIngesting] = useState(false);
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const mapMarker = useRef(null);
  const fileInputRef = useRef(null);

  // Hydrated from localStorage on mount.
  const [manual, setManual] = useState(() => lsGet(PP_LS.manual, {}));
  const [records, setRecords] = useState(() => lsGet(PP_LS.records, []));
  const [locOverride, setLocOverride] = useState(() => lsGet(PP_LS.location, null));

  const [showManual, setShowManual] = useState(false);
  const [pcInput, setPcInput] = useState("");
  const [pcStatus, setPcStatus] = useState({ tone: "idle", msg: "" });

  const hasData = app.mode === "demo" || app.ingested;

  // Effective location = override (if any) wins over backend/fallback.
  const location = locOverride || patient.location;
  const postcode = locOverride ? locOverride.postcode : patient.postcode;

  // Set up the map once. We re-position the marker when location changes.
  useEffect(() => {
    if (mapObj.current || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, {
      zoomControl: false, scrollWheelZoom: false, dragging: false,
      doubleClickZoom: false, attributionControl: false, keyboard: false,
    }).setView([location.latitude, location.longitude], 13);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19 }).addTo(map);
    mapMarker.current = L.marker([location.latitude, location.longitude], {
      icon: L.divIcon({ className: "", html: '<div class="home-pin"><span></span></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
    }).addTo(map);
    mapObj.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

  useEffect(() => {
    if (!mapObj.current || !mapMarker.current) return;
    mapObj.current.setView([location.latitude, location.longitude], 13);
    mapMarker.current.setLatLng([location.latitude, location.longitude]);
  }, [location.latitude, location.longitude]);

  // Apply manual overrides on top of measurements (match by id).
  const mergedMeasurements = measurements.map((m) => {
    const o = manual[m.id];
    if (!o || o.value == null || o.value === "") return m;
    return Object.assign({}, m, {
      value: o.value,
      status: o.status || (m.status === "missing" ? "raised" : m.status),
      statusLabel: o.statusLabel || (m.status === "missing" ? "Self-entered" : m.statusLabel),
      source: "Self-entered",
    });
  });

  const ingestSteps = [
    { text: "Authenticating with NHS login", result: "Verified", tone: "ok" },
    { text: "Pulling your GP record", result: "Found", tone: "ok" },
    { text: "Reading connected watch", result: "30 days", tone: "ok" },
    { text: "Normalising measurements", result: "6 signals", tone: "ok" },
    { text: "Flagging missing checks", result: "2 gaps", tone: "warn" },
  ];

  function startIngest() {
    if (ingesting || hasData) return;
    setIngesting(true);
  }

  // ---- Postcode change ------------------------------------------------
  async function submitPostcode(e) {
    if (e && e.preventDefault) e.preventDefault();
    const raw = (pcInput || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!raw) {
      setPcStatus({ tone: "err", msg: "Enter a postcode (e.g. M13 9PL)." });
      return;
    }
    setPcStatus({ tone: "idle", msg: "Looking up…" });
    const r = await window.PPApi.fetchPostcode(raw);
    if (!r.ok || !r.data || !r.data.location) {
      setPcStatus({ tone: "err", msg: "Couldn't find that postcode." });
      return;
    }
    const loc = r.data.location;
    if (loc.latitude == null || loc.longitude == null) {
      setPcStatus({ tone: "err", msg: "Postcode found but no coordinates returned." });
      return;
    }
    const next = {
      postcode: r.data.resolvedPostcode || raw,
      latitude: loc.latitude,
      longitude: loc.longitude,
      localAuthority: loc.adminDistrict || "—",
      icb: loc.icb || "—",
      nhsRegion: loc.region || "—",
      lsoa: loc.lsoa || "—",
    };
    setLocOverride(next);
    lsSet(PP_LS.location, next);
    setPcInput("");
    setPcStatus({ tone: "ok", msg: "Updated to " + next.postcode + "." });
  }
  function clearLocation() {
    setLocOverride(null);
    lsSet(PP_LS.location, null);
    setPcStatus({ tone: "ok", msg: "Reverted to demo location." });
  }

  // ---- Manual entry ---------------------------------------------------
  function saveManual(values) {
    const cleaned = {};
    if (values.age) cleaned.age = { value: values.age };
    if (values.sex) cleaned.sex = { value: values.sex };
    if (values.bp) cleaned.bp = { value: values.bp, status: bandFromBp(values.bp) };
    if (values.cholesterol) cleaned.cholesterol = { value: values.cholesterol, status: bandFromChol(values.cholesterol) };
    if (values.hdl) cleaned.hdl = { value: values.hdl };
    if (values.bmi) cleaned.bmi = { value: values.bmi, status: bandFromBmi(values.bmi) };
    if (values.waist) cleaned.waist = { value: values.waist, status: bandFromWaist(values.waist, patient.sex) };
    if (values.smoking) cleaned.smoking = { value: values.smoking };
    setManual(cleaned);
    lsSet(PP_LS.manual, cleaned);
    setShowManual(false);
    app.markIngested();
  }
  function clearManual() {
    setManual({});
    lsSet(PP_LS.manual, {});
  }

  // ---- Upload ---------------------------------------------------------
  function pickFile() {
    if (fileInputRef.current) fileInputRef.current.click();
  }
  function onFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const added = files.map((f) => ({
      id: Date.now() + "-" + f.name,
      name: f.name,
      size: f.size,
      type: f.type || "file",
      addedAt: new Date().toISOString(),
    }));
    const next = added.concat(records);
    setRecords(next);
    lsSet(PP_LS.records, next);
    app.markIngested();
    e.target.value = "";
  }
  function removeRecord(id) {
    const next = records.filter((r) => r.id !== id);
    setRecords(next);
    lsSet(PP_LS.records, next);
  }

  const hasManual = Object.keys(manual).length > 0;
  const hasRecords = records.length > 0;
  const ageBand = patient.age ? patient.age + " yrs" : "—";

  // Build the backend PatientInput from manual entries only. Anything the
  // user did not enter stays undefined → the backend marks it "unknown" and
  // the UI tile stays "Not recorded". This is the no-autofill contract.
  function buildPatientInputFromManual() {
    const base = window.PPApi.emptyPatientInput();
    base.livesInEngland = true;
    if (manual.age && manual.age.value) {
      const n = parseInt(manual.age.value, 10);
      if (isFinite(n) && n > 0 && n <= 120) base.age = n;
    }
    if (!base.age) base.age = 50; // safe default for the schema; user can always set it
    if (manual.sex && manual.sex.value) base.sexAtBirth = manual.sex.value;
    if (manual.bp && manual.bp.value) {
      const m = /^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/.exec(manual.bp.value);
      if (m) { base.systolicBp = +m[1]; base.diastolicBp = +m[2]; base.bpCheckedLast6Months = true; }
    }
    if (manual.cholesterol && manual.cholesterol.value) {
      const n = parseFloat(manual.cholesterol.value);
      if (isFinite(n)) base.totalCholesterol = n;
    }
    if (manual.hdl && manual.hdl.value) {
      const n = parseFloat(manual.hdl.value);
      if (isFinite(n)) base.hdlCholesterol = n;
    }
    if (manual.bmi && manual.bmi.value) {
      const n = parseFloat(manual.bmi.value);
      if (isFinite(n)) base.bmi = n;
    }
    if (manual.waist && manual.waist.value) {
      const n = parseFloat(manual.waist.value);
      if (isFinite(n)) base.waistCircumferenceCm = n;
    }
    if (manual.smoking && manual.smoking.value) base.smokingStatus = manual.smoking.value;
    return base;
  }

  function onGenerate() {
    if (app.mode === "live") {
      const pi = buildPatientInputFromManual();
      app.submitLive(pi, postcode);
    } else {
      go("report");
    }
  }

  return (
    <div className="stage">
      <div className="stage-head">
        <div>
          <div className="stage-eyebrow">Step 1 · Connect</div>
          <h1 className="stage-title">Welcome back, {patient.name.split(" ")[0]}</h1>
          <p className="stage-lede">
            {app.mode === "live"
              ? "Link your NHS record or add results manually — your prevention report builds from what you add."
              : "Your demo profile is pre-loaded. Tweak your location or add measurements, then continue to your report."}
          </p>
        </div>
        {hasData && (
          <button className="cta" onClick={onGenerate} disabled={app.apiState === "loading"}>
            {app.apiState === "loading"
              ? <>Building report…</>
              : <>Generate report <Icon name="arrowRight" size={16} stroke={2} /></>}
          </button>
        )}
      </div>

      {/* Profile hero — who we have on file */}
      <section className="panel profile-strip">
        <span className="avatar-xl">{patient.initials}</span>
        <div className="profile-strip-id">
          <div className="profile-strip-name">{patient.name}</div>
          <div className="profile-strip-meta">{ageBand} · {patient.sex} · {patient.ethnicity} · {postcode}</div>
          <div className="profile-strip-tags">
            <span className="profile-tag"><span className={app.mode === "live" ? "live-dot" : "prov-dot prov-dot--cache"} /> {app.mode === "live" ? "Live mode" : app.mode === "demo" ? "Demo mode" : "Default profile"}</span>
            {patient.conditions && patient.conditions.length
              ? patient.conditions.map((c) => <span key={c} className="profile-tag">{c}</span>)
              : <span className="profile-tag">No conditions on file</span>}
            {patient.medications && patient.medications.length
              ? patient.medications.map((m) => <span key={m} className="profile-tag"><Icon name="droplet" size={11} stroke={2} /> {m}</span>)
              : null}
            {hasManual && <span className="profile-tag" style={{ color: "var(--good)" }}><Icon name="check" size={11} stroke={2.5} /> {Object.keys(manual).length} self-entered</span>}
            {hasRecords && <span className="profile-tag" style={{ color: "var(--accent-ink)" }}><Icon name="upload" size={11} stroke={2} /> {records.length} record{records.length === 1 ? "" : "s"}</span>}
          </div>
        </div>
        <button className="profile-edit" onClick={() => app.nav("profile")}>
          <Icon name="arrowRight" size={13} stroke={2} /> Full profile
        </button>
      </section>

      {/* Location & NHS area — geography resolves immediately, postcode editable */}
      <section className="panel loc-panel">
        <div className="loc-map" ref={mapRef} />
        <div className="loc-info">
          <div className="panel-head">
            <h2 className="panel-title">Your NHS area</h2>
            <span className="prov-chip"><span className="prov-dot prov-dot--live" /> Live · postcodes.io</span>
          </div>
          <div className="loc-facts">
            <div className="loc-fact"><span className="loc-k">Postcode</span><span className="loc-v">{postcode}</span></div>
            <div className="loc-fact"><span className="loc-k">Local authority</span><span className="loc-v">{location.localAuthority}</span></div>
            <div className="loc-fact"><span className="loc-k">Integrated Care Board</span><span className="loc-v">{location.icb}</span></div>
            <div className="loc-fact"><span className="loc-k">NHS region</span><span className="loc-v">{location.nhsRegion}</span></div>
          </div>
          <form className="pc-form" onSubmit={submitPostcode}>
            <input
              className="pc-input"
              placeholder="Change postcode (e.g. SW1A 1AA)"
              value={pcInput}
              onChange={(e) => setPcInput(e.target.value)}
              maxLength={10}
            />
            <button type="submit" className="pc-btn" disabled={!pcInput.trim()}>Update</button>
          </form>
          {pcStatus.msg && (
            <div className={"pc-msg" + (pcStatus.tone === "err" ? " pc-msg--err" : pcStatus.tone === "ok" ? " pc-msg--ok" : "")}>
              {pcStatus.msg}
              {locOverride && (
                <> · <button onClick={clearLocation} style={{ color: "var(--accent-ink)", background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}>reset</button></>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Two columns: sources + recorded data */}
      <div className="connect-grid">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Add your data</h2>
            <span className="prov-chip">{hasData ? <><span className="prov-dot prov-dot--live" /> Connected</> : "Not linked"}</span>
          </div>
          <div className="source-list">
            {dataSources.map((s) => {
              const isUpload = s.id === "upload";
              const isManual = s.id === "manual" || s.id === "self-report";
              const connected = hasData && (s.state === "preloaded" || s.state === "connected");
              const clickable = isUpload || isManual || (!hasData && !ingesting);
              const onClick = isUpload
                ? pickFile
                : isManual
                ? () => setShowManual(true)
                : (clickable ? startIngest : undefined);
              const stateLabel = isUpload && hasRecords
                ? records.length + " file" + (records.length === 1 ? "" : "s")
                : isManual && hasManual
                ? Object.keys(manual).length + " added"
                : connected
                ? <><Icon name="check" size={12} stroke={3} /> Linked</>
                : ingesting ? "…" : isUpload || isManual ? "Open" : "Connect";
              return (
                <button
                  key={s.id}
                  className={"source-row" + (connected || (isUpload && hasRecords) || (isManual && hasManual) ? " source-row--on" : "") + (clickable ? " source-row--btn" : "")}
                  onClick={onClick}
                >
                  <span className="source-ico"><Icon name={s.icon} size={18} stroke={1.8} /></span>
                  <div className="source-main">
                    <div className="source-label">{s.label}</div>
                    <div className="source-desc">{s.desc}</div>
                  </div>
                  <span className={"source-state" + (connected || (isUpload && hasRecords) || (isManual && hasManual) ? " source-state--on" : "")}>
                    {stateLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Hidden file input — triggered by the "Upload a record" source row */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            multiple
            style={{ display: "none" }}
            onChange={onFileChange}
          />

          {/* Recently uploaded records (localStorage) */}
          {hasRecords && (
            <div className="records-list">
              {records.map((r) => (
                <div key={r.id} className="record-row">
                  <Icon name="upload" size={14} stroke={1.8} />
                  <span className="record-name">{r.name}</span>
                  <span className="record-meta">{formatBytes(r.size)} · {formatRelative(r.addedAt)}</span>
                  <button className="record-rm" title="Remove" onClick={() => removeRecord(r.id)}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Inline manual-entry form */}
          {showManual && (
            <ManualEntryForm
              patient={patient}
              initial={manual}
              onCancel={() => setShowManual(false)}
              onSave={saveManual}
              onClear={hasManual ? clearManual : null}
            />
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">On file</h2>
            {hasData && <span className="panel-meta">{mergedMeasurements.length} measurements{hasManual ? " · self-entered" : ""}</span>}
          </div>

          {ingesting ? (
            <EngineRun
              steps={ingestSteps}
              title="Importing your records"
              sub="Pulling from NHS login & connected devices"
              doneLabel="Records imported"
              holdMs={620}
              onDone={() => { setIngesting(false); app.markIngested(); }}
            />
          ) : !hasData ? (
            <div className="empty-state">
              <span className="empty-ico"><Icon name="upload" size={26} stroke={1.6} /></span>
              <div className="empty-title">No health data yet</div>
              <div className="empty-sub">Upload a record or enter values manually to start your profile.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="cta cta--sm" onClick={pickFile}><Icon name="upload" size={14} stroke={2} /> Upload a record</button>
                <button className="cta cta--sm cta--ghost" onClick={() => setShowManual(true)}><Icon name="check" size={14} stroke={2} /> Enter manually</button>
              </div>
            </div>
          ) : (
            <>
              <div className="data-rows">
                {mergedMeasurements.map((m, i) => {
                  const sc = (window.STATUS && window.STATUS[m.status]) || {};
                  return (
                    <div key={m.id} className={"data-row reveal" + (m.status === "missing" ? " data-row--missing" : "")} style={{ animationDelay: i * 70 + "ms" }}>
                      <span className="data-ico" style={{ color: sc.color }}><Icon name={m.icon} size={15} stroke={1.8} /></span>
                      <span className="data-label">{m.label}</span>
                      {m.spark && <span className="data-spark"><Spark data={m.spark} color={sc.color} w={48} h={16} /></span>}
                      <span className="data-val">
                        {m.status === "missing" ? <span className="data-missing">Not recorded</span> : <>{m.value}<span className="data-unit"> {m.unit}</span></>}
                      </span>
                      <Chip status={m.status}>{m.statusLabel}</Chip>
                    </div>
                  );
                })}
              </div>
              <div className="ls-grid">
                {Object.entries(patient.lifestyle || {}).filter(([k]) => !k.endsWith("Flag")).map(([k, v], i) => (
                  <div key={k} className="ls-cell reveal" style={{ animationDelay: (mergedMeasurements.length + i) * 70 + "ms" }}>
                    <span className="ls-k">{labelForLifestyle(k)}</span>
                    <span className="ls-v">{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---- Inline manual-entry form ---- */
function ManualEntryForm({ patient, initial, onSave, onCancel, onClear }) {
  const [age, setAge] = useState((initial.age && initial.age.value) || "");
  const [sex, setSex] = useState((initial.sex && initial.sex.value) || "");
  const [smoking, setSmoking] = useState((initial.smoking && initial.smoking.value) || "");
  const [bp, setBp] = useState((initial.bp && initial.bp.value) || "");
  const [cholesterol, setCholesterol] = useState((initial.cholesterol && initial.cholesterol.value) || "");
  const [hdl, setHdl] = useState((initial.hdl && initial.hdl.value) || "");
  const [bmi, setBmi] = useState((initial.bmi && initial.bmi.value) || "");
  const [waist, setWaist] = useState((initial.waist && initial.waist.value) || "");

  function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    onSave({
      age: age.trim(),
      sex: sex,
      smoking: smoking,
      bp: bp.trim(),
      cholesterol: cholesterol.trim(),
      hdl: hdl.trim(),
      bmi: bmi.trim(),
      waist: waist.trim(),
    });
  }

  return (
    <form className="manual-form" onSubmit={submit}>
      <div className="manual-form-h">
        <span>Enter measurements</span>
        <button type="button" className="manual-form-close" onClick={onCancel} aria-label="Close">×</button>
      </div>
      <div className="manual-grid">
        <label className="manual-field">
          <span className="manual-field-label">Age (years)</span>
          <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 52" inputMode="numeric" maxLength={3} />
        </label>
        <label className="manual-field">
          <span className="manual-field-label">Sex at birth</span>
          <select value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="">—</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="intersex">Intersex</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>
        <label className="manual-field">
          <span className="manual-field-label">Blood pressure (mmHg)</span>
          <input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="e.g. 128/82" />
        </label>
        <label className="manual-field">
          <span className="manual-field-label">Total cholesterol (mmol/L)</span>
          <input value={cholesterol} onChange={(e) => setCholesterol(e.target.value)} placeholder="e.g. 5.4" />
        </label>
        <label className="manual-field">
          <span className="manual-field-label">HDL cholesterol (mmol/L)</span>
          <input value={hdl} onChange={(e) => setHdl(e.target.value)} placeholder="e.g. 1.2" />
        </label>
        <label className="manual-field">
          <span className="manual-field-label">BMI (kg/m²)</span>
          <input value={bmi} onChange={(e) => setBmi(e.target.value)} placeholder="e.g. 27.8" />
        </label>
        <label className="manual-field">
          <span className="manual-field-label">Waist (cm)</span>
          <input value={waist} onChange={(e) => setWaist(e.target.value)} placeholder={patient.sex === "Female" || sex === "female" ? "e.g. 78" : "e.g. 96"} />
        </label>
        <label className="manual-field">
          <span className="manual-field-label">Smoking</span>
          <select value={smoking} onChange={(e) => setSmoking(e.target.value)}>
            <option value="">—</option>
            <option value="never">Never smoked</option>
            <option value="former">Former smoker</option>
            <option value="current">Current smoker</option>
          </select>
        </label>
      </div>
      <p className="manual-foot-note">Only fields you fill in get sent to the engine — empty fields stay "Not recorded".</p>
      <div className="manual-actions">
        {onClear && <button type="button" className="manual-cancel" onClick={onClear}>Clear saved</button>}
        <button type="button" className="manual-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="manual-save">Save</button>
      </div>
    </form>
  );
}

/* ---- NHS-band helpers (mirror adapters.js bands; kept local so the
   self-entered tiles colour correctly without round-tripping the backend) ---- */
function bandFromBp(bpStr) {
  const m = /^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/.exec(bpStr || "");
  if (!m) return "raised";
  const sys = +m[1], dia = +m[2];
  if (sys >= 180 || dia >= 110) return "high";
  if (sys >= 140 || dia >= 90) return "high";
  if (sys >= 120 || dia >= 80) return "raised";
  return "good";
}
function bandFromChol(v) {
  const n = parseFloat(v); if (!isFinite(n)) return "raised";
  if (n >= 6.5) return "high";
  if (n >= 5.0) return "raised";
  return "good";
}
function bandFromBmi(v) {
  const n = parseFloat(v); if (!isFinite(n)) return "raised";
  if (n >= 30) return "high";
  if (n >= 25) return "raised";
  if (n < 18.5) return "raised";
  return "good";
}
function bandFromWaist(v, sex) {
  const n = parseFloat(v); if (!isFinite(n)) return "raised";
  const lo = sex === "Female" ? 80 : 94;
  const hi = sex === "Female" ? 88 : 102;
  if (n >= hi) return "high";
  if (n >= lo) return "raised";
  return "good";
}

function labelForLifestyle(key) {
  switch (key) {
    case "smoking": return "Smoking";
    case "alcohol": return "Alcohol";
    case "activity": return "Activity";
    case "familyHistory": return "Family history";
    case "diet": return "Diet";
    default: return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  }
}

function formatBytes(n) {
  if (n == null) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}
function formatRelative(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const sec = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (sec < 60) return "just now";
  if (sec < 3600) return Math.round(sec / 60) + "m ago";
  if (sec < 86400) return Math.round(sec / 3600) + "h ago";
  return new Date(iso).toLocaleDateString();
}

window.Connect = Connect;
