/* Stage 1 — Connect: link / upload health data. Demo = pre-loaded, Live = from scratch. */
function Connect({ app, go }) {
  const D = window.APP_DATA;
  const { patient, dataSources, measurements, completeness, provenance } = D;
  const [ingesting, setIngesting] = useState(false);
  const mapRef = useRef(null);
  const mapObj = useRef(null);

  const hasData = app.mode === "demo" || app.ingested;

  useEffect(() => {
    if (mapObj.current || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, {
      zoomControl: false, scrollWheelZoom: false, dragging: false,
      doubleClickZoom: false, attributionControl: false, keyboard: false,
    }).setView([patient.location.latitude, patient.location.longitude], 13);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19 }).addTo(map);
    L.marker([patient.location.latitude, patient.location.longitude], {
      icon: L.divIcon({ className: "", html: '<div class="home-pin"><span></span></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
    }).addTo(map);
    mapObj.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

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

  const lifestyle = [
    { label: "Smoking", value: "Ex-smoker (2019)" },
    { label: "Alcohol", value: "~16 units/wk" },
    { label: "Activity", value: "Low / sedentary" },
    { label: "Family history", value: "Father, MI age 58" },
  ];

  return (
    <div className="stage">
      <div className="stage-head">
        <div>
          <div className="stage-eyebrow">Step 1 · Connect</div>
          <h1 className="stage-title">Bring your health data together</h1>
          <p className="stage-lede">
            {app.mode === "live"
              ? "Link your NHS record or upload results — your prevention report builds from what you add."
              : "A demo profile is pre-loaded, so you can go straight to your report."}
          </p>
        </div>
        {hasData && (
          <button className="cta" onClick={() => go("report")}>
            Generate report <Icon name="arrowRight" size={16} stroke={2} />
          </button>
        )}
      </div>

      {/* Location & NHS area — geography resolves immediately */}
      <section className="panel loc-panel">
        <div className="loc-map" ref={mapRef} />
        <div className="loc-info">
          <div className="panel-head">
            <h2 className="panel-title">Your NHS area</h2>
            <span className="prov-chip"><span className="prov-dot prov-dot--live" /> Live · postcodes.io</span>
          </div>
          <div className="loc-facts">
            <div className="loc-fact"><span className="loc-k">Postcode</span><span className="loc-v">{patient.postcode}</span></div>
            <div className="loc-fact"><span className="loc-k">Local authority</span><span className="loc-v">{patient.location.localAuthority}</span></div>
            <div className="loc-fact"><span className="loc-k">Integrated Care Board</span><span className="loc-v">{patient.location.icb}</span></div>
            <div className="loc-fact"><span className="loc-k">NHS region</span><span className="loc-v">{patient.location.nhsRegion}</span></div>
          </div>
        </div>
      </section>

      {/* Two columns: sources + recorded data */}
      <div className="connect-grid">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Data sources</h2>
            <span className="prov-chip">{hasData ? <><span className="prov-dot prov-dot--live" /> Connected</> : "Not linked"}</span>
          </div>
          <div className="source-list">
            {dataSources.map((s) => {
              const connected = hasData && (s.state === "preloaded" || s.state === "connected");
              const clickable = !hasData && !ingesting;
              return (
                <button
                  key={s.id}
                  className={"source-row" + (connected ? " source-row--on" : "") + (clickable ? " source-row--btn" : "")}
                  onClick={clickable ? startIngest : undefined}
                >
                  <span className="source-ico"><Icon name={s.icon} size={18} stroke={1.8} /></span>
                  <div className="source-main">
                    <div className="source-label">{s.label}</div>
                    <div className="source-desc">{s.desc}</div>
                  </div>
                  <span className={"source-state" + (connected ? " source-state--on" : "")}>
                    {connected ? (<><Icon name="check" size={12} stroke={3} /> Linked</>) : ingesting ? "…" : "Connect"}
                  </span>
                </button>
              );
            })}
          </div>
          <button className={"dropzone" + (!hasData && !ingesting ? " dropzone--btn" : "")} onClick={!hasData && !ingesting ? startIngest : undefined}>
            <Icon name="upload" size={18} stroke={1.8} />
            <span>Drop a PDF or photo of results</span>
          </button>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">On file</h2>
            {hasData && <span className="panel-meta">{measurements.length} measurements · 4 history</span>}
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
              <div className="empty-sub">Link a source to build your profile.</div>
              <button className="cta" onClick={startIngest}><Icon name="shield" size={15} stroke={1.9} /> Link NHS login</button>
            </div>
          ) : (
            <>
              <div className="data-rows">
                {measurements.map((m, i) => {
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
                {lifestyle.map((l, i) => (
                  <div key={l.label} className="ls-cell reveal" style={{ animationDelay: (measurements.length + i) * 70 + "ms" }}>
                    <span className="ls-k">{l.label}</span>
                    <span className="ls-v">{l.value}</span>
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

window.Connect = Connect;
