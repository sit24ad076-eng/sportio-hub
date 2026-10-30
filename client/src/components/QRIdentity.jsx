import { useState, useEffect } from "react";
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Search,
  AlertTriangle,
  Award,
  Calendar,
  Lock,
  ExternalLink,
  X,
  FileCheck,
} from "lucide-react";
import { QRCodeSVG } from "../utils/qr.js";

export default function QRIdentity({ apiBase, token, currentUser }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // In-App Verifier State
  const [verifyInput, setVerifyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState("");

  const fetchSignedToken = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/identity/qr-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate signed QR identity.");
      setQrData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignedToken();
  }, []);

  const copyToken = () => {
    if (!qrData?.token) return;
    navigator.clipboard.writeText(qrData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Authenticate and open verified profile inside the app
  const handleVerifyInsideApp = async (tokenToVerify) => {
    const raw = tokenToVerify || verifyInput;
    if (!raw.trim()) {
      setVerifyError("Please enter or scan a signed Sportio QR token.");
      return;
    }

    setVerifying(true);
    setVerifyError("");
    setVerifyResult(null);

    try {
      const res = await fetch(`${apiBase}/identity/verify-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: raw.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        throw new Error(data.message || "Invalid or tampered token.");
      }
      setVerifyResult(data);
    } catch (err) {
      setVerifyError(err.message || "Token verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="identity-container">
      {/* Header */}
      <div className="identity-header">
        <div>
          <div className="section-kicker">
            <Lock size={14} /> CRYPTOGRAPHIC PASSPORT
          </div>
          <h2>Verified QR Identity</h2>
          <p className="subtext">
            Tamper-proof digital athletic passport. Embedded with a cryptographically signed JWT token that can only be unlocked and verified inside the Sportio Hub application.
          </p>
        </div>

        <button
          type="button"
          className="secondary-btn refresh-btn"
          onClick={fetchSignedToken}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh Passport
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="identity-two-col">
        {/* Athlete Digital ID Card */}
        <div className="id-card-frame">
          <div className="id-card-inner">
            <div className="id-card-top">
              <div className="id-brand">
                <ShieldCheck size={20} className="mint-icon" />
                <span>SPORTIO ID PASSPORT</span>
              </div>
              <span className="id-live-pill">AUTHENTIC</span>
            </div>

            <div className="id-card-content">
              <div className="id-avatar-circle">
                {currentUser?.name?.charAt(0).toUpperCase() || "A"}
              </div>

              <div className="id-athlete-info">
                <h3>{currentUser?.name || "Sportio Athlete"}</h3>
                <span className="id-role-tag">{currentUser?.role || "Athlete"}</span>
                <p className="id-email">{currentUser?.email}</p>
              </div>

              {/* QR Code Container */}
              <div className="qr-box">
                {loading ? (
                  <div className="qr-placeholder">
                    <RefreshCw size={24} className="spin-icon" />
                    <span>Signing token...</span>
                  </div>
                ) : qrData?.token ? (
                  <div className="qr-svg-wrapper">
                    <QRCodeSVG value={qrData.qrValue || qrData.token} size={170} />
                  </div>
                ) : (
                  <div className="qr-placeholder">No Token</div>
                )}
                <div className="qr-caption">
                  <Lock size={12} /> Signed with SHA-256 Authority
                </div>
              </div>

              {/* Stats Bar */}
              <div className="id-stats-strip">
                <div className="id-stat-item">
                  <span className="stat-num">{qrData?.stats?.verifiedDrills || 0}</span>
                  <span className="stat-lbl">VERIFIED DRILLS</span>
                </div>
                <div className="id-stat-item">
                  <span className="stat-num">{qrData?.stats?.totalDrills || 0}</span>
                  <span className="stat-lbl">TOTAL TRIALS</span>
                </div>
                <div className="id-stat-item">
                  <span className="stat-num">
                    {currentUser?.emailVerified ? "100%" : "Pending"}
                  </span>
                  <span className="stat-lbl">ACCOUNT TRUST</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="id-card-actions">
                <button
                  type="button"
                  className="secondary-btn copy-token-btn"
                  onClick={copyToken}
                  disabled={!qrData?.token}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Token Copied!" : "Copy Signed Token"}
                </button>

                <button
                  type="button"
                  className="primary-btn inspect-self-btn"
                  onClick={() => handleVerifyInsideApp(qrData?.token)}
                  disabled={!qrData?.token || verifying}
                >
                  <FileCheck size={16} /> Open Verified Profile
                </button>
              </div>
            </div>

            <div className="id-card-footer">
              OFFICIAL VERIFICATION ENGINE • SPORTIO HUB 2026
            </div>
          </div>
        </div>

        {/* In-App Verifier & Scout Scanner Tool */}
        <div className="in-app-verifier-panel">
          <div className="panel-header">
            <Search size={18} className="mint-icon" />
            <div>
              <h3>In-App Identity Verifier</h3>
              <p className="subtext">
                For coaches, scouts, and tournament directors to inspect and authenticate an athlete's QR token on-site.
              </p>
            </div>
          </div>

          <div className="verifier-input-wrap">
            <label>Scan or paste Signed QR Token string</label>
            <textarea
              rows="3"
              className="token-textarea"
              placeholder="Paste token or click 'Open Verified Profile' on the passport card..."
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
            ></textarea>

            <button
              type="button"
              className="primary-btn verify-btn"
              onClick={() => handleVerifyInsideApp()}
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <RefreshCw size={16} className="spin-icon" /> Verifying with Server...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Cryptographically Authenticate
                </>
              )}
            </button>
          </div>

          {verifyError && (
            <div className="alert error">
              <AlertTriangle size={16} />
              <span>{verifyError}</span>
            </div>
          )}

          <div className="verifier-features-list">
            <div className="feature-item">
              <CheckCircle2 size={15} />
              <span>Validates HMAC/SHA-256 digital signature against Sportio authority.</span>
            </div>
            <div className="feature-item">
              <CheckCircle2 size={15} />
              <span>Prevents counterfeit screenshot reuse via timestamp expiration check.</span>
            </div>
            <div className="feature-item">
              <CheckCircle2 size={15} />
              <span>Unlocks official coach-verified performance metrics and drill certifications.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Profile Modal (Opened Only Inside App) */}
      {verifyResult && (
        <div className="modal-backdrop" onClick={() => setVerifyResult(null)}>
          <div className="modal-box verified-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header verified-banner">
              <div className="modal-title-wrap">
                <Award size={26} className="verified-gold-icon" />
                <div>
                  <h3>Official Sportio Verified Profile</h3>
                  <span className="anti-counterfeit-tag">
                    CODE: {verifyResult.verificationProof?.antiCounterfeitCode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setVerifyResult(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Authenticity Certificate */}
              <div className="cert-box">
                <div className="cert-seal">
                  <ShieldCheck size={28} />
                  <span>SEAL OF AUTHENTICITY</span>
                </div>
                <div className="cert-details">
                  <h4>{verifyResult.athlete?.name}</h4>
                  <p>Registered Role: <strong>{verifyResult.athlete?.role}</strong></p>
                  <p>Email: {verifyResult.athlete?.email} {verifyResult.athlete?.emailVerified ? "✓ (Verified)" : ""}</p>
                  <small>Issuer: {verifyResult.verificationProof?.verifiedIssuer}</small>
                </div>
              </div>

              {/* Verified Drills Breakdown */}
              <h4 className="section-title">Coach-Verified Performance Drills</h4>
              <div className="verified-drills-list">
                {verifyResult.verificationProof?.verifiedDrills?.length === 0 ? (
                  <p className="no-drills-text">
                    No individual drills have been marked as verified yet. Complete a guided live capture to get certified.
                  </p>
                ) : (
                  verifyResult.verificationProof?.verifiedDrills?.map((d) => (
                    <div key={d._id} className="verified-drill-card">
                      <div className="drill-icon-box">
                        <Award size={18} />
                      </div>
                      <div className="drill-info">
                        <strong>{d.drillType}</strong>
                        <span>{d.metric}</span>
                      </div>
                      <div className="drill-reviewer">
                        <small>Verified by {d.verifiedBy?.name || "Head Coach"}</small>
                        <small className="location-stamp">{d.location}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="verified-footer-meta">
                <span>Issued at: {new Date(verifyResult.verificationProof?.issuedAt).toLocaleString()}</span>
                <span className="app-locked-pill">Valid Inside Sportio App Only</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
