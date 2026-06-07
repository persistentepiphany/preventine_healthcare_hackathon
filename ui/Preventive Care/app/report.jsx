/* Stage 2 - Report */
function Sec({ n, kicker, title, right }) {
  return (
    <div className="sec-head sec-head--num">
      <div className="sec-left">
        <span className="sec-n">{n}</span>
        <div>
          <div className="sec-eyebrow">{kicker}</div>
          <h2 className="sec-title">{title}</h2>
        </div>
      </div>
      {right}
    </div>
  );
}

function MetricDetail({ m, det, onAdd, onLocal }) {
  return (
    <div className="mdet">
      <div className="mdet-grid">
        <div className="mdet-block">
          <div className="mdet-h">What it is</div>
          <p>{det.what}</p>
        </div>
        <div className="mdet-block">
          <div className="mdet-h">Healthy range</div>
          <p>{det.target}</p>
        </div>
        <div className="mdet-block">
          <div className="mdet-h">What to do</div>
          <p>{det.action}</p>
        </div>
      </div>
      {det.cta && (
        <div className="mdet-foot">
          {m.status === "missing"
            ? <button className="cta cta--sm" onClick={onAdd}><Icon name="plus" size={14} stroke={2.2} /> Add this measurement</button>
            : null}
          {det.goLocal && <button className="link-btn" onClick={onLocal}>{det.cta} <Icon name="arrowRight" size={13} stroke={2} /></button>}
        </div>
      )}
    </div>
  );
}

function Report({ app, go }) {
  const D = window.APP_DATA;
  const { patient, measurements, measurementDetail, healthCheck, cvdRisk, completeness, actions, gpQuestions, gpSummary, trends } = D;
  const isDefaultMode = !app || app.mode === "default";
  const isLiveMode = app && app.mode === "live";
  // In Default mode the CVD ring starts locked so the click-to-unlock demo
  // can showcase the change. In Demo/Live, the ring reflects the backend's
  // real QRISK3 readiness - no synthetic unlock.
  const backendReady = !isDefaultMode && cvdRisk && cvdRisk.state === "ready";
  const [copied, setCopied] = useState(false);
  const [unlocked, setUnlocked] = useState(backendReady);
  const [regen, setRegen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openMetric, setOpenMetric] = useState(null);
  const reportReady = !app || app.reportReady;

  function regenerate() {
    setRegen(true);
    setTimeout(() => setRegen(false), 1300);
  }

  function addMissing() {
    setAdding(true);
    setTimeout(() => { setAdding(false); setUnlocked(true); }, 1600);
  }

  const reportSteps = [
    { text: "Loading your measurements", result: "6 signals", tone: "ok" },
    { text: "Matching " + patient.postcode + " to NHS area", result: (patient.location && patient.location.icb || "NHS").replace("NHS ", ""), tone: "ok" },
    { text: "Checking NHS Health Check rules", result: "Likely eligible", tone: "ok" },
    { text: "Scanning for missing inputs", result: "BP + cholesterol", tone: "warn" },
    { text: "Assembling prevention factors", result: "7 factors", tone: "ok" },
    { text: "Drafting your GP-ready summary", result: "Ready", tone: "ok" },
  ];

  if (!reportReady) {
    // Live mode: no fake animation. Direct the user back to Connect, where
    // "Generate report" actually runs the engine against their inputs.
    if (isLiveMode) {
      return (
        <div className="stage">
          <div className="stage-head">
            <div>
              <div className="stage-eyebrow">Step 2 · Report</div>
              <h1 className="stage-title">No report yet</h1>
              <p className="stage-lede">Add measurements in Connect, then click <strong>Generate report</strong> to run your data through the prevention engine.</p>
            </div>
          </div>
          <section className="panel" style={{ textAlign: "center", padding: "48px 28px" }}>
            <span className="empty-ico"><Icon name="info" size={26} stroke={1.6} /></span>
            <div className="empty-title" style={{ marginTop: 14 }}>Your report is built from what you enter</div>
            <div className="empty-sub" style={{ margin: "8px 0 22px" }}>Only the measurements you add will appear - nothing is autofilled.</div>
            <button className="cta" onClick={() => go("connect")}>Back to Connect <Icon name="arrowRight" size={14} stroke={2} /></button>
          </section>
        </div>
      );
    }
    return (
      <div className="stage">
        <div className="stage-head">
          <div>
            <div className="stage-eyebrow">Step 2 · Report</div>
            <h1 className="stage-title">Building your report</h1>
            <p className="stage-lede">Running your data through the prevention engine.</p>
          </div>
        </div>
        <EngineRun
          steps={reportSteps}
          title="Running the prevention engine"
          sub="NHS Health Check rules · NICE NG238 · QRISK3 fields"
          doneLabel="Report ready"
          holdMs={780}
          onDone={() => app.markReportReady()}
        />
      </div>
    );
  }

  // Synthetic unlock applies only in Default mode (the showcase click-to-fill).
  // In Demo/Live, the measurements already reflect the real backend response.
  const applySyntheticUnlock = isDefaultMode && unlocked;

  const shownMeasurements = measurements.map((m) => {
    if (applySyntheticUnlock && (m.id === "bp" || m.id === "cholesterol") && m.unlockValue) {
      return { ...m, value: m.unlockValue, status: m.unlockStatus, statusLabel: m.unlockStatusLabel, note: m.unlockNote, justAdded: true };
    }
    return m;
  });

  // Segments: use the live profileChecklist when present so the readiness
  // ring tracks the real patient. In Default+unlocked, mark BP/cholesterol
  // done so the showcase reads "100% ready".
  const baseSegments = (Array.isArray(D.profileChecklist) && D.profileChecklist.length)
    ? D.profileChecklist.map((c) => ({ label: c.label, done: !!c.done }))
    : [
        { label: "Blood pressure", done: unlocked },
        { label: "Cholesterol / HDL", done: unlocked },
        { label: "Body measurements", done: true },
        { label: "Smoking & lifestyle", done: true },
        { label: "Family & history", done: true },
      ];
  const segments = applySyntheticUnlock
    ? baseSegments.map((c) => /blood pressure|cholesterol/i.test(c.label) ? { ...c, done: true } : c)
    : baseSegments;
  const doneCount = segments.filter((s) => s.done).length;
  const pct = Math.round((doneCount / segments.length) * 100);

  // Factor mix from the backend's readiness counts when available. Falls back
  // to the showcase mix for Default+unlocked.
  const readiness = D._backend && D._backend.readiness;
  const factorMix = applySyntheticUnlock
    ? [
        { label: "Recorded risk factors", value: 7, tone: "raised" },
        { label: "Protective / normal", value: 2, tone: "good" },
        { label: "Still unknown", value: 0, tone: "info" },
      ]
    : readiness
      ? [
          { label: "Recorded risk factors", value: readiness.recorded || 0, tone: "raised" },
          { label: "Protective / normal", value: readiness.protective || 0, tone: "good" },
          { label: "Still unknown", value: readiness.unknown || 0, tone: "info" },
        ]
      : trends.factorMix;

  // Missing-measurement list for the locked panel. In Default we still
  // present a canned "BP + cholesterol" CTA; in Demo/Live we show the
  // backend's real cvdRisk.missingHighValue.
  const missingList = Array.isArray(cvdRisk.missingHighValue) && cvdRisk.missingHighValue.length
    ? cvdRisk.missingHighValue
    : ["Blood pressure", "Total cholesterol & HDL"];
  const missingLabel = missingList.join(" + ").toLowerCase();

  function copy() {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(gpSummary).then(done).catch(done);
    } else {
      const ta = document.createElement("textarea");
      ta.value = gpSummary; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); done();
    }
  }

  return (
    <div className="stage">
      <div className="stage-head">
        <div>
          <div className="stage-eyebrow">Step 2 · Report</div>
          <h1 className="stage-title">{patient.name.split(" ")[0]}'s prevention report</h1>
          <p className="stage-lede">
            What your data shows, what's missing, and the highest-value things to act on - modelled
            on NHS and NICE prevention guidance.
          </p>
        </div>
        <button className="cta cta--ghost" onClick={() => go("local")}>
          Find local care <Icon name="arrowRight" size={16} stroke={2} />
        </button>
      </div>

      {/* Section: cardiovascular risk */}
      <Sec n={1} kicker="Assessment" title="Cardiovascular risk" right={<span className="src-tag">NICE NG238 · QRISK3</span>} />
      <div className="bento">
        <section className={"panel b-risk" + (unlocked ? " b-risk--ready" : "")}>
          <div className="risk-head-row">
            <div className={"est" + (unlocked ? " est--ready" : " est--locked")}>
              <svg width="92" height="92" className="est-ring">
                <circle cx="46" cy="46" r="40" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
                <circle cx="46" cy="46" r="40" fill="none" stroke={unlocked ? "var(--good)" : "var(--accent)"} strokeWidth="7"
                  strokeLinecap="round" strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={unlocked ? 0 : 2 * Math.PI * 40 * 0.62}
                  style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset .8s ease, stroke .4s" }} />
              </svg>
              <span className="est-glyph">
                <Icon name={unlocked ? "check" : "lock"} size={20} stroke={unlocked ? 2.6 : 1.8} />
              </span>
              <span className="est-cap">{unlocked ? "Ready" : "Locked"}</span>
            </div>
            <div className="risk-head-text">
              <div className="panel-head" style={{ marginBottom: 6 }}>
                <h2 className="panel-title">10-year CVD estimate</h2>
                <span className={"tag-soft" + (unlocked ? " tag-soft--ok" : "")}>
                  <span className="chip-dot" style={{ background: unlocked ? "var(--good)" : "var(--attn)" }} />
                  {unlocked ? "Inputs complete" : "Incomplete"}
                </span>
              </div>
              <p className="risk-headline">{unlocked ? cvdRisk.readyHeadline : cvdRisk.headline}</p>
              <p className="risk-body">{unlocked ? cvdRisk.readyBody : cvdRisk.body}</p>
            </div>
          </div>

          <div className="risk-factors">
            {cvdRisk.knownFactors.map((f) => (
              <span key={f.label} className={"factor" + (f.weight === "raises" ? " factor--up" : "")}>{f.label}</span>
            ))}
          </div>

          {!unlocked ? (
            <div className="unlock-box">
              <div className="unlock-head">
                <Icon name="unlock" size={16} stroke={1.8} />
                <span>
                  You're <b>{missingList.length} measurement{missingList.length === 1 ? "" : "s"}</b> from a real estimate. Adding {missingList.length === 1 ? "it" : "them"} unlocks:
                </span>
              </div>
              <ul className="unlock-list">
                {cvdRisk.unlocks.map((u) => (<li key={u}><Icon name="arrowRight" size={12} stroke={2.2} /> {u}</li>))}
              </ul>
              {isDefaultMode ? (
                <div className="unlock-actions">
                  <button className="cta" onClick={addMissing} disabled={adding}>
                    {adding ? <><span className="btn-spin" /> Adding…</> : <><Icon name="plus" size={15} stroke={2.2} /> Add {missingLabel}</>}
                  </button>
                  <span className="unlock-note">Demo - simulates linking the missing results</span>
                </div>
              ) : (
                <div className="unlock-actions">
                  <div className="unlock-missing">
                    <span className="unlock-missing-label">Missing:</span>
                    {missingList.map((m) => (
                      <span key={m} className="missing-pill"><span className="chip-dot" style={{ background: "var(--attn)" }} /> {m}</span>
                    ))}
                  </div>
                  <span className="unlock-note">
                    {isLiveMode
                      ? "Add the missing measurements in Connect and click Generate report again."
                      : "QRISK3 readiness reflects this random patient's recorded measurements."}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="unlock-box unlock-box--ok">
              <div className="unlock-head">
                <Icon name="check" size={16} stroke={2.4} />
                <span>All QRISK3 inputs are present. We still leave the actual score to a clinician.</span>
              </div>
              <div className="unlock-actions">
                <button className="cta" onClick={() => go("local")}>Find a clinician to run it <Icon name="arrowRight" size={15} stroke={2} /></button>
                {isDefaultMode && <button className="link-btn" onClick={() => setUnlocked(false)}>Reset demo</button>}
              </div>
            </div>
          )}
        </section>

        <section className="panel b-ring">
          <SegRing segments={segments} size={140} thickness={11} color={unlocked ? "var(--good)" : "var(--accent)"}>
            <div className="ring-num">{pct}%</div>
            <div className="ring-cap">ready</div>
          </SegRing>
          <div className="ring-foot">
            <div className="ring-foot-title">Profile readiness</div>
            <div className="ring-foot-sub">{doneCount === segments.length ? "All key checks recorded" : `${segments.length - doneCount} of ${segments.length} key checks still missing`}</div>
          </div>
        </section>
      </div>

      {/* Section: vitals spread horizontally */}
      <Sec n={2} kicker="Your numbers" title="Vital measurements" right={<span className="sec-hint">Tap any card for detail</span>} />
      <div className="metric-grid">
        {shownMeasurements.map((m) => (
          <MetricTile key={m.id} m={m} active={openMetric === m.id} onClick={() => setOpenMetric(openMetric === m.id ? null : m.id)} />
        ))}
      </div>
      {openMetric && measurementDetail[openMetric] && (
        <MetricDetail
          m={shownMeasurements.find((x) => x.id === openMetric)}
          det={measurementDetail[openMetric]}
          onAdd={() => { setOpenMetric(null); addMissing(); }}
          onLocal={() => go("local")}
        />
      )}

      {/* Section: health trends / charts */}
      <Sec n={3} kicker="Health statistics" title="Trends & where you sit" />
      <div className="bento bento--2">
        <section className="panel chart-panel">
          <div className="panel-head">
            <h2 className="panel-title">{trends.steps.title}</h2>
            <span className="panel-meta">7-day · avg {trends.steps.avg.toLocaleString()}/day</span>
          </div>
          <StepsBars d={trends.steps} />
        </section>
        <section className="panel chart-panel">
          <div className="panel-head">
            <h2 className="panel-title">{trends.restingHr.title}</h2>
            <span className="panel-meta">{trends.restingHr.weeks}-week trend</span>
          </div>
          <HrLine d={trends.restingHr} />
        </section>
      </div>
      <div className="bento bento--2">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Where your numbers sit</h2>
            <span className="panel-meta">Against NHS healthy ranges</span>
          </div>
          <div className="range-list">
            {trends.ranges.map((r) => (<RangeBar key={r.label} r={r} />))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Risk picture</h2>
            <span className="panel-meta">{factorMix.reduce((a, b) => a + b.value, 0)} factors reviewed</span>
          </div>
          <FactorMix mix={factorMix} />
          <p className="fmix-note">
            {unlocked
              ? "Both missing checks are now recorded, so every QRISK3 input is in place - a clinician can calculate the formal estimate."
              : "Five recorded factors push your risk up and two are protective - but two key inputs are still unknown, which is why a full estimate isn't possible yet."}
          </p>
        </section>
      </div>

      {/* Section: NHS Health Check */}
      <Sec n={4} kicker="Eligibility" title="NHS Health Check" right={<a className="info-btn" href={healthCheck.bookUrl} target="_blank" rel="noreferrer"><Icon name="external" size={14} stroke={1.8} /> About the check</a>} />
      <section className="panel elig-card">
        <div className="elig-head-row">
          <span className="elig-ico"><Icon name="shield" size={22} stroke={1.8} /></span>
          <div className="elig-headtext">
            <h3 className="elig-head">{healthCheck.headline}</h3>
            <p className="elig-reason">A free 5-yearly check bundling blood pressure, cholesterol, diabetes risk and a lifestyle review into one appointment.</p>
          </div>
          <span className="elig-likely"><span className="chip-dot" style={{ background: "var(--good)" }} /> Likely eligible</span>
        </div>

        <div className="elig-criteria">
          {healthCheck.criteria.map((c) => (
            <div key={c.label} className="elig-crit">
              <span className={"elig-crit-ico" + (c.met === true ? " ok" : c.met === "unknown" ? " unk" : " no")}>
                <Icon name={c.met === true ? "check" : c.met === "unknown" ? "info" : "close"} size={12} stroke={2.6} />
              </span>
              <div>
                <div className="elig-crit-label">{c.label}</div>
                <div className="elig-crit-detail">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="elig-foot">
          <p className="elig-note">{healthCheck.action}</p>
          <div className="elig-actions">
            <a className="cta" href={healthCheck.bookUrl} target="_blank" rel="noreferrer">Find out how to book <Icon name="external" size={14} stroke={1.8} /></a>
            <button className="link-btn" onClick={() => go("local")}>See GP practices near you <Icon name="arrowRight" size={14} stroke={2} /></button>
          </div>
        </div>
      </section>

      {/* Section: recommended actions */}
      <Sec n={5} kicker="Your plan" title="Recommended actions" />
      <div className="action-grid">
        {actions.map((a) => (
          <section key={a.priority} className="panel action-card">
            <div className="action-card-top">
              <span className={"action-num tone-" + a.tone}>{a.priority}</span>
              <span className="action-tag">{a.tag}</span>
            </div>
            <h3 className="action-title">{a.title}</h3>
            <p className="action-body">{a.body}</p>
            <div className="action-where"><Icon name="pin" size={13} stroke={1.8} /> {a.where}</div>
          </section>
        ))}
      </div>

      {/* Section: prepare for GP */}
      <Sec n={6} kicker="Before you go" title="Prepare for your GP" />

      <section className="panel gp-summary-panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">GP-ready summary <span className="ai-tag"><Icon name="spark" size={11} stroke={2} /> AI-assisted</span></h2>
            <span className="panel-meta">A short note you can hand over or paste into an online consultation</span>
          </div>
          <button className={"copy-btn" + (copied ? " copy-btn--done" : "")} onClick={copy}>
            <Icon name={copied ? "check" : "copy"} size={13} stroke={2.2} />{copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className={"gp-summary" + (regen ? " gp-summary--regen" : "")}>
          <p className="gp-summary-text">{gpSummary}</p>
          {regen && <span className="gp-regen-bar" />}
        </div>
        <div className="gp-foot">
          <span className="gp-foot-note">Generated from your profile · reviewed against NHS Health Check criteria</span>
          <button className="link-btn" onClick={regenerate} disabled={regen}><Icon name="spark" size={13} stroke={1.9} /> {regen ? "Regenerating…" : "Regenerate"}</button>
        </div>
      </section>

      <section className="panel gp-q-panel">
        <div className="panel-head">
          <h2 className="panel-title">Questions to ask</h2>
          <span className="panel-meta">Tap a link to read up first</span>
        </div>
        <ul className="qa-list">
          {gpQuestions.map((item, i) => (
            <li key={i} className="qa-item">
              <span className="qa-q"><Icon name="check" size={11} stroke={3} /></span>
              <div className="qa-body">
                <div className="qa-text">{item.q}</div>
                <div className="qa-why">{item.why}</div>
                <a className="qa-link" href={item.url} target="_blank" rel="noreferrer">
                  <Icon name="external" size={12} stroke={1.8} /> {item.link}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="safety-foot"><Icon name="info" size={13} stroke={1.8} /> {cvdRisk.safety}</p>
    </div>
  );
}

window.Report = Report;
