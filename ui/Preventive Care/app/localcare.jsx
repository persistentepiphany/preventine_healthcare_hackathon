/* Stage 3 — Local Care: dark map + services + waiting times */
const SVC_META = {
  gp_practice: { icon: "stethoscope", label: "GP Practice" },
  pharmacy: { icon: "pharmacy", label: "Pharmacy" },
  hospital: { icon: "hospital", label: "Hospital" },
};

/* travel-time estimates from straight-line distance (demo heuristic) */
function fmtMins(m) {
  if (m >= 60) {
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  }
  return `${m} min`;
}
function travel(km) {
  return {
    walk: fmtMins(Math.max(2, Math.round(km * 12))),
    drive: fmtMins(Math.max(3, Math.round(km * 2.6 + 2))),
  };
}

/* likely-eligibility chip from NHS rules (deterministic) */
function eligChip(s) {
  if (s.type === "gp_practice") return { label: "Health Check 40–74", tone: "ok" };
  if (s.type === "pharmacy" && s.badge) return { label: "Free BP check 40+", tone: "ok" };
  if (s.type === "hospital") return { label: "Referral only", tone: "muted" };
  return null;
}

function LocalCare() {
  const D = window.APP_DATA;
  const { patient, services, waitingTimes, content } = D;
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(services[0].id);
  const [info, setInfo] = useState(null); // {title, body, url, linkLabel}
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef({});
  const routeLine = useRef(null);
  const [dirLoading, setDirLoading] = useState(false);

  const shown = services.filter((s) => filter === "all" || s.type === filter);

  useEffect(() => {
    if (mapObj.current || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: false }).setView(
      [patient.location.latitude, patient.location.longitude], 14
    );
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);

    L.marker([patient.location.latitude, patient.location.longitude], {
      icon: L.divIcon({ className: "", html: '<div class="home-pin"><span></span></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
      zIndexOffset: 1000,
    }).addTo(map).bindTooltip("You · " + patient.postcode, { direction: "top", offset: [0, -10] });

    services.forEach((s) => {
      const t = travel(s.distanceKm);
      const m = L.marker([s.lat, s.lon], {
        icon: L.divIcon({ className: "", html: '<div class="svc-pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
      }).addTo(map);
      m.bindPopup(
        `<div class="mappop">
           <div class="mappop-name">${s.name}</div>
           <div class="mappop-meta">${SVC_META[s.type].label} · ${s.distanceKm} km away</div>
           <div class="mappop-travel"><span>Walk ${t.walk}</span><span>Drive ${t.drive}</span></div>
         </div>`,
        { className: "svc-popup", closeButton: false, offset: [0, -6] }
      );
      m.on("click", () => setSelected(s.id));
      markers.current[s.id] = m;
    });

    mapObj.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

  useEffect(() => {
    const s = services.find((x) => x.id === selected);
    if (s && mapObj.current && window.L) {
      const L = window.L;
      const home = [patient.location.latitude, patient.location.longitude];
      const dest = [s.lat, s.lon];
      if (routeLine.current) { mapObj.current.removeLayer(routeLine.current); }
      routeLine.current = L.polyline([home, dest], {
        color: "#4A80BC", weight: 2.5, opacity: 0.85, dashArray: "2 7", lineCap: "round",
      }).addTo(mapObj.current);
      mapObj.current.fitBounds(L.latLngBounds([home, dest]).pad(0.4), { animate: true, maxZoom: 15 });
      const mk = markers.current[s.id];
      if (mk) mk.openPopup();
    }
  }, [selected]);

  const sel = services.find((x) => x.id === selected);
  const t = sel ? travel(sel.distanceKm) : null;
  const waitScale = Math.max(waitingTimes.rttStandard + 8, ...waitingTimes.records.map((r) => r.treatment));

  return (
    <div className="stage stage--airy">
      <div className="stage-head">
        <div>
          <div className="stage-eyebrow">Step 3 · Local care</div>
          <h1 className="stage-title">Where to go near you</h1>
          <p className="stage-lede">
            Services matched to what you need next — free blood-pressure checks, GP practices for a
            Health Check, and hospitals only if you're later referred.
          </p>
        </div>
      </div>

      <div className="filter-row">
        {[{ id: "all", label: "All" }, { id: "gp_practice", label: "GP Practices" }, { id: "pharmacy", label: "Pharmacies" }, { id: "hospital", label: "Hospitals" }].map((f) => (
          <button key={f.id} className={"fpill" + (filter === f.id ? " fpill--on" : "")} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
        <span className="prov-strip">
          <span><span className="prov-dot prov-dot--live" /> Geography live</span>
          <span><span className="prov-dot prov-dot--cache" /> Services cached</span>
          <span><span className="prov-dot prov-dot--model" /> Waits modelled</span>
        </span>
      </div>

      <div className="map-layout">
        <div className="map-box" ref={mapRef} />
        <div className="svc-list">
          {shown.map((s) => {
            const tt = travel(s.distanceKm);
            const ec = eligChip(s);
            return (
              <button key={s.id} className={"svc-row" + (selected === s.id ? " svc-row--on" : "")} onClick={() => setSelected(s.id)}>
                <span className="source-ico"><Icon name={SVC_META[s.type].icon} size={17} stroke={1.8} /></span>
                <div className="svc-info">
                  <div className="svc-name">{s.name}</div>
                  <div className="svc-travel">
                    <span><Icon name="walk" size={13} stroke={1.8} /> {tt.walk}</span>
                    <span><Icon name="car" size={13} stroke={1.8} /> {tt.drive}</span>
                    <span className="svc-dist">{s.distanceKm} km</span>
                  </div>
                  <div className="svc-chips">
                    {s.badge && <span className="svc-badge">{s.badge}</span>}
                    {ec && <span className={"svc-elig svc-elig--" + ec.tone}>{ec.label}</span>}
                  </div>
                </div>
                <Icon name="chevron" size={15} stroke={2} className="svc-chev" />
              </button>
            );
          })}
        </div>
      </div>

      {sel && (
        <div className="panel md-panel">
          <div className="md-top">
            <span className="source-ico md-ico"><Icon name={SVC_META[sel.type].icon} size={19} stroke={1.8} /></span>
            <div className="md-info">
              <div className="md-name">{sel.name}</div>
              <div className="svc-meta">{SVC_META[sel.type].label} · {sel.address}</div>
            </div>
            <span className="md-open">{sel.open}</span>
          </div>

          {sel.whyHere && (
            <div className="md-why">
              <Icon name="spark" size={15} stroke={1.8} />
              <span>{sel.whyHere}</span>
              <span className="ai-tag ai-tag--inline"><Icon name="spark" size={10} stroke={2} /> AI-assisted</span>
            </div>
          )}

          <div className="md-travel">
            <div className="md-travel-item"><Icon name="walk" size={16} stroke={1.8} /><div><div className="md-travel-v">{t.walk}</div><div className="md-travel-k">walk</div></div></div>
            <div className="md-travel-item"><Icon name="car" size={16} stroke={1.8} /><div><div className="md-travel-v">{t.drive}</div><div className="md-travel-k">drive</div></div></div>
            <div className="md-travel-item"><Icon name="pin" size={16} stroke={1.8} /><div><div className="md-travel-v">{sel.distanceKm} km</div><div className="md-travel-k">away</div></div></div>
            {sel.rating && <div className="md-travel-item md-travel-item--rating"><Icon name="shield" size={16} stroke={1.8} /><div><div className="md-travel-v">{sel.rating.replace("CQC: ", "")}</div><div className="md-travel-k">CQC rating</div></div></div>}
          </div>

          <div className="md-grid">
            {sel.offers && (
              <div className="md-block">
                <div className="md-block-h">Services offered</div>
                <div className="md-offers">
                  {sel.offers.map((o) => (
                    <span key={o} className={"md-offer" + (sel.badge && o.toLowerCase().includes("blood pressure") ? " md-offer--key" : "")}>{o}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="md-block">
              <div className="md-block-h">Next available</div>
              <p className="md-elig">{sel.nextAvail} · {sel.hours}</p>
            </div>
            <div className="md-block">
              <div className="md-block-h">NHS eligibility</div>
              <p className="md-elig">{sel.eligibility}</p>
            </div>
            {sel.access && (
              <div className="md-block">
                <div className="md-block-h">Accessibility</div>
                <div className="md-offers">
                  {sel.access.map((a) => (<span key={a} className="md-offer"><Icon name="check" size={11} stroke={2.6} /> {a}</span>))}
                </div>
              </div>
            )}
          </div>

          <div className="md-actions">
            <a className="md-btn" href={"tel:" + sel.phone.replace(/\s/g, "")}><Icon name="phone" size={14} stroke={1.8} /> {sel.phone}</a>
            <button className="md-btn md-btn--ghost" onClick={() => { setDirLoading(true); setTimeout(() => setDirLoading(false), 1500); }} disabled={dirLoading}>
              {dirLoading ? <><span className="btn-spin btn-spin--dark" /> Plotting route…</> : <><Icon name="walk" size={14} stroke={1.8} /> Directions ({t.walk} walk)</>}
            </button>
            {sel.bring && (
              <button className="md-btn md-btn--ghost" onClick={() => setInfo({ title: "Bring with you", body: sel.bring })}>
                <Icon name="info" size={14} stroke={1.8} /> What to bring
              </button>
            )}
          </div>
        </div>
      )}

      {/* Waiting times — minimalist, informative */}
      <div className="sec-head">
        <div>
          <div className="sec-eyebrow">If you're later referred</div>
          <h2 className="sec-title">Hospital waiting times</h2>
        </div>
        <button className="info-btn" onClick={() => setInfo({ title: "How to read waiting times", body: waitingTimes.explainer, url: "https://www.nhs.uk/nhs-services/hospitals/guide-to-nhs-waiting-times-in-england/", linkLabel: "NHS guide to waiting times" })}>
          <Icon name="info" size={15} stroke={1.8} /> What does this mean?
        </button>
      </div>
      <section className="panel wait-card">
        <div className="wait-legend">
          <span className="wl-item"><span className="wl-swatch wl-first" /> First appointment</span>
          <span className="wl-item"><span className="wl-swatch wl-treat" /> Through to treatment</span>
          <span className="wl-item"><span className="wl-marker" /> 18-week NHS standard</span>
        </div>
        <div className="wait-list">
          {waitingTimes.records.map((r, i) => (
            <button key={i} className="wait-row" onClick={() => setInfo({ title: `${r.provider} · ${r.specialty}`, body: r.note })}>
              <div className="wait-prov">
                <div className="wait-name">{r.provider}</div>
                <div className="wait-spec">{r.specialty}</div>
              </div>
              <div className="wait-track">
                <span className="wait-fill wait-fill-treat" style={{ width: (r.treatment / waitScale) * 100 + "%" }} />
                <span className="wait-fill wait-fill-first" style={{ width: (r.firstAppt / waitScale) * 100 + "%" }} />
                <span className="wait-std" style={{ left: (waitingTimes.rttStandard / waitScale) * 100 + "%" }} />
              </div>
              <div className="wait-nums">
                <span className="wait-num"><b>{r.firstAppt}</b> wks</span>
                <span className="wait-arrow">→</span>
                <span className="wait-num"><b>{r.treatment}</b> wks</span>
                <span className={"wait-trend wait-trend--" + r.trend}>
                  {r.trend === "down" && <Icon name="trendDown" size={14} stroke={2} />}
                  {r.trend === "up" && <Icon name="trendUp" size={14} stroke={2} />}
                  {r.trend === "flat" && <span className="wait-flat">—</span>}
                </span>
              </div>
            </button>
          ))}
        </div>
        <p className="wait-disc"><Icon name="info" size={13} stroke={1.8} /> {waitingTimes.disclaimer}</p>
      </section>

      {/* Trusted NHS reading */}
      <div className="sec-head">
        <div>
          <div className="sec-eyebrow">Learn more</div>
          <h2 className="sec-title">Trusted NHS reading</h2>
        </div>
      </div>
      <div className="content-grid">
        {content.map((c) => (
          <a key={c.title} className="content-card" href={c.url} target="_blank" rel="noreferrer">
            <div className="cc-rel">{c.relevance}</div>
            <div className="cc-title">{c.title}</div>
            <div className="cc-sum">{c.summary}</div>
            <div className="cc-foot">nhs.uk <Icon name="external" size={13} stroke={1.8} /></div>
          </a>
        ))}
      </div>

      {info && (
        <div className="popover-scrim" onClick={() => setInfo(null)}>
          <div className="popover" onClick={(e) => e.stopPropagation()}>
            <button className="popover-x" onClick={() => setInfo(null)}><Icon name="close" size={16} stroke={2} /></button>
            <h3 className="popover-title">{info.title}</h3>
            <p className="popover-body">{info.body}</p>
            {info.url && (
              <a className="popover-link" href={info.url} target="_blank" rel="noreferrer">
                <Icon name="external" size={14} stroke={1.8} /> {info.linkLabel || "Read on nhs.uk"}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

window.LocalCare = LocalCare;
