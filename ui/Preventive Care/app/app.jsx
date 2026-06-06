/* App shell — top nav, stage stepper, page routing, Demo/Live + login */
function App() {
  const D = window.APP_DATA;
  const { patient } = D;
  const [stage, setStage] = useState("connect");
  const [page, setPage] = useState("journey"); // journey | resources | support | profile
  const [mode, setModeState] = useState("demo"); // demo | live
  const [authed, setAuthed] = useState(false); // live requires sign-in
  const [ingested, setIngested] = useState(true);
  const [reportReady, setReportReady] = useState(true);

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

  function setMode(next) {
    if (next === mode && next === "demo") return;
    setModeState(next);
    if (next === "live") {
      setAuthed(false);
      setIngested(false);
      setReportReady(false);
      setStage("connect");
      setPage("journey");
    } else {
      setAuthed(false);
      setIngested(true);
      setReportReady(true);
      setPage("journey");
    }
  }

  const app = {
    mode, ingested, reportReady, authed, page,
    setMode,
    signIn: () => setAuthed(true),
    signOut: () => { setModeState("demo"); setAuthed(false); setIngested(true); setReportReady(true); setStage("connect"); setPage("journey"); },
    markIngested: () => setIngested(true),
    markReportReady: () => setReportReady(true),
    resetLive: () => { setIngested(false); setReportReady(false); },
    go, nav,
  };

  const showStagebar = page === "journey" && !liveLocked;

  return (
    <div className="app">
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
            <button className={"mode-opt" + (mode === "demo" ? " mode-opt--on" : "")} onClick={() => setMode("demo")}>Demo</button>
            <button className={"mode-opt" + (mode === "live" ? " mode-opt--on" : "")} onClick={() => setMode("live")}>
              <span className={mode === "live" ? "live-dot" : ""} /> Live
            </button>
          </div>
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
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
