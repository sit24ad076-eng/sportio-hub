import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import authRoutes from "./routes/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, "../../client/dist");

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));

// Permissive CORS to allow Vercel, localhost, and preview deploys without crashing
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Sportio Hub API",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Inform client if database is still connecting
app.use("/api/auth", (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database is not connected. Make sure 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access.",
    });
  }
  next();
});

app.use("/api/auth", authRoutes);

// Serve built frontend if client/dist exists
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const port = process.env.PORT || 5000;
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.warn("Warning: Missing MONGODB_URI or JWT_SECRET in environment variables.");
}

// Start listening immediately on 0.0.0.0 so hosting providers can verify health
app.listen(port, "0.0.0.0", () => {
  console.log(`Sportio Hub API running on http://0.0.0.0:${port}`);
});

// Connect to MongoDB with timeout and automatic retry
async function connectDB() {
  if (!process.env.MONGODB_URI) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("Tip: Add 0.0.0.0/0 to MongoDB Atlas Network Access whitelist.");
    setTimeout(connectDB, 10000);
  }
}

connectDB();
