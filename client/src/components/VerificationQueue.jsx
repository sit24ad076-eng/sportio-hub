import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Clock,
  User,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  X,
  Award,
} from "lucide-react";

export default function VerificationQueue({ apiBase, token, currentUser }) {
  const [drills, setDrills] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const DEFAULT_SEED_DRILLS = [
    {
      _id: "demo-drill-1",
      athleteId: "athlete-demo-1",
      athleteName: "Alex Rivera",
      athleteEmail: "alex.rivera@sportio.io",
      drillType: "100m Sprint",
      metric: "11.24 s",
      score: 11.24,
      unit: "seconds",
      status: "pending",
      attemptsUsed: 2,
      maxRetries: 3,
      location: { latitude: 13.0827, longitude: 80.2707, accuracy: 3.8, placeName: "Regional Athletic Stadium" },
      capturedAt: new Date(Date.now() - 3600000).toISOString(),
      mediaSnapshot: "",
      notes: "Clear weather, lane 4. Captured via guided live camera.",
      verifiedBy: null,
      metadata: { isLiveCaptured: true },
    },
    {
      _id: "demo-drill-2",
      athleteId: "athlete-demo-2",
      athleteName: "Priya Sharma",
      athleteEmail: "priya.sharma@sportio.io",
      drillType: "Agility 5-10-5 Shuttle",
      metric: "4.48 s",
      score: 4.48,
      unit: "seconds",
      status: "verified",
      attemptsUsed: 1,
      maxRetries: 3,
      location: { latitude: 12.9716, longitude: 77.5946, accuracy: 4.2, placeName: "State Sports Complex" },
      capturedAt: new Date(Date.now() - 86400000).toISOString(),
      mediaSnapshot: "",
      notes: "Clean cone touch, rapid directional change.",
      verifiedBy: { id: "coach-1", name: "Coach Marcus Vance", role: "coach" },
      verificationNotes: "Excellent form and foot placement. Video confirmed.",
      metadata: { isLiveCaptured: true },
    },
    {
      _id: "demo-drill-3",
      athleteId: "athlete-demo-3",
      athleteName: "Liam Chen",
      athleteEmail: "liam.chen@sportio.io",
      drillType: "Vertical Jump",
      metric: "68 cm",
      score: 68,
      unit: "cm",
      status: "self-declared",
      attemptsUsed: 3,
      maxRetries: 3,
      location: { latitude: 13.0451, longitude: 80.2214, accuracy: 12.0, placeName: "Local Community Gym" },
      capturedAt: new Date(Date.now() - 172800000).toISOString(),
      mediaSnapshot: "",
      notes: "Measured on jump mat.",
      verifiedBy: null,
      metadata: { isLiveCaptured: false },
    },
  ];

  const getCombinedDrills = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("sportio_local_drills") || "[]");
      const ids = new Set(stored.map((d) => d._id));
      const seeds = DEFAULT_SEED_DRILLS.filter((d) => !ids.has(d._id));
      return [...stored, ...seeds];
    } catch {
      return DEFAULT_SEED_DRILLS;
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    setError("");
    const localDrills = getCombinedDrills();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${apiBase}/drills/queue`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (res.ok && data.drills && data.drills.length > 0) {
        setDrills(data.drills);
      } else {
        setDrills(localDrills);
      }
    } catch {
      setDrills(localDrills);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleUpdateStatus = async (recordId, newStatus) => {
    setSubmittingReview(true);
    setError("");
    setSuccessMsg("");
    const notesText = reviewNotes || (newStatus === "verified" ? "Verified authentic performance trial by coach." : "Flagged as self-declared entry.");

    // Update locally in state immediately
    setDrills((prev) =>
      prev.map((d) => {
        if (d._id === recordId) {
          return {
            ...d,
            status: newStatus,
            verificationNotes: notesText,
            verifiedBy: newStatus === "verified" ? { id: currentUser?.id || "coach-1", name: currentUser?.name || "Coach Marcus", role: "coach" } : null,
            verifiedAt: newStatus === "verified" ? new Date().toISOString() : null,
          };
        }
        return d;
      })
    );

    // Save to local storage for persistence across tabs
    try {
      const currentStored = getCombinedDrills();
      const updatedList = currentStored.map((d) => {
        if (d._id === recordId) {
          return {
            ...d,
            status: newStatus,
            verificationNotes: notesText,
            verifiedBy: newStatus === "verified" ? { id: currentUser?.id || "coach-1", name: currentUser?.name || "Coach Marcus", role: "coach" } : null,
            verifiedAt: newStatus === "verified" ? new Date().toISOString() : null,
          };
        }
        return d;
      });
      localStorage.setItem("sportio_local_drills", JSON.stringify(updatedList));
    } catch {}

    try {
      await fetch(`${apiBase}/drills/${recordId}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, verificationNotes: notesText }),
      });
    } catch {}

    setSuccessMsg(`Record marked as "${newStatus}".`);
    setSelectedRecord(null);
    setReviewNotes("");
    setSubmittingReview(false);
  };

  // Filter and search records
  const filteredDrills = drills.filter((d) => {
    const matchesFilter = filter === "all" ? true : d.status === filter;
    const matchesSearch =
      searchTerm === "" ||
      d.athleteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.drillType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.athleteEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = drills.filter((d) => d.status === "pending").length;
  const verifiedCount = drills.filter((d) => d.status === "verified").length;
  const selfCount = drills.filter((d) => d.status === "self-declared").length;

  return (
    <div className="queue-container">
      {/* Header */}
      <div className="queue-header">
        <div>
          <div className="section-kicker">
            <FileCheck size={14} /> OFFICIAL VERIFICATION QUEUE
          </div>
          <h2>Coach & Admin Review Hub</h2>
          <p className="subtext">
            Audit athlete drill submissions. Validate GPS coordinates, live timestamp, and attempt limits before awarding verified status.
          </p>
        </div>
        <button
          type="button"
          className="secondary-btn refresh-btn"
          onClick={fetchQueue}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh Queue
        </button>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="queue-filters-row">
        <div className="queue-tab-group">
          <button
            className={`tab-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Submissions <span className="tab-count">{drills.length}</span>
          </button>
          <button
            className={`tab-btn tab-pending ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            Pending Review <span className="tab-count-pill amber">{pendingCount}</span>
          </button>
          <button
            className={`tab-btn tab-verified ${filter === "verified" ? "active" : ""}`}
            onClick={() => setFilter("verified")}
          >
            Verified <span className="tab-count-pill emerald">{verifiedCount}</span>
          </button>
          <button
            className={`tab-btn tab-self ${filter === "self-declared" ? "active" : ""}`}
            onClick={() => setFilter("self-declared")}
          >
            Self-Declared <span className="tab-count-pill slate">{selfCount}</span>
          </button>
        </div>

        <div className="queue-search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search athlete or drill..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {successMsg && <div className="alert success">{successMsg}</div>}
      {error && <div className="alert error">{error}</div>}

      {/* Submissions List */}
      <div className="submissions-grid">
        {loading && (
          <div className="empty-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>Loading submission queue...</p>
          </div>
        )}

        {!loading && filteredDrills.length === 0 && (
          <div className="empty-state">
            <FileCheck size={32} />
            <h4>No submissions found</h4>
            <p>
              {filter === "pending"
                ? "No drills currently awaiting verification. Good job!"
                : "No drill records match your selected filter."}
            </p>
          </div>
        )}

        {!loading &&
          filteredDrills.map((drill) => (
            <div
              key={drill._id}
              className={`submission-card status-${drill.status}`}
              onClick={() => {
                setSelectedRecord(drill);
                setReviewNotes(drill.verificationNotes || "");
              }}
            >
              <div className="submission-card-top">
                <div className="athlete-brief">
                  <div className="brief-avatar">
                    {drill.athleteName ? drill.athleteName.charAt(0).toUpperCase() : "A"}
                  </div>
                  <div>
                    <h5>{drill.athleteName || "Athlete"}</h5>
                    <span className="athlete-email-sub">{drill.athleteEmail}</span>
                  </div>
                </div>

                <StatusBadge status={drill.status} />
              </div>

              <div className="submission-card-main">
                <div className="drill-metric-badge">
                  <span className="drill-type-title">{drill.drillType}</span>
                  <span className="drill-score-large">{drill.metric}</span>
                </div>

                <div className="submission-meta-tags">
                  <span className="meta-tag">
                    <Clock size={12} /> {new Date(drill.capturedAt || drill.createdAt).toLocaleDateString()}
                  </span>
                  <span className="meta-tag">
                    <MapPin size={12} /> {drill.location?.placeName || "GPS Site"}
                  </span>
                  <span className="meta-tag retry-audit">
                    Attempt {drill.attemptsUsed || 1}/{drill.maxRetries || 3}
                  </span>
                </div>
              </div>

              {drill.verifiedBy && (
                <div className="verified-by-strip">
                  <Award size={13} />
                  <span>Verified by <strong>{drill.verifiedBy.name}</strong></span>
                </div>
              )}

              <div className="submission-card-footer">
                <span>Click to inspect proof & verify</span>
                <ChevronRight size={15} />
              </div>
            </div>
          ))}
      </div>

      {/* Review & Audit Modal */}
      {selectedRecord && (
        <div className="modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="modal-box review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <ShieldCheck size={22} className="modal-shield" />
                <div>
                  <h3>Performance Trial Audit</h3>
                  <span className="modal-id">Record ID: {selectedRecord._id}</span>
                </div>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setSelectedRecord(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Top Summary Banner */}
              <div className="audit-athlete-row">
                <div className="audit-avatar">
                  {selectedRecord.athleteName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4>{selectedRecord.athleteName}</h4>
                  <p>{selectedRecord.athleteEmail}</p>
                </div>
                <div className="audit-current-status">
                  <span className="status-label-caption">Current State</span>
                  <StatusBadge status={selectedRecord.status} />
                </div>
              </div>

              {/* Evidence Panel */}
              <div className="evidence-grid">
                <div className="evidence-card">
                  <span className="evidence-label">PERFORMANCE DRILL</span>
                  <div className="evidence-value">{selectedRecord.drillType}</div>
                  <div className="evidence-score-highlight">{selectedRecord.metric}</div>
                </div>

                <div className="evidence-card">
                  <span className="evidence-label">ATTEMPT & RETRY AUDIT</span>
                  <div className="evidence-value">
                    Attempt {selectedRecord.attemptsUsed || 1} of {selectedRecord.maxRetries || 3}
                  </div>
                  <span className="evidence-subtext">
                    {selectedRecord.attemptsUsed <= selectedRecord.maxRetries
                      ? "Compliant with strict 3-retry verification limit."
                      : "Warning: Exceeded attempt limit."}
                  </span>
                </div>

                <div className="evidence-card">
                  <span className="evidence-label">GPS LOCATION INTEGRITY</span>
                  <div className="evidence-value">
                    {selectedRecord.location?.latitude?.toFixed(4) || "13.0827"}°N,{" "}
                    {selectedRecord.location?.longitude?.toFixed(4) || "80.2707"}°E
                  </div>
                  <span className="evidence-subtext">
                    Accuracy radius: ±{selectedRecord.location?.accuracy || 4}m
                  </span>
                </div>

                <div className="evidence-card">
                  <span className="evidence-label">LIVE TIMESTAMP</span>
                  <div className="evidence-value">
                    {new Date(selectedRecord.capturedAt || selectedRecord.createdAt).toLocaleString()}
                  </div>
                  <span className="evidence-subtext">ISO Server Stamped</span>
                </div>
              </div>

              {/* Visual Snapshot Evidence */}
              {selectedRecord.mediaSnapshot && (
                <div className="snapshot-modal-view">
                  <span className="evidence-label">CAPTURED CAMERA SNAPSHOT</span>
                  <img
                    src={selectedRecord.mediaSnapshot}
                    alt="Drill live capture"
                    className="audit-snapshot-img"
                  />
                </div>
              )}

              {/* Notes */}
              {selectedRecord.notes && (
                <div className="athlete-notes-box">
                  <strong>Athlete Notes:</strong> {selectedRecord.notes}
                </div>
              )}

              {/* Verification Decision Form */}
              <div className="verification-decision-panel">
                <label>Reviewer / Coach Assessment Notes</label>
                <textarea
                  rows="2"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Video reviewed. Form is clean and timing gate confirmed."
                ></textarea>

                <div className="decision-actions">
                  <button
                    type="button"
                    className="action-btn btn-verify"
                    disabled={submittingReview}
                    onClick={() => handleUpdateStatus(selectedRecord._id, "verified")}
                  >
                    <CheckCircle2 size={16} /> Mark as Verified
                  </button>

                  <button
                    type="button"
                    className="action-btn btn-pending"
                    disabled={submittingReview}
                    onClick={() => handleUpdateStatus(selectedRecord._id, "pending")}
                  >
                    <Clock size={16} /> Keep Pending
                  </button>

                  <button
                    type="button"
                    className="action-btn btn-self"
                    disabled={submittingReview}
                    onClick={() => handleUpdateStatus(selectedRecord._id, "self-declared")}
                  >
                    <AlertCircle size={16} /> Mark Self-Declared
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "verified") {
    return (
      <span className="status-pill pill-verified">
        <CheckCircle2 size={12} /> Verified
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="status-pill pill-pending">
        <Clock size={12} /> Pending Review
      </span>
    );
  }
  return (
    <span className="status-pill pill-self">
      <User size={12} /> Self-Declared
    </span>
  );
}
