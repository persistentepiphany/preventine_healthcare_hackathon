/* App shell — top nav, stage stepper, page routing, Default/Demo/Live + login,
   plus backend data loading (delegated to window.loadAppData). */
function App() {
  const [stage, setStage] = useState("connect");
  const [page, setPage] = useState("journey"); // journey | resources | support | profile
  const [mode, setModeState] = useState("default"); // default | demo | live
  const [authed, setAuthed] = useState(false); // live requires sign-in
  const [ingested, setIngested] = useState(true);
  const [reportReady, setReportReady] = useState(true);

  // Backend data-loading state.
  const [apiState, setApiState] = useState("ready"); // idle | loading | ready | error
  const [dataVersion, setDataVersion] = useState(0); // bumped on every successful load
  const [sourceBadge, setSourceBadge] = useState({ label: "Default", tone: "muted" });
  const [seedId, setSeedId] = useState("james-whitfield");

  // Re-read APP_DATA each render so children also re-read after we swap it.
  const D = window.APP_DATA;
  const { patient } = D;

  const STAGES = [
    { id: "connect", n: 1, label: "Connect data" },
    { id: "report", n: 2, label: "Your report" },
    { id: "local", n: 3, label: "Local care" },
  ];
  const idx = STAGES.findIndex((s) => s.id === stage);
  const liveLocked = mode === "live" && !authed;

  function go(id) {
    setStage(id);
    setPage("journey");
    const m = document.querySelector(".main-scroll");
    if (m) m.scrollTop = 0;
  }
  function nav(p) {
    setPage(p);
    const m = document.querySelector(".main-scroll");
    if (m) m.scrollTop = 0;
  }

  // ---- Backend data loader ------------------------------------------
  // Triggered on mode changes and on explicit randomize. Updates
  // window.APP_DATA in place + bumps dataVersion so all children remount.
  async function runLoad(opts) {
    setApiState("loading");
    let result;
    try {
      result = await window.loadAppData(opts);
    } catch (e) {
      console.warn("[PreventPath] loader threw", e);
      setApiState("error");
      setSourceBadge({ label: "Unavailable", tone: "error" });
      return;
    }
    if (result.stale) return; // race-guarded out by the loader
    window.APP_DATA = result.appData;
    setSeedId(result.seedId || "");
    setDataVersion((v) => v + 1);
    setApiState("ready");
    setSourceBadge(sourceBadgeFor(result.source));
  }

  function sourceBadgeFor(src) {
    switch (src) {
      case "live": return { label: "Live", tone: "ok" };
      case "cache": return { label: "Cache", tone: "info" };
      case "safe_fallback": return { label: "Cached", tone: "info" };
      case "default": return { label: "Default", tone: "muted" };
      default: return { label: src || "—", tone: "muted" };
    }
  }

  // ---- Mode change handler ------------------------------------------
  function setMode(next) {
    if (next === mode) return;
    setModeState(next);
    if (next === "live") {
      setAuthed(false);
      setIngested(false);
      setReportReady(false);
      setStage("connect");
      setPage("journey");
      // Don't load yet — wait for live form submission.
    } else if (next === "demo") {
      setAuthed(false);
      setIngested(true);
      setReportReady(true);
      setPage("journey");
      runLoad({ mode: "demo" });
    } else {
      // default
      setAuthed(false);
      setIngested(true);
      setReportReady(true);
      setPage("journey");
      runLoad({ mode: "default" });
    }
  }

  // Randomize button (next to Demo): refetches a fresh seed.
  function randomize() {
    if (mode !== "demo") {
      setModeState("demo");
      setIngested(true);
      setReportReady(true);
    }
    runLoad({ mode: "demo" });
  }

  // Live form submit (called from Connect stage when user has filled the
  // patient form and clicked "Generate report").
  function submitLive(patientInput, postcode) {
    runLoad({ mode: "live", patientInput, postcode });
  }

  // ---- Initial load: stay on Default (synchronous; no network) -------
  useEffect(() => {
    // App boots with STATIC_DATA already on window.APP_DATA. Bump version
    // once so the children's effects pick up the same value cleanly.
    setDataVersion(1);
  }, []);

  const app = {
    mode, ingested, reportReady, authed, page, apiState, sourceBadge, seedId, dataVersion,
    setMode,
    randomize,
    submitLive,
    signIn: () => setAuthed(true),
    signOut: () => { setModeState("default"); setAuthed(false); setIngested(true); setReportReady(true); setStage("connect"); setPage("journey"); runLoad({ mode: "default" }); },
    markIngested: () => setIngested(true),
    markReportReady: () => setReportReady(true),
    resetLive: () => { setIngested(false); setReportReady(false); },
    go, nav,
  };

  const showStagebar = page === "journey" && !liveLocked;
  const badgeToneClass = "src-badge src-badge--" + sourceBadge.tone;

  return (
    <div className="app">
      {apiState === "loading" && <div className="pp-loading-bar" aria-hidden="true" />}
      <header className="appbar">
        <div className="brand" onClick={() => go("connect")} style={{ cursor: "pointer" }}>
          <span className="brand-mark"><Icon name="shield" size={16} stroke={2} /></span>
          <span className="brand-name">PreventPath</span>
        </div>

        <nav className="appnav">
          <button className={"appnav-item" + (page === "journey" ? " appnav-item--on" : "")} onClick={() => nav("journey")}>My Health</button>
          <button className={"appnav-item" + (page === "resources" ? " appnav-item--on" : "")} onClick={() => nav("resources")}>Resources</button>
          <button className={"appnav-item" + (page === "support" ? " appnav-item--on" : "")} onClick={() => nav("support")}>Support</button>
        </nav>

        <div className="appbar-right">
          <div className="mode-seg" role="tablist" aria-label="Data mode">
            <button className={"mode-opt" + (mode === "default" ? " mode-opt--on" : "")} onClick={() => setMode("default")} title="Static fallback (no network)">Default</button>
            <button className={"mode-opt" + (mode === "demo" ? " mode-opt--on" : "")} onClick={() => setMode("demo")} title="Random patient + live backend">Demo</button>
            {mode === "demo" && (
              <button className="mode-randomize" onClick={randomize} title="Pick a new random patient" aria-label="Randomize patient">
                <Icon name="check" size={11} stroke={2.5} />
              </button>
            )}
            <button className={"mode-opt" + (mode === "live" ? " mode-opt--on" : "")} onClick={() => setMode("live")}>
              <span className={mode === "live" ? "live-dot" : ""} /> Live
            </button>
          </div>
          <span className={badgeToneClass} title={`Data source: ${sourceBadge.label}`}>{sourceBadge.label}</span>
          <span className="appbar-divider" />
          <button className={"user-chip" + (page === "profile" ? " user-chip--on" : "")} onClick={() => nav("profile")}>
            <span className="avatar-sm">{patient.initials}</span>
            <span className="user-name">{patient.name.split(" ")[0]}</span>
          </button>
        </div>
      </header>

      {showStagebar && (
        <div className="stagebar">
          <span className="stagebar-label">Prevention journey</span>
          <nav className="stepper">
            {STAGES.map((s, i) => {
              const locked = (s.id === "report" || s.id === "local") && !ingested;
              return (
                <React.Fragment key={s.id}>
                  {i > 0 && <span className={"step-line" + (i <= idx ? " step-line--done" : "")} />}
                  <button
                    className={"step" + (stage === s.id ? " step--on" : "") + (i < idx ? " step--done" : "") + (locked ? " step--locked" : "")}
                    onClick={() => !locked && go(s.id)}
                  >
                    <span className="step-num">{i < idx ? <Icon name="check" size={12} stroke={3} /> : s.n}</span>
                    <span className="step-label">{s.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
          <span className="stagebar-progress">Step {idx + 1} of {STAGES.length}</span>
        </div>
      )}

      <div className="main-scroll">
        <React.Fragment key={dataVersion}>
          {liveLocked ? (
            <Login app={app} />
          ) : page === "resources" ? (
            <Resources go={go} />
          ) : page === "support" ? (
            <Support />
          ) : page === "profile" ? (
            <Profile app={app} go={go} />
          ) : (
            <>
              {stage === "connect" && <Connect app={app} go={go} />}
              {stage === "report" && <Report app={app} go={go} />}
              {stage === "local" && <LocalCare app={app} />}
            </>
          )}
        </React.Fragment>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
