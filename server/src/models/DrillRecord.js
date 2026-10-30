import mongoose from "mongoose";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const drillRecordSchema = new mongoose.Schema(
  {
    athleteId: { type: String, required: true },
    athleteName: { type: String, required: true },
    athleteEmail: { type: String, required: true },
    drillType: { type: String, required: true },
    metric: { type: String, required: true },
    score: { type: Number, required: true },
    unit: { type: String, default: "score" },
    status: {
      type: String,
      enum: ["self-declared", "pending", "verified"],
      default: "pending",
    },
    attemptsUsed: { type: Number, default: 1, min: 1, max: 10 },
    maxRetries: { type: Number, default: 3 },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      placeName: { type: String, default: "GPS Verified Field" },
    },
    capturedAt: { type: Date, default: Date.now },
    mediaSnapshot: { type: String }, // Base64 data URL preview of camera capture
    notes: { type: String, default: "" },
    verifiedBy: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
    verifiedAt: { type: Date },
    verificationNotes: { type: String, default: "" },
    metadata: {
      device: { type: String, default: "Web Mobile/Desktop" },
      isLiveCaptured: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const MongooseDrillRecord = mongoose.model("DrillRecord", drillRecordSchema);

// Fallback in-memory / file-based storage when MongoDB Atlas is offline
const storageFile = process.env.VERCEL
  ? path.join("/tmp", "sportio_drills.json")
  : path.resolve(process.cwd(), "local_drill_records.json");

let memoryDrills = [];
try {
  if (fs.existsSync(storageFile)) {
    memoryDrills = JSON.parse(fs.readFileSync(storageFile, "utf8"));
  }
} catch {
  memoryDrills = [];
}

// Initial seed if empty
if (memoryDrills.length === 0) {
  memoryDrills = [
    {
      _id: "demo-drill-1",
      athleteId: "athlete-demo-1",
      athleteName: "Alex Rivera",
      athleteEmail: "alex.rivera@example.com",
      drillType: "100m Sprint",
      metric: "11.24 s",
      score: 11.24,
      unit: "seconds",
      status: "pending",
      attemptsUsed: 2,
      maxRetries: 3,
      location: {
        latitude: 13.0827,
        longitude: 80.2707,
        accuracy: 3.8,
        placeName: "Regional Athletic Stadium",
      },
      capturedAt: new Date(Date.now() - 3600000).toISOString(),
      mediaSnapshot: "",
      notes: "Clear weather, track lane 4. Captured via guided live camera.",
      verifiedBy: null,
      verifiedAt: null,
      verificationNotes: "",
      metadata: { device: "Mobile Camera (Guided)", isLiveCaptured: true },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: "demo-drill-2",
      athleteId: "athlete-demo-2",
      athleteName: "Priya Sharma",
      athleteEmail: "priya.sharma@example.com",
      drillType: "Agility 5-10-5 Shuttle",
      metric: "4.48 s",
      score: 4.48,
      unit: "seconds",
      status: "verified",
      attemptsUsed: 1,
      maxRetries: 3,
      location: {
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 4.2,
        placeName: "State Sports Complex",
      },
      capturedAt: new Date(Date.now() - 86400000).toISOString(),
      mediaSnapshot: "",
      notes: "Clean cone touch, rapid directional change.",
      verifiedBy: {
        id: "coach-1",
        name: "Coach Marcus Vance",
        role: "coach",
      },
      verifiedAt: new Date(Date.now() - 82000000).toISOString(),
      verificationNotes: "Excellent form and foot placement. Video confirmed.",
      metadata: { device: "Mobile Camera (Guided)", isLiveCaptured: true },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 82000000).toISOString(),
    },
    {
      _id: "demo-drill-3",
      athleteId: "athlete-demo-3",
      athleteName: "Liam Chen",
      athleteEmail: "liam.chen@example.com",
      drillType: "Vertical Jump",
      metric: "68 cm",
      score: 68,
      unit: "cm",
      status: "self-declared",
      attemptsUsed: 3,
      maxRetries: 3,
      location: {
        latitude: 13.0451,
        longitude: 80.2214,
        accuracy: 12.0,
        placeName: "Local Community Gym",
      },
      capturedAt: new Date(Date.now() - 172800000).toISOString(),
      mediaSnapshot: "",
      notes: "Measured on jump mat.",
      verifiedBy: null,
      verifiedAt: null,
      verificationNotes: "",
      metadata: { device: "Manual / Self-Reported", isLiveCaptured: false },
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];
  try {
    fs.writeFileSync(storageFile, JSON.stringify(memoryDrills, null, 2));
  } catch {}
}

function persist() {
  try {
    fs.writeFileSync(storageFile, JSON.stringify(memoryDrills, null, 2));
  } catch {}
}

class FallbackDrillRecord {
  constructor(doc) {
    this._id = doc._id || crypto.randomUUID();
    this.athleteId = doc.athleteId;
    this.athleteName = doc.athleteName;
    this.athleteEmail = doc.athleteEmail;
    this.drillType = doc.drillType;
    this.metric = doc.metric;
    this.score = Number(doc.score) || 0;
    this.unit = doc.unit || "score";
    this.status = doc.status || "pending";
    this.attemptsUsed = Number(doc.attemptsUsed) || 1;
    this.maxRetries = Number(doc.maxRetries) || 3;
    this.location = doc.location || {};
    this.capturedAt = doc.capturedAt ? new Date(doc.capturedAt) : new Date();
    this.mediaSnapshot = doc.mediaSnapshot || "";
    this.notes = doc.notes || "";
    this.verifiedBy = doc.verifiedBy || null;
    this.verifiedAt = doc.verifiedAt ? new Date(doc.verifiedAt) : null;
    this.verificationNotes = doc.verificationNotes || "";
    this.metadata = doc.metadata || { isLiveCaptured: true };
    this.createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date();
    this.updatedAt = new Date();
  }

  async save() {
    this.updatedAt = new Date();
    const idx = memoryDrills.findIndex((d) => d._id === this._id);
    if (idx >= 0) {
      memoryDrills[idx] = this;
    } else {
      memoryDrills.unshift(this);
    }
    persist();
    return this;
  }

  static async find(query = {}) {
    if (mongoose.connection.readyState === 1) {
      return MongooseDrillRecord.find(query).sort({ createdAt: -1 });
    }
    let list = [...memoryDrills];
    if (query.athleteId) {
      list = list.filter((d) => d.athleteId === query.athleteId);
    }
    if (query.status && query.status !== "all") {
      list = list.filter((d) => d.status === query.status);
    }
    return list.map((d) => new FallbackDrillRecord(d));
  }

  static async findById(id) {
    if (mongoose.connection.readyState === 1) {
      return MongooseDrillRecord.findById(id);
    }
    const match = memoryDrills.find((d) => String(d._id) === String(id));
    return match ? new FallbackDrillRecord(match) : null;
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    if (mongoose.connection.readyState === 1) {
      return MongooseDrillRecord.findByIdAndUpdate(id, update, options);
    }
    const idx = memoryDrills.findIndex((d) => String(d._id) === String(id));
    if (idx === -1) return null;
    const current = memoryDrills[idx];
    const updated = {
      ...current,
      ...update,
      updatedAt: new Date(),
    };
    memoryDrills[idx] = updated;
    persist();
    return new FallbackDrillRecord(updated);
  }
}

const DrillRecordProxy = new Proxy(MongooseDrillRecord, {
  construct(_target, args) {
    if (mongoose.connection.readyState === 1) {
      return new MongooseDrillRecord(...args);
    }
    return new FallbackDrillRecord(...args);
  },
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return target[prop];
    }
    if (prop === "find") return FallbackDrillRecord.find;
    if (prop === "findById") return FallbackDrillRecord.findById;
    if (prop === "findByIdAndUpdate") return FallbackDrillRecord.findByIdAndUpdate;
    return target[prop];
  },
});

export default DrillRecordProxy;
