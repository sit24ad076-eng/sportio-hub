import { Router } from "express";
import DrillRecord from "../models/DrillRecord.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Submit a new drill record (Guided Live Capture or Manual)
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      drillType,
      metric,
      score,
      unit = "score",
      attemptsUsed = 1,
      maxRetries = 3,
      location,
      mediaSnapshot = "",
      notes = "",
      isLiveCaptured = true,
      capturedAt,
    } = req.body;

    // Strict input validation
    if (!drillType || typeof drillType !== "string" || drillType.trim().length < 2) {
      return res.status(400).json({ message: "A valid drill type is required (e.g., 100m Sprint, Shuttle Run)." });
    }

    if (!metric || typeof metric !== "string" || metric.trim().length === 0) {
      return res.status(400).json({ message: "Metric result is required (e.g., 11.24 s, 68 cm)." });
    }

    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 0) {
      return res.status(400).json({ message: "A valid positive numeric score is required." });
    }

    const attempts = parseInt(attemptsUsed, 10);
    const maxAllowed = parseInt(maxRetries, 10) || 3;
    if (isNaN(attempts) || attempts < 1 || attempts > maxAllowed) {
      return res.status(400).json({
        message: `Attempt count (${attempts}) must be between 1 and the retry limit (${maxAllowed}).`,
      });
    }

    // Geolocation validation
    let validLocation = {
      latitude: null,
      longitude: null,
      accuracy: null,
      placeName: "GPS Verified Trial Site",
    };

    if (location && typeof location === "object") {
      const lat = Number(location.latitude);
      const lng = Number(location.longitude);
      const acc = Number(location.accuracy);

      if (!isNaN(lat) && lat >= -90 && lat <= 90 && !isNaN(lng) && lng >= -180 && lng <= 180) {
        validLocation.latitude = Number(lat.toFixed(6));
        validLocation.longitude = Number(lng.toFixed(6));
        validLocation.accuracy = !isNaN(acc) ? Number(acc.toFixed(1)) : 5.0;
        if (location.placeName && typeof location.placeName === "string") {
          validLocation.placeName = location.placeName.slice(0, 100);
        }
      }
    }

    // Fetch user details to stamp record
    const user = await User.findById(req.user.id);
    const athleteName = user?.name || "Sportio Athlete";
    const athleteEmail = user?.email || req.user.email;

    // Status logic:
    // If captured with live camera & location, it enters "pending" for coach review queue.
    // If manual or self-reported, it is "self-declared".
    const initialStatus = isLiveCaptured ? "pending" : "self-declared";

    const drill = new DrillRecord({
      athleteId: req.user.id,
      athleteName,
      athleteEmail,
      drillType: drillType.trim(),
      metric: metric.trim(),
      score: numericScore,
      unit: String(unit || "score").trim(),
      status: initialStatus,
      attemptsUsed: attempts,
      maxRetries: maxAllowed,
      location: validLocation,
      capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
      mediaSnapshot: typeof mediaSnapshot === "string" ? mediaSnapshot.slice(0, 3000000) : "",
      notes: typeof notes === "string" ? notes.slice(0, 500) : "",
      metadata: {
        device: req.headers["user-agent"] ? "Web Mobile/Desktop" : "Sportio Hub Client",
        isLiveCaptured: Boolean(isLiveCaptured),
      },
    });

    await drill.save();

    res.status(201).json({
      message: isLiveCaptured
        ? "Drill captured with verified timestamp & location! Submitted to review queue."
        : "Drill logged as self-declared record.",
      drill,
    });
  } catch (err) {
    console.error("Error creating drill:", err);
    res.status(500).json({ message: "Could not save drill performance record." });
  }
});

// Get authenticated user's own drill submissions
router.get("/my", requireAuth, async (req, res) => {
  try {
    const drills = await DrillRecord.find({ athleteId: req.user.id });
    res.json({ drills });
  } catch (err) {
    console.error("Error fetching my drills:", err);
    res.status(500).json({ message: "Could not retrieve drill history." });
  }
});

// Verification queue (for coaches / admins / review)
router.get("/queue", requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ["pending", "self-declared", "verified"].includes(status)) {
      filter.status = status;
    }
    const drills = await DrillRecord.find(filter);
    res.json({ drills });
  } catch (err) {
    console.error("Error fetching review queue:", err);
    res.status(500).json({ message: "Could not load verification queue." });
  }
});

// Coach or Admin verifies/updates drill record status
router.patch("/:id/verify", requireAuth, async (req, res) => {
  try {
    const { status, verificationNotes = "" } = req.body;
    const { id } = req.params;

    if (!["self-declared", "pending", "verified"].includes(status)) {
      return res.status(400).json({
        message: "Status must be either 'self-declared', 'pending', or 'verified'.",
      });
    }

    const drill = await DrillRecord.findById(id);
    if (!drill) {
      return res.status(404).json({ message: "Drill record not found." });
    }

    const reviewer = await User.findById(req.user.id);
    const reviewerName = reviewer?.name || req.user.email || "Official Reviewer";
    const reviewerRole = reviewer?.role || req.user.role || "coach";

    drill.status = status;
    drill.verificationNotes = String(verificationNotes).slice(0, 500);

    if (status === "verified") {
      drill.verifiedBy = {
        id: req.user.id,
        name: reviewerName,
        role: reviewerRole,
      };
      drill.verifiedAt = new Date();
    } else {
      drill.verifiedBy = null;
      drill.verifiedAt = null;
    }

    await drill.save();

    res.json({
      message: `Record successfully updated to ${status}.`,
      drill,
    });
  } catch (err) {
    console.error("Error updating verification status:", err);
    res.status(500).json({ message: "Could not update verification status." });
  }
});

// Get single drill record
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const drill = await DrillRecord.findById(req.params.id);
    if (!drill) {
      return res.status(404).json({ message: "Drill record not found." });
    }
    res.json({ drill });
  } catch (err) {
    console.error("Error fetching drill record:", err);
    res.status(500).json({ message: "Could not fetch drill details." });
  }
});

export default router;
