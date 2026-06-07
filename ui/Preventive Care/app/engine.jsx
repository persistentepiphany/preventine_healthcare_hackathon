/* Engine-run animation - staggered status messages with a progress bar.
   Used for live ingestion (Connect) and report generation (Report). */
function EngineRun({ steps, onDone, title, sub, holdMs = 750, doneLabel = "Complete" }) {
  const [i, setI] = useState(0); // number of lines resolved
  const done = i >= steps.length;

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => onDone && onDone(), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI((n) => n + 1), i === 0 ? 450 : holdMs);
    return () => clearTimeout(t);
  }, [i, done]);

  const pct = Math.round((i / steps.length) * 100);

  return (
    <div className="engine">
      <div className="engine-card">
        <div className="engine-head">
          <span className={"engine-orb" + (done ? " engine-orb--done" : "")}>
            {done ? <Icon name="check" size={20} stroke={2.6} /> : <span className="engine-spin" />}
          </span>
          <div>
            <div className="engine-title">{done ? doneLabel : title}</div>
            <div className="engine-sub">{sub}</div>
          </div>
          <span className="engine-pct">{done ? 100 : pct}%</span>
        </div>

        <div className="engine-bar"><span style={{ width: (done ? 100 : pct) + "%" }} /></div>

        <div className="engine-log">
          {steps.slice(0, i + 1).map((s, idx) => {
            if (idx >= steps.length) return null;
            const isActive = idx === i && !done;
            return (
              <div key={idx} className={"eline" + (isActive ? " eline--active" : " eline--done")}>
                <span className="eline-ico">
                  {isActive ? (
                    <span className="eline-spin" />
                  ) : (
                    <Icon name={s.tone === "warn" ? "alert" : "check"} size={12} stroke={2.6} />
                  )}
                </span>
                <span className="eline-text">{s.text}</span>
                {!isActive && s.result && (
                  <span className={"eline-tag" + (s.tone === "warn" ? " eline-tag--warn" : "")}>{s.result}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.EngineRun = EngineRun;
