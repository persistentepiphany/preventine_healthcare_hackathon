/* Resources, Support, Profile, and Login pages */

/* ---------- Login (Live mode gate) ----------
   Prototype credentials — intentionally hard-coded so the deployed demo
   always works. Not sensitive: this is a no-backend, no-PII prototype. */
const DEMO_EMAIL = "testuser@gmail.com";
const DEMO_PASSWORD = "testpass123";

function Login({ app }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState("idle"); // idle | signing
  const steps = [
    { text: "Verifying credentials", result: "OK", tone: "ok" },
    { text: "Preparing your space", result: "Ready", tone: "ok" },
  ];

  function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em || !password) {
      setError("Enter an email and password.");
      return;
    }
    if (em !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      setError("Use the demo credentials shown below.");
      return;
    }
    setError("");
    setStep("signing");
  }

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  return (
    <div className="login">
      <div className="login-card">
        <span className="login-mark"><Icon name="shield" size={26} stroke={1.8} /></span>
        <h1 className="login-title">Sign in</h1>
        <p className="login-sub">
          Live mode unlocks your personal report. This is an educational prototype — your sign-in
          stays in your browser.
        </p>
        {step === "idle" ? (
          <form onSubmit={submit} style={{ textAlign: "left" }}>
            <label className="login-field-label">Email</label>
            <input
              type="email"
              className="login-input"
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="login-field-label">Password</label>
            <input
              type="password"
              className="login-input"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <div className="login-error"><Icon name="info" size={12} stroke={1.8} /> {error}</div>}
            <button type="submit" className="login-btn" style={{ marginTop: 14 }}>
              <Icon name="arrowRight" size={16} stroke={2} /> Sign in
            </button>
            <button type="button" className="login-alt" onClick={() => app.setMode("demo")}>Use the demo profile instead</button>
            <div className="login-demo-creds">
              <div className="login-demo-creds-h">Demo account</div>
              <div className="login-demo-creds-row"><span>Email</span><code>{DEMO_EMAIL}</code></div>
              <div className="login-demo-creds-row"><span>Password</span><code>{DEMO_PASSWORD}</code></div>
              <button type="button" className="login-demo-fill" onClick={fillDemo}>Fill demo credentials</button>
            </div>
            <div className="login-foot"><Icon name="info" size={12} stroke={1.8} /> Educational prototype — not connected to live NHS systems.</div>
          </form>
        ) : (
          <div className="login-engine">
            <EngineRun steps={steps} title="Signing you in" sub={email} doneLabel="Signed in" holdMs={520} onDone={() => app.signIn()} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Resources ---------- */
function Resources({ go }) {
  const D = window.APP_DATA;
  return (
    <div className="stage stage--page">
      <div className="page-head">
        <div className="stage-eyebrow">Library</div>
        <h1 className="stage-title">Resources</h1>
        <p className="stage-lede">Trusted NHS guidance, organised around understanding your risk and acting on it.</p>
      </div>
      {D.resources.map((grp) => (
        <div key={grp.group} className="res-group">
          <h2 className="res-group-title">{grp.group}</h2>
          <div className="content-grid">
            {grp.items.map((c) => (
              <a key={c.title} className="content-card" href={c.url} target="_blank" rel="noreferrer">
                <div className="cc-rel">{c.tag}</div>
                <div className="cc-title">{c.title}</div>
                <div className="cc-sum">{c.desc}</div>
                <div className="cc-foot">nhs.uk <Icon name="external" size={13} stroke={1.8} /></div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Support ---------- */
function Support() {
  const D = window.APP_DATA;
  const { support } = D;
  const [open, setOpen] = useState(0);
  return (
    <div className="stage stage--page">
      <div className="page-head">
        <div className="stage-eyebrow">Help</div>
        <h1 className="stage-title">Support</h1>
        <p className="stage-lede">Get help using PreventPath — and know where to turn for urgent care.</p>
      </div>

      <div className="urgent-row">
        {support.urgent.map((u) => (
          <a key={u.label} className={"urgent-card urgent-card--" + u.tone} href={u.action}>
            <div className="urgent-label">{u.label}</div>
            <div className="urgent-desc">{u.desc}</div>
            <span className="urgent-go"><Icon name="phone" size={15} stroke={1.9} /> Call</span>
          </a>
        ))}
      </div>

      <div className="bento bento--2">
        <section className="panel">
          <div className="panel-head"><h2 className="panel-title">Frequently asked</h2></div>
          <div className="faq-list">
            {support.faqs.map((f, i) => (
              <div key={i} className={"faq" + (open === i ? " faq--open" : "")}>
                <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                  <span>{f.q}</span>
                  <Icon name="chevron" size={15} stroke={2} style={{ transform: open === i ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
                </button>
                {open === i && <p className="faq-a">{f.a}</p>}
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2 className="panel-title">Contact us</h2></div>
          <div className="contact-list">
            {support.contact.map((c) => (
              <button key={c.label} className="contact-row">
                <span className="source-ico"><Icon name={c.icon} size={17} stroke={1.8} /></span>
                <div className="contact-main">
                  <div className="contact-label">{c.label}</div>
                  <div className="contact-desc">{c.desc}</div>
                </div>
                <Icon name="arrowRight" size={15} stroke={1.8} className="svc-chev" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Profile ---------- */
function Profile({ app, go }) {
  const D = window.APP_DATA;
  const { patient, account, measurements } = D;
  const recorded = measurements.filter((m) => m.status !== "missing").length;
  return (
    <div className="stage stage--page">
      <div className="page-head">
        <div className="stage-eyebrow">Account</div>
        <h1 className="stage-title">Your profile</h1>
      </div>

      <section className="panel profile-hero">
        <span className="avatar-xl">{patient.initials}</span>
        <div className="profile-id">
          <div className="profile-name">{patient.name}</div>
          <div className="profile-meta">{patient.age} · {patient.sex} · {patient.postcode} · {patient.location.localAuthority}</div>
          <div className="profile-tags">
            <span className="profile-tag"><span className={app.mode === "live" ? "live-dot" : "prov-dot prov-dot--cache"} /> {app.mode === "live" ? "Live mode" : "Demo mode"}</span>
            <span className="profile-tag">{account.plan}</span>
          </div>
        </div>
        <button className="signout-btn" onClick={() => app.signOut()}><Icon name="arrowRight" size={14} stroke={1.9} /> Sign out</button>
      </section>

      <div className="bento bento--2">
        <section className="panel">
          <div className="panel-head"><h2 className="panel-title">At a glance</h2></div>
          <div className="pstat-grid">
            <div className="pstat"><div className="pstat-n">{recorded}/{measurements.length}</div><div className="pstat-k">measurements on file</div></div>
            <div className="pstat"><div className="pstat-n">{D.completeness}%</div><div className="pstat-k">profile complete</div></div>
            <div className="pstat"><div className="pstat-n">2</div><div className="pstat-k">key checks missing</div></div>
            <div className="pstat"><div className="pstat-n">Likely</div><div className="pstat-k">Health Check eligible</div></div>
          </div>
          <button className="cta cta--sm" style={{ marginTop: 18 }} onClick={() => go("report")}>View my report <Icon name="arrowRight" size={14} stroke={2} /></button>
        </section>

        <section className="panel">
          <div className="panel-head"><h2 className="panel-title">Settings</h2></div>
          <div className="set-list">
            {account.settings.map((s) => (
              <button key={s.label} className="set-row">
                <span className="source-ico"><Icon name={s.icon} size={16} stroke={1.8} /></span>
                <span className="set-label">{s.label}</span>
                <span className="set-val">{s.value}</span>
                <Icon name="chevron" size={14} stroke={2} className="svc-chev" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

Object.assign(window, { Login, Resources, Support, Profile });
