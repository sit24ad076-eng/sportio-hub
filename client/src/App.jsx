import { useEffect, useState } from "react";
import { Trophy, ShieldCheck, Users, ArrowRight, Mail, Lock, UserRound, Activity, LogOut, CheckCircle2, Eye, EyeOff } from "lucide-react";

const rawApi = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const cleanApi = rawApi.replace(/\/+$/, "");
const API = cleanApi.endsWith("/api") ? cleanApi : `${cleanApi}/api`;

const saveSession = (data) => { localStorage.setItem("sportio_token", data.token); localStorage.setItem("sportio_user", JSON.stringify(data.user)); };
const getSession = () => { try { return JSON.parse(localStorage.getItem("sportio_user")); } catch { return null; } };

export default function App() {
  const [mode, setMode] = useState("register");
  const [stage, setStage] = useState("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "athlete", otp: "" });
  const [user, setUser] = useState(getSession);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [devOtp, setDevOtp] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("sportio_token");
    if (!token) return;
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setUser(d.user))
      .catch(() => { localStorage.removeItem("sportio_token"); localStorage.removeItem("sportio_user"); setUser(null); });
  }, []);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const request = async (path, body) => {
    try {
      const response = await fetch(`${API}/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Something went wrong.");
      return data;
    } catch (err) {
      if (err.message === "Failed to fetch") {
        throw new Error("Unable to connect to backend. The server may be starting up, or check your VITE_API_URL and network access.");
      }
      throw err;
    }
  };
  const submit = async (e) => {
    e.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      if (mode === "register") {
        const data = await request("register", { name: form.name, email: form.email, password: form.password, role: form.role });
        setStage("otp"); setMessage(data.message); setDevOtp(data.devOtp || "");
      } else {
        const data = await request("login", { email: form.email, password: form.password });
        saveSession(data); setUser(data.user);
      }
    } catch (err) { setError(err.message); if (err.message.includes("verify your email")) setStage("otp"); }
    finally { setBusy(false); }
  };
  const verify = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const data = await request("verify-email", { email: form.email, otp: form.otp });
      saveSession(data); setUser(data.user); setMessage("Your email is verified. Welcome to Sportio Hub!");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    setError(""); setMessage(""); setBusy(true);
    try { const data = await request("resend-otp", { email: form.email }); setMessage(data.message); setDevOtp(data.devOtp || ""); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const logout = () => { localStorage.removeItem("sportio_token"); localStorage.removeItem("sportio_user"); setUser(null); setMode("login"); setStage("form"); setForm({ name: "", email: "", password: "", role: "athlete", otp: "" }); };

  if (user) return <Dashboard user={user} onLogout={logout} />;

  return <main className="shell">
    <section className="hero">
      <div className="brand"><div className="brand-icon"><Trophy size={23}/></div><span>sportio<span className="brand-light">hub</span></span></div>
      <div className="hero-copy">
        <div className="eyebrow"><span className="pulse"></span> YOUR GAME. YOUR JOURNEY.</div>
        <h1>Every athlete<br/>deserves a <em>chance.</em></h1>
        <p>A connected sports ecosystem to help emerging talent get discovered, mentored, and supported.</p>
        <div className="hero-points">
          <div><ShieldCheck/><span>Verified athlete identities</span></div>
          <div><Users/><span>Connect with coaches and scouts</span></div>
          <div><Activity/><span>Build your sporting journey</span></div>
        </div>
      </div>
      <div className="hero-bottom">DISCOVER · DEVELOP · ACHIEVE</div>
    </section>

    <section className="auth-area">
      <div className="auth-card">
        <div className="mobile-brand"><Trophy size={20}/> SPORTIO HUB</div>
        {stage === "otp" ? <>
          <div className="form-symbol"><Mail size={23}/></div>
          <div className="form-kicker">EMAIL VERIFICATION</div>
          <h2>Check your inbox</h2>
          <p className="subtext">We sent a 6-digit verification code to <strong>{form.email}</strong>. Enter it below to activate your account.</p>
          {devOtp && <div className="dev-note">Development OTP: <strong>{devOtp}</strong> <small>(shown only when DEV_SHOW_OTP=true)</small></div>}
          <form onSubmit={verify}>
            <label>6-digit verification code</label>
            <input className="otp-input" name="otp" value={form.otp} onChange={update} inputMode="numeric" maxLength="6" placeholder="000000" required/>
            <button className="primary-btn" disabled={busy}>{busy ? "Verifying..." : "Verify email"} <ArrowRight size={17}/></button>
          </form>
          <div className="resend-row"><span>Didn't receive the code?</span><button onClick={resend} disabled={busy}>Resend OTP</button></div>
          <button className="text-btn" onClick={() => {setStage("form");setMode("register");}}>← Back to registration</button>
        </> : <>
          <div className="form-kicker">{mode === "register" ? "GET STARTED" : "WELCOME BACK"}</div>
          <h2>{mode === "register" ? "Create your account" : "Sign in to Sportio"}</h2>
          <p className="subtext">{mode === "register" ? "Start building your sporting identity." : "Continue your athlete development journey."}</p>
          <div className="switcher"><button className={mode === "register" ? "selected" : ""} onClick={() => {setMode("register");setError("");}}>Create account</button><button className={mode === "login" ? "selected" : ""} onClick={() => {setMode("login");setError("");}}>Login</button></div>
          <form onSubmit={submit}>
            {mode === "register" && <>
              <label>Full name</label><div className="input-wrap"><UserRound size={17}/><input name="name" value={form.name} onChange={update} placeholder="Enter your full name" required minLength="2"/></div>
              <label>I am registering as</label><select name="role" value={form.role} onChange={update}><option value="athlete">Athlete</option><option value="coach">Coach</option><option value="institution">Sports institution</option></select>
            </>}
            <label>Email address</label><div className="input-wrap"><Mail size={17}/><input type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com" required/></div>
            <label>Password</label><div className="input-wrap"><Lock size={17}/><input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={update} placeholder="At least 8 characters" minLength="8" required/><button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
            {error && <div className="alert error">{error}</div>}
            {message && <div className="alert success">{message}</div>}
            <button className="primary-btn" disabled={busy}>{busy ? "Please wait..." : mode === "register" ? "Create account" : "Login"} <ArrowRight size={17}/></button>
          </form>
          <p className="legal"><ShieldCheck size={14}/> Your account details are protected. Email verification is required.</p>
        </>}
        <div className="auth-footer">SPORTIO HUB <span>•</span> EMPOWERING EVERY ATHLETE</div>
      </div>
    </section>
  </main>;
}

function Dashboard({ user, onLogout }) {
  return <main className="dashboard-shell">
    <header className="dash-header"><div className="brand dark"><div className="brand-icon"><Trophy size={21}/></div><span>sportio<span className="brand-light">hub</span></span></div><button className="logout-btn" onClick={onLogout}><LogOut size={16}/> Sign out</button></header>
    <section className="welcome"><div className="welcome-tag"><CheckCircle2 size={15}/> EMAIL VERIFIED</div><h1>Welcome to your next chapter, {user.name.split(" ")[0]}.</h1><p>Your Sportio Hub account is ready. This is the starting point of your sporting journey.</p></section>
    <section className="dash-grid">
      <article className="dash-card profile-card"><div className="avatar">{user.name.charAt(0).toUpperCase()}</div><div><span className="card-label">YOUR ACCOUNT</span><h2>{user.name}</h2><p>{user.email}</p><span className="role-pill">{user.role}</span></div></article>
      <article className="dash-card"><div className="mini-icon"><ShieldCheck/></div><span className="card-label">ACCOUNT SECURITY</span><h3>Email verified</h3><p>Your email address has been successfully verified.</p></article>
      <article className="dash-card"><div className="mini-icon"><Activity/></div><span className="card-label">NEXT STEP</span><h3>Build your athlete profile</h3><p>Profile details, achievements, and performance tracking will be added in the next module.</p></article>
    </section>
    <footer className="dash-footer">SPORTIO HUB · DISCOVER · DEVELOP · ACHIEVE</footer>
  </main>;
}
