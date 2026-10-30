import { useState, useEffect } from "react";
import {
  Trophy,
  ShieldCheck,
  Activity,
  Flame,
  Clock,
  CheckCircle2,
  Calendar,
  MapPin,
  RefreshCw,
  ArrowRight,
  UserCheck,
} from "lucide-react";

export default function AthleteProfile({ apiBase, token, user, onNavigate }) {
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyDrills = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/drills/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setDrills(data.drills || []);
    } catch (err) {
      console.warn("Could not fetch my drills:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDrills();
  }, []);

  const verifiedDrills = drills.filter((d) => d.status === "verified");
  const pendingDrills = drills.filter((d) => d.status === "pending");
  const selfDrills = drills.filter((d) => d.status === "self-declared");

  return (
    <div className="profile-container">
      {/* Profile Overview Card */}
      <div className="profile-hero-card">
        <div className="profile-main-row">
          <div className="profile-avatar-large">
            {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="profile-titles">
            <div className="profile-badge-row">
              <span className="role-pill">{user?.role || "Athlete"}</span>
              {user?.emailVerified && (
                <span className="email-verified-pill">
                  <CheckCircle2 size={12} /> Email Verified
                </span>
              )}
            </div>
            <h2>{user?.name}</h2>
            <p className="profile-email-text">{user?.email}</p>
          </div>
        </div>

        <div className="profile-stats-grid">
          <div className="p-stat-card">
            <div className="p-stat-icon emerald">
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="p-stat-num">{verifiedDrills.length}</span>
              <span className="p-stat-lbl">Verified Drills</span>
            </div>
          </div>

          <div className="p-stat-card">
            <div className="p-stat-icon amber">
              <Clock size={20} />
            </div>
            <div>
              <span className="p-stat-num">{pendingDrills.length}</span>
              <span className="p-stat-lbl">Pending Review</span>
            </div>
          </div>

          <div className="p-stat-card">
            <div className="p-stat-icon blue">
              <Flame size={20} />
            </div>
            <div>
              <span className="p-stat-num">{drills.length}</span>
              <span className="p-stat-lbl">Total Submissions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Banners */}
      <div className="profile-actions-grid">
        <div className="action-banner-card" onClick={() => onNavigate("capture")}>
          <div className="banner-icon-bg">
            <Flame size={24} />
          </div>
          <div>
            <h4>Record Guided Drill</h4>
            <p>Start camera viewfinder with GPS & timestamp watermark.</p>
          </div>
          <ArrowRight size={18} className="banner-arrow" />
        </div>

        <div className="action-banner-card" onClick={() => onNavigate("identity")}>
          <div className="banner-icon-bg mint">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4>Show QR Identity</h4>
            <p>Display your tamper-proof signed athletic passport.</p>
          </div>
          <ArrowRight size={18} className="banner-arrow" />
        </div>
      </div>

      {/* Personal Drill History */}
      <div className="my-drills-section">
        <div className="section-title-row">
          <div>
            <h3>Personal Drill Record History</h3>
            <p className="subtext">Chronological log of your guided trials and verified achievements.</p>
          </div>
          <button type="button" className="text-refresh-btn" onClick={fetchMyDrills}>
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <RefreshCw size={20} className="spin-icon" />
            <p>Loading personal drill history...</p>
          </div>
        ) : drills.length === 0 ? (
          <div className="empty-state">
            <Trophy size={30} />
            <h4>No drills recorded yet</h4>
            <p>Take your first guided live capture trial using the camera to start your sporting journey.</p>
            <button
              type="button"
              className="primary-btn record-first-btn"
              onClick={() => onNavigate("capture")}
            >
              Record First Drill
            </button>
          </div>
        ) : (
          <div className="personal-drills-list">
            {drills.map((d) => (
              <div key={d._id} className="personal-drill-row">
                <div className="p-drill-name-col">
                  <strong>{d.drillType}</strong>
                  <small>
                    <Calendar size={11} /> {new Date(d.capturedAt || d.createdAt).toLocaleDateString()}
                  </small>
                </div>

                <div className="p-drill-metric-col">
                  <span className="metric-bold">{d.metric}</span>
                  <small>Attempt {d.attemptsUsed || 1}/{d.maxRetries || 3}</small>
                </div>

                <div className="p-drill-status-col">
                  {d.status === "verified" && (
                    <span className="status-pill pill-verified">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  )}
                  {d.status === "pending" && (
                    <span className="status-pill pill-pending">
                      <Clock size={12} /> In Review
                    </span>
                  )}
                  {d.status === "self-declared" && (
                    <span className="status-pill pill-self">
                      Self-Declared
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
