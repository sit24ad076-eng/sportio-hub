import { useEffect, useState } from "react";
import {
  Trophy,
  ShieldCheck,
  Users,
  ArrowRight,
  Mail,
  Lock,
  UserRound,
  Activity,
  LogOut,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  FileCheck,
  QrCode,
  User,
  Sparkles,
} from "lucide-react";

import GuidedLiveCapture from "./components/GuidedLiveCapture.jsx";
import VerificationQueue from "./components/VerificationQueue.jsx";
import QRIdentity from "./components/QRIdentity.jsx";
import AthleteProfile from "./components/AthleteProfile.jsx";

const rawApi = import.meta.env.VITE_API_URL || "/api";
const API = rawApi.startsWith("http")
  ? (rawApi.replace(/\/+$/, "").endsWith("/api") ? rawApi.replace(/\/+$/, "") : `${rawApi.replace(/\/+$/, "")}/api`)
  : "/api";

const saveSession = (data) => {
  localStorage.setItem("sportio_token", data.token);
  localStorage.setItem("sportio_user", JSON.stringify(data.user));
};

const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem("sportio_user"));
  } catch {
    return null;
  }
};

export default function App() {
  const [mode, setMode] = useState("register");
  const [stage, setStage] = useState("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "athlete", otp: "" });
  const [user, setUser] = useState(getSession);
  const [token, setToken] = useState(() => localStorage.getItem("sportio_token") || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [devOtp, setDevOtp] = useState("");

  // Active view in Authenticated Dashboard: "capture" | "queue" | "identity" | "profile"
  const [activeTab, setActiveTab] = useState("capture");

  useEffect(() => {
    const savedToken = localStorage.getItem("sportio_token");
    if (!savedToken) return;
    setToken(savedToken);
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setUser(d.user))
      .catch(() => {
        localStorage.removeItem("sportio_token");
        localStorage.removeItem("sportio_user");
        setUser(null);
        setToken("");
      });
  }, []);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const request = async (path, body) => {
    try {
      const response = await fetch(`${API}/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (mode === "register") {
        const data = await request("register", {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });
        setStage("otp");
        setMessage(data.message);
        setDevOtp(data.devOtp || "");
      } else {
        const data = await request("login", { email: form.email, password: form.password });
        saveSession(data);
        setUser(data.user);
        setToken(data.token);
      }
    } catch (err) {
      setError(err.message);
      if (err.message.includes("verify your email")) setStage("otp");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await request("verify-email", { email: form.email, otp: form.otp });
      saveSession(data);
      setUser(data.user);
      setToken(data.token);
      setMessage("Your email is verified. Welcome to Sportio Hub!");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const data = await request("resend-otp", { email: form.email });
      setMessage(data.message);
      setDevOtp(data.devOtp || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Instant Demo login for evaluation
  const handleQuickDemo = async (role = "athlete") => {
    setError("");
    setBusy(true);
    try {
      const demoEmail = role === "coach" ? "coach.marcus@sportio.io" : "alex.athlete@sportio.io";
      const demoPass = "Sportio2026!Demo";
      const demoName = role === "coach" ? "Coach Marcus Vance" : "Alex Rivera";

      // Try login first
      try {
        const data = await request("login", { email: demoEmail, password: demoPass });
        saveSession(data);
        setUser(data.user);
        setToken(data.token);
        return;
      } catch {
        // If not found, register and auto verify
        const reg = await request("register", {
          name: demoName,
          email: demoEmail,
          password: demoPass,
          role,
        });
        if (reg.devOtp) {
          const verified = await request("verify-email", { email: demoEmail, otp: reg.devOtp });
          saveSession(verified);
          setUser(verified.user);
          setToken(verified.token);
        } else {
          setStage("otp");
          setForm({ ...form, email: demoEmail, password: demoPass });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("sportio_token");
    localStorage.removeItem("sportio_user");
    setUser(null);
    setToken("");
    setMode("login");
    setStage("form");
    setForm({ name: "", email: "", password: "", role: "athlete", otp: "" });
  };

  // Switch role test view
  const switchPreviewRole = (newRole) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    localStorage.setItem("sportio_user", JSON.stringify(updated));
  };

  if (user) {
    return (
      <main className="dashboard-shell">
        {/* Main App Navigation Bar */}
        <header className="dash-header">
          <div className="dash-header-left">
            <div className="brand dark">
              <div className="brand-icon">
                <Trophy size={21} />
              </div>
              <span>
                sportio<span className="brand-light">hub</span>
              </span>
            </div>

            {/* Role indicator & test toggle */}
            <div className="role-switcher-tag">
              <span className="role-lbl">ROLE:</span>
              <button
                type="button"
                className={`role-switch-btn ${user.role === "athlete" ? "selected" : ""}`}
                onClick={() => switchPreviewRole("athlete")}
                title="Switch to Athlete view"
              >
                Athlete
              </button>
              <button
                type="button"
                className={`role-switch-btn ${user.role === "coach" ? "selected" : ""}`}
                onClick={() => switchPreviewRole("coach")}
                title="Switch to Coach view"
              >
                Coach
              </button>
              <button
                type="button"
                className={`role-switch-btn ${user.role === "institution" ? "selected" : ""}`}
                onClick={() => switchPreviewRole("institution")}
                title="Switch to Institution view"
              >
                Institution
              </button>
            </div>
          </div>

          {/* Desktop Tab Links */}
          <nav className="desktop-nav-tabs">
            <button
              type="button"
              className={`nav-tab-link ${activeTab === "capture" ? "active" : ""}`}
              onClick={() => setActiveTab("capture")}
            >
              <Flame size={16} /> Live Capture
            </button>

            <button
              type="button"
              className={`nav-tab-link ${activeTab === "queue" ? "active" : ""}`}
              onClick={() => setActiveTab("queue")}
            >
              <FileCheck size={16} /> Review Queue
            </button>

            <button
              type="button"
              className={`nav-tab-link ${activeTab === "identity" ? "active" : ""}`}
              onClick={() => setActiveTab("identity")}
            >
              <QrCode size={16} /> QR Identity
            </button>

            <button
              type="button"
              className={`nav-tab-link ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <User size={16} /> My Stats
            </button>
          </nav>

          <div className="dash-header-right">
            <span className="user-greeting">
              Hi, <strong>{user.name?.split(" ")[0]}</strong>
            </span>
            <button className="logout-btn" onClick={logout}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </header>

        {/* Tab Content Rendering */}
        <section className="app-main-content">
          {activeTab === "capture" && (
            <GuidedLiveCapture
              apiBase={API}
              token={token}
              onDrillSubmitted={() => setActiveTab("queue")}
            />
          )}

          {activeTab === "queue" && (
            <VerificationQueue
              apiBase={API}
              token={token}
              currentUser={user}
            />
          )}

          {activeTab === "identity" && (
            <QRIdentity
              apiBase={API}
              token={token}
              currentUser={user}
            />
          )}

          {activeTab === "profile" && (
            <AthleteProfile
              apiBase={API}
              token={token}
              user={user}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
        </section>

        {/* Mobile Fixed Bottom Navigation Bar */}
        <nav className="mobile-bottom-nav">
          <button
            type="button"
            className={`m-nav-item ${activeTab === "capture" ? "active" : ""}`}
            onClick={() => setActiveTab("capture")}
          >
            <Flame size={20} />
            <span>Capture</span>
          </button>

          <button
            type="button"
            className={`m-nav-item ${activeTab === "queue" ? "active" : ""}`}
            onClick={() => setActiveTab("queue")}
          >
            <FileCheck size={20} />
            <span>Review</span>
          </button>

          <button
            type="button"
            className={`m-nav-item ${activeTab === "identity" ? "active" : ""}`}
            onClick={() => setActiveTab("identity")}
          >
            <QrCode size={20} />
            <span>QR ID</span>
          </button>

          <button
            type="button"
            className={`m-nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <User size={20} />
            <span>Profile</span>
          </button>
        </nav>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="brand">
          <div className="brand-icon">
            <Trophy size={23} />
          </div>
          <span>
            sportio<span className="brand-light">hub</span>
          </span>
        </div>
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="pulse"></span> YOUR GAME. YOUR JOURNEY.
          </div>
          <h1>
            Every athlete<br />
            deserves a <em>chance.</em>
          </h1>
          <p>
            Connected sports ecosystem featuring camera-guided live capture, coach verification queues, and cryptographically signed QR athlete passports.
          </p>
          <div className="hero-points">
            <div>
              <ShieldCheck />
              <span>Tamper-proof signed QR athletic identity</span>
            </div>
            <div>
              <Flame />
              <span>Camera-guided drills with GPS & timestamp lock</span>
            </div>
            <div>
              <Users />
              <span>Coach & institution official verification review</span>
            </div>
          </div>
        </div>
        <div className="hero-bottom">DISCOVER · DEVELOP · ACHIEVE</div>
      </section>

      <section className="auth-area">
        <div className="auth-card">
          <div className="mobile-brand">
            <Trophy size={20} /> SPORTIO HUB
          </div>
          {stage === "otp" ? (
            <>
              <div className="form-symbol">
                <Mail size={23} />
              </div>
              <div className="form-kicker">EMAIL VERIFICATION</div>
              <h2>Check your inbox</h2>
              <p className="subtext">
                We sent a 6-digit verification code to <strong>{form.email}</strong>. Enter it below to activate your account.
              </p>
              {devOtp && (
                <div className="dev-note">
                  Development OTP: <strong>{devOtp}</strong>{" "}
                  <small>(shown only when DEV_SHOW_OTP=true)</small>
                </div>
              )}
              <form onSubmit={verify}>
                <label>6-digit verification code</label>
                <input
                  className="otp-input"
                  name="otp"
                  value={form.otp}
                  onChange={update}
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="000000"
                  required
                />
                {error && <div className="alert error">{error}</div>}
                <button className="primary-btn" disabled={busy}>
                  {busy ? "Verifying..." : "Verify email"} <ArrowRight size={17} />
                </button>
              </form>
              <div className="resend-row">
                <span>Didn't receive the code?</span>
                <button onClick={resend} disabled={busy}>
                  Resend OTP
                </button>
              </div>
              <button
                className="text-btn"
                onClick={() => {
                  setStage("form");
                  setMode("register");
                }}
              >
                ← Back to registration
              </button>
            </>
          ) : (
            <>
              <div className="form-kicker">{mode === "register" ? "GET STARTED" : "WELCOME BACK"}</div>
              <h2>{mode === "register" ? "Create your account" : "Sign in to Sportio"}</h2>
              <p className="subtext">
                {mode === "register"
                  ? "Start building your verified sporting identity."
                  : "Continue your athlete development journey."}
              </p>
              <div className="switcher">
                <button
                  className={mode === "register" ? "selected" : ""}
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                >
                  Create account
                </button>
                <button
                  className={mode === "login" ? "selected" : ""}
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  Login
                </button>
              </div>
              <form onSubmit={submit}>
                {mode === "register" && (
                  <>
                    <label>Full name</label>
                    <div className="input-wrap">
                      <UserRound size={17} />
                      <input
                        name="name"
                        value={form.name}
                        onChange={update}
                        placeholder="Enter your full name"
                        required
                        minLength="2"
                      />
                    </div>
                    <label>I am registering as</label>
                    <select name="role" value={form.role} onChange={update}>
                      <option value="athlete">Athlete</option>
                      <option value="coach">Coach</option>
                      <option value="institution">Sports institution</option>
                    </select>
                  </>
                )}
                <label>Email address</label>
                <div className="input-wrap">
                  <Mail size={17} />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={update}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <label>Password</label>
                <div className="input-wrap">
                  <Lock size={17} />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={update}
                    placeholder="At least 8 characters"
                    minLength="8"
                    required
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {error && <div className="alert error">{error}</div>}
                {message && <div className="alert success">{message}</div>}
                <button className="primary-btn" disabled={busy}>
                  {busy ? "Please wait..." : mode === "register" ? "Create account" : "Login"}{" "}
                  <ArrowRight size={17} />
                </button>
              </form>

              {/* Quick Demo Access Bar */}
              <div className="quick-demo-box">
                <span className="demo-label">
                  <Sparkles size={13} /> QUICK EVALUATION ACCESS
                </span>
                <div className="demo-buttons">
                  <button
                    type="button"
                    className="demo-btn"
                    onClick={() => handleQuickDemo("athlete")}
                    disabled={busy}
                  >
                    Demo Athlete
                  </button>
                  <button
                    type="button"
                    className="demo-btn"
                    onClick={() => handleQuickDemo("coach")}
                    disabled={busy}
                  >
                    Demo Coach
                  </button>
                </div>
              </div>

              <p className="legal">
                <ShieldCheck size={14} /> Your account details are protected. Email verification is required.
              </p>
            </>
          )}
          <div className="auth-footer">
            SPORTIO HUB <span>•</span> EMPOWERING EVERY ATHLETE
          </div>
        </div>
      </section>
    </main>
  );
}
