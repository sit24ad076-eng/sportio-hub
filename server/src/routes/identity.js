import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import DrillRecord from "../models/DrillRecord.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Generate a cryptographically signed QR token for the authenticated athlete
router.get("/qr-token", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Athlete not found." });
    }

    // Fetch athlete's drill metrics
    const drills = await DrillRecord.find({ athleteId: req.user.id });
    const verifiedDrills = drills.filter((d) => d.status === "verified");
    const pendingDrills = drills.filter((d) => d.status === "pending");

    // Create secure payload for QR token
    const tokenPayload = {
      sub: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      verifiedCount: verifiedDrills.length,
      totalCount: drills.length,
      tokenType: "sportio_verified_identity",
      issuedAt: Date.now(),
    };

    const signedToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({
      token: signedToken,
      qrValue: `sportio-id:${signedToken}`,
      athlete: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      stats: {
        totalDrills: drills.length,
        verifiedDrills: verifiedDrills.length,
        pendingDrills: pendingDrills.length,
      },
    });
  } catch (err) {
    console.error("Error generating QR token:", err);
    res.status(500).json({ message: "Could not generate athlete QR token." });
  }
});

// Verify signed QR token inside the app (opens verified profile only inside app)
router.post("/verify-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({
        verified: false,
        message: "A signed Sportio QR token is required for verification.",
      });
    }

    // Strip optional app prefix if passed (e.g. "sportio-id:eyJhb...")
    const rawToken = token.startsWith("sportio-id:")
      ? token.slice("sportio-id:".length).trim()
      : token.trim();

    let decoded;
    try {
      decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
    } catch (jwtErr) {
      return res.status(400).json({
        verified: false,
        message: "Invalid, expired, or tampered QR Identity token.",
        reason: jwtErr.message,
      });
    }

    if (decoded.tokenType !== "sportio_verified_identity" || !decoded.sub) {
      return res.status(400).json({
        verified: false,
        message: "Unrecognized QR token format. This profile is not an authentic Sportio Identity.",
      });
    }

    // Look up the athlete in the database
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(404).json({
        verified: false,
        message: "Athlete record associated with this token could not be found.",
      });
    }

    // Retrieve verified drills for this athlete
    const allDrills = await DrillRecord.find({ athleteId: decoded.sub });
    const verifiedDrills = allDrills.filter((d) => d.status === "verified");

    res.json({
      verified: true,
      message: "Authentic Sportio Verified Identity confirmed.",
      athlete: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      verificationProof: {
        totalDrills: allDrills.length,
        verifiedDrillsCount: verifiedDrills.length,
        verifiedDrills: verifiedDrills.map((d) => ({
          _id: d._id,
          drillType: d.drillType,
          metric: d.metric,
          score: d.score,
          verifiedBy: d.verifiedBy,
          verifiedAt: d.verifiedAt,
          location: d.location?.placeName || "GPS Verified Field",
        })),
        issuedAt: new Date(decoded.issuedAt || Date.now()).toISOString(),
        verifiedIssuer: "Sportio Hub Authenticity Gateway",
        antiCounterfeitCode: decoded.sub.slice(0, 8).toUpperCase() + "-" + (decoded.issuedAt || 1000).toString().slice(-4),
      },
    });
  } catch (err) {
    console.error("Error verifying QR token:", err);
    res.status(500).json({
      verified: false,
      message: "Server error occurred while validating QR token.",
    });
  }
});

export default router;
