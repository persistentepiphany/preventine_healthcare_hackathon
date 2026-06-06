/* SVG charts for the health-stats section. Exported to window. */
const TONE = {
  good: "#5FA585",
  raised: "#CC8B5E",
  high: "#CF8077",
  info: "#4A80BC",
  accent: "#4A80BC",
};

/* ---- Weekly steps: bar chart with target line ---- */
function StepsBars({ d }) {
  const W = 600, H = 220, padB = 34, padT = 22, padL = 10, padR = 10;
  const max = Math.max(d.target * 1.05, ...d.data.map((x) => x.value));
  const innerH = H - padB - padT;
  const bw = (W - padL - padR) / d.data.length;
  const ty = padT + innerH - (d.target / max) * innerH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
      {/* target line */}
      <line x1={padL} y1={ty} x2={W - padR} y2={ty} stroke="rgba(255,255,255,.2)" strokeWidth="1" strokeDasharray="4 4" />
      <text x={W - padR} y={ty - 7} className="chart-tick" textAnchor="end">target {d.target.toLocaleString()}</text>
      {d.data.map((x, i) => {
        const bh = (x.value / max) * innerH;
        const bx = padL + i * bw + bw * 0.2;
        const by = padT + innerH - bh;
        const reached = x.value >= d.target;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={bw * 0.6} height={bh} rx="4"
              fill={reached ? "rgba(95,165,133,.6)" : "rgba(74,128,188,.42)"} />
            <text x={bx + bw * 0.3} y={H - 12} className="chart-tick" textAnchor="middle">{x.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---- Resting HR: line chart with healthy band ---- */
function HrLine({ d }) {
  const W = 600, H = 220, padB = 28, padT = 24, padL = 12, padR = 12;
  const vals = d.data;
  const min = Math.min(d.bandLow - 6, ...vals);
  const max = Math.max(d.bandHigh + 6, ...vals);
  const innerH = H - padB - padT;
  const innerW = W - padL - padR;
  const x = (i) => padL + (i / (vals.length - 1)) * innerW;
  const y = (v) => padT + innerH - ((v - min) / (max - min)) * innerH;
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${padL},${padT + innerH} ${pts} ${padL + innerW},${padT + innerH}`;
  const bandY1 = y(d.bandHigh), bandY2 = y(d.bandLow);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
      {/* healthy band */}
      <rect x={padL} y={bandY1} width={innerW} height={bandY2 - bandY1} fill="rgba(95,165,133,.1)" rx="3" />
      <text x={padL + 2} y={bandY1 - 6} className="chart-tick">healthy {d.bandLow}–{d.bandHigh}</text>
      <polyline points={area} fill="rgba(74,128,188,.08)" stroke="none" />
      <polyline points={pts} fill="none" stroke="#4A80BC" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {vals.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === vals.length - 1 ? 4 : 0} fill="#4A80BC" />
      ))}
      <text x={W - padR} y={y(vals[vals.length - 1]) - 9} className="chart-tick" textAnchor="end">{vals[vals.length - 1]} bpm</text>
    </svg>
  );
}

/* ---- Range bar: clean segmented meter showing where a value sits ---- */
function RangeBar({ r }) {
  const span = r.max - r.min;
  const pct = (v) => Math.max(0, Math.min(100, ((v - r.min) / span) * 100));
  const valuePct = Math.max(3, Math.min(97, pct(r.value)));
  let prev = r.min;
  const segs = r.zones.map((z) => {
    const seg = { left: pct(prev), width: pct(z.upto) - pct(prev), from: prev, ...z };
    prev = z.upto;
    return seg;
  });
  const activeIdx = r.zones.findIndex((z) => r.value <= z.upto);
  const active = r.zones[activeIdx === -1 ? r.zones.length - 1 : activeIdx];
  // healthy-band caption
  let gPrev = r.min;
  let healthy = null;
  for (const z of r.zones) { if (z.tone === "good") { healthy = { from: gPrev, to: z.upto }; break; } gPrev = z.upto; }
  return (
    <div className="range">
      <div className="range-head">
        <span className="range-label">{r.label}</span>
        <span className="range-val">
          {r.value}<span className="range-unit"> {r.unit}</span>
          <span className="range-zone" style={{ color: TONE[active.tone], background: TONE[active.tone] + "22" }}>{active.name}</span>
        </span>
      </div>
      <div className="range-meter">
        {segs.map((s, i) => (
          <span
            key={i}
            className="range-seg"
            style={{
              flexGrow: s.width,
              background: TONE[s.tone],
              opacity: i === activeIdx ? 1 : 0.28,
            }}
            title={s.name}
          />
        ))}
        <span className="range-pin" style={{ left: valuePct + "%" }}>
          <span className="range-pin-dot" style={{ background: TONE[active.tone] }} />
        </span>
      </div>
      {healthy && <div className="range-cap">Healthy {healthy.from}–{healthy.to} {r.unit}</div>}
    </div>
  );
}

/* ---- Factor mix: segmented stacked bar ---- */
function FactorMix({ mix }) {
  const total = mix.reduce((a, b) => a + b.value, 0);
  return (
    <div className="fmix">
      <div className="fmix-bar">
        {mix.map((m, i) => (
          <span key={i} className="fmix-seg" style={{ width: (m.value / total) * 100 + "%", background: TONE[m.tone] }} />
        ))}
      </div>
      <div className="fmix-legend">
        {mix.map((m, i) => (
          <div key={i} className="fmix-row">
            <span className="fmix-dot" style={{ background: TONE[m.tone] }} />
            <span className="fmix-name">{m.label}</span>
            <span className="fmix-num">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { StepsBars, HrLine, RangeBar, FactorMix });
