import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendOtpEmail } from "../utils/email.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
router.use(authLimiter);

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const otpHash = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
const makeOtp = () => String(crypto.randomInt(100000, 1000000));
const signToken = (user) => jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified });

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const role = ["athlete", "coach", "institution"].includes(req.body.role) ? req.body.role : "athlete";
    if (name.length < 2) return res.status(400).json({ message: "Enter your full name." });
    if (!validEmail(email)) return res.status(400).json({ message: "Enter a valid email address." });
    if (password.length < 8) return res.status(400).json({ message: "Password must contain at least 8 characters." });
    let user = await User.findOne({ email });
    if (user?.emailVerified) return res.status(409).json({ message: "An account with this email already exists." });
    const passwordHash = await bcrypt.hash(password, 12);
    const otp = makeOtp();
    if (!user) user = new User({ name, email, passwordHash, role });
    else { user.name = name; user.passwordHash = passwordHash; user.role = role; }
    user.otpHash = otpHash(otp);
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.otpLastSentAt = new Date();
    await user.save();
    try { await sendOtpEmail(email, name, otp); }
    catch (mailErr) {
      console.error(mailErr.message);
      if (process.env.NODE_ENV !== "development" || process.env.DEV_SHOW_OTP !== "true") {
        return res.status(503).json({ message: "Account saved, but the verification email could not be sent. Check SMTP settings, then request a new code." });
      }
    }
    const response = { message: "Verification code sent to your email. It expires in 10 minutes.", email };
    if (process.env.NODE_ENV === "development" && process.env.DEV_SHOW_OTP === "true") response.devOtp = otp;
    res.status(201).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not create your account." });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    if (!validEmail(email) || !/^\d{6}$/.test(otp)) return res.status(400).json({ message: "Enter your email and the 6-digit code." });
    const user = await User.findOne({ email });
    if (!user || !user.otpHash || !user.otpExpiresAt) return res.status(400).json({ message: "No active verification request. Please register again." });
    if (user.otpExpiresAt.getTime() < Date.now()) return res.status(400).json({ message: "Code expired. Request a new code." });
    if (user.otpHash !== otpHash(otp)) return res.status(400).json({ message: "Incorrect verification code." });
    user.emailVerified = true;
    user.otpHash = null;
    user.otpExpiresAt = null;
    await user.save();
    res.json({ message: "Email verified successfully.", token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not verify your email." });
  }
});

router.post("/resend-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });
    if (!user || user.emailVerified) return res.status(400).json({ message: "No pending account verification found." });
    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < 60 * 1000) return res.status(429).json({ message: "Please wait one minute before requesting another code." });
    const otp = makeOtp();
    user.otpHash = otpHash(otp);
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.otpLastSentAt = new Date();
    await user.save();
    await sendOtpEmail(email, user.name, otp);
    const response = { message: "A new verification code has been sent." };
    if (process.env.NODE_ENV === "development" && process.env.DEV_SHOW_OTP === "true") response.devOtp = otp;
    res.json(response);
  } catch (err) {
    console.error(err.message);
    res.status(503).json({ message: "Could not send a new code. Check email configuration." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Invalid email or password." });
    if (!user.emailVerified) return res.status(403).json({ message: "Please verify your email before logging in.", needsVerification: true, email });
    res.json({ message: "Login successful.", token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not log in." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("name email role emailVerified");
  if (!user) return res.status(404).json({ message: "Account not found." });
  res.json({ user: publicUser(user) });
});

export default router;
