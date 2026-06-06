/* UI primitives — Apple-Health-flavoured. Exported to window for other scripts. */
const { useState, useEffect, useRef } = React;

/* ---------------- Icons (simple line glyphs) ---------------- */
const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  map: '<path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 4.5 12 2c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7Z"/>',
  scale: '<path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7 2 14a4 4 0 0 0 6 0L5 7Z"/><path d="m19 7-3 7a4 4 0 0 0 6 0l-3-7Z"/>',
  ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  pulse: '<path d="M22 12h-4l-3 8L9 4l-3 8H2"/>',
  activity: '<path d="M13 2 4 13h7l-1 9 9-11h-7l1-9Z"/>',
  pin: '<path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>',
  hospital: '<path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M3 21h18"/><path d="M12 7v6M9 10h6"/>',
  pharmacy: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  stethoscope: '<path d="M4 3v5a4 4 0 0 0 8 0V3"/><path d="M8 16a5 5 0 0 0 10 0v-2"/><circle cx="19" cy="11" r="2"/>',
  check: '<path d="M4 12.5 9 18 20 6"/>',
  alert: '<path d="M12 8v5M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  watch: '<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6V3h6v3M9 18v3h6v-3"/><path d="M12 10v2.5l1.5 1"/>',
  shield: '<path d="M12 3 5 6v5c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 13l2 5-2 2a16 16 0 0 1-15-15l2-1Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  trendUp: '<path d="M4 16l5-5 4 4 7-7"/><path d="M17 8h4v4"/>',
  trendDown: '<path d="M4 8l5 5 4-4 7 7"/><path d="M17 16h4v-4"/>',
  car: '<path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13"/><path d="M5 13h14v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z"/><path d="M7.5 16h.01M16.5 16h.01"/>',
  walk: '<circle cx="13" cy="4" r="1.6"/><path d="M11 21l1.5-5-2.5-2V9l4 1 2 3"/><path d="M10.5 14 8 21M14 12l1 4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
};

function Icon({ name, size = 20, stroke = 2, className = "", style = {} }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || "" }}
    />
  );
}

/* ---------------- Progress ring (Apple-style) ---------------- */
function Ring({ value, size = 150, thickness = 10, color = "#4A80BC", track = "rgba(255,255,255,.08)", children }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 120);
    return () => clearTimeout(t);
  }, [value]);
  const offset = c - (shown / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

/* ---------------- Status chip (minimal: dot + text) ---------------- */
const STATUS = {
  good: { color: "#5FA585", label: "Normal" },
  raised: { color: "#CC8B5E", label: "Attention" },
  high: { color: "#CF8077", label: "High" },
  missing: { color: "#CC8B5E", label: "Missing" },
  context: { color: "rgba(235,235,245,.4)", label: "" },
};

function Chip({ status = "context", children }) {
  const s = STATUS[status] || STATUS.context;
  return (
    <span className="chip" style={{ color: s.color }}>
      <span className="chip-dot" style={{ background: s.color }} />
      {children}
    </span>
  );
}

/* ---------------- Segmented readiness ring ---------------- */
function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arcPath(cx, cy, r, start, end) {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}
function SegRing({ segments, size = 132, thickness = 10, color = "#4A80BC", children }) {
  const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
  const gap = segments.length > 1 ? 9 : 0;
  const seg = 360 / segments.length;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        {segments.map((s, i) => (
          <path
            key={i}
            d={arcPath(cx, cy, r, i * seg + gap / 2, (i + 1) * seg - gap / 2)}
            fill="none"
            stroke={s.done ? color : "rgba(255,255,255,.1)"}
            strokeWidth={thickness}
            strokeLinecap="round"
            style={{ transition: "stroke .5s ease" }}
          >
            <title>{s.label} — {s.done ? "recorded" : "missing"}</title>
          </path>
        ))}
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

/* ---------------- Sparkline ---------------- */
function Spark({ data, color = "#4A80BC", w = 60, h = 20 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const x = (i) => (i / (data.length - 1)) * (w - 2) + 1;
  const y = (v) => h - 2 - ((v - min) / rng) * (h - 4);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const lx = x(data.length - 1), ly = y(data[data.length - 1]);
  return (
    <svg width={w} height={h} className="spark" style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx={lx} cy={ly} r="2" fill={color} />
    </svg>
  );
}

/* ---------------- Metric tile (vitals) ---------------- */
function MetricTile({ m, onClick, active }) {
  const isMissing = m.status === "missing";
  const sc = STATUS[m.status] || STATUS.context;
  return (
    <button className={"metric" + (isMissing ? " metric--missing" : "") + (active ? " metric--active" : "")} onClick={onClick}>
      <div className="metric-top">
        <span className="metric-ico">
          <Icon name={m.icon} size={17} stroke={1.8} />
        </span>
        {m.justAdded ? <span className="metric-added"><Icon name="check" size={11} stroke={3} /> Added</span> : <Chip status={m.status}>{m.statusLabel}</Chip>}
      </div>
      <div className="metric-label">{m.label}</div>
      <div className="metric-value">
        {isMissing ? (
          <span className="metric-add">
            <Icon name="plus" size={14} stroke={2.2} /> Add
          </span>
        ) : (
          <>
            <span className="metric-num">{m.value}</span>
            <span className="metric-unit">{m.unit}</span>
          </>
        )}
        {m.spark && <span className="metric-spark"><Spark data={m.spark} color={sc.color} /></span>}
      </div>
      <div className="metric-note">{m.note}</div>
      <span className="metric-expand"><Icon name={active ? "chevron" : "chevron"} size={13} stroke={2} style={{ transform: active ? "rotate(90deg)" : "none", transition: "transform .2s" }} /></span>
    </button>
  );
}

/* ---------------- Section header ---------------- */
function SectionHead({ title, kicker, action }) {
  return (
    <div className="sec-head">
      <div>
        {kicker && <div className="sec-kicker">{kicker}</div>}
        <h2 className="sec-title">{title}</h2>
      </div>
      {action}
    </div>
  );
}

Object.assign(window, { Icon, Ring, SegRing, Spark, Chip, MetricTile, SectionHead, STATUS, useState, useEffect, useRef });
