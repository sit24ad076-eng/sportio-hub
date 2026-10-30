import mongoose from "mongoose";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["athlete", "coach", "institution"], default: "athlete" },
    emailVerified: { type: Boolean, default: false },
    otpHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpLastSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const MongooseUser = mongoose.model("User", userSchema);

// Fallback in-memory / file-based storage when MongoDB Atlas is offline or blocked by firewall
const storageFile = process.env.VERCEL
  ? path.join("/tmp", "sportio_users.json")
  : path.resolve(process.cwd(), "local_users.json");

let memoryUsers = [];
try {
  if (fs.existsSync(storageFile)) {
    memoryUsers = JSON.parse(fs.readFileSync(storageFile, "utf8"));
  }
} catch {
  memoryUsers = [];
}

function persist() {
  try {
    fs.writeFileSync(storageFile, JSON.stringify(memoryUsers, null, 2));
  } catch {
    // Ignore write error
  }
}

class FallbackUser {
  constructor(doc) {
    this._id = doc._id || crypto.randomUUID();
    this.name = doc.name;
    this.email = doc.email;
    this.passwordHash = doc.passwordHash;
    this.role = doc.role || "athlete";
    this.emailVerified = doc.emailVerified || false;
    this.otpHash = doc.otpHash || null;
    this.otpExpiresAt = doc.otpExpiresAt ? new Date(doc.otpExpiresAt) : null;
    this.otpLastSentAt = doc.otpLastSentAt ? new Date(doc.otpLastSentAt) : null;
    this.createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date();
    this.updatedAt = new Date();
  }

  async save() {
    this.updatedAt = new Date();
    const idx = memoryUsers.findIndex((u) => u._id === this._id || u.email.toLowerCase() === this.email.toLowerCase());
    if (idx >= 0) {
      memoryUsers[idx] = this;
    } else {
      memoryUsers.push(this);
    }
    persist();
    return this;
  }

  static async findOne(query) {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.findOne(query);
    }
    const match = memoryUsers.find((u) => {
      if (query.email && u.email.toLowerCase() !== String(query.email).toLowerCase()) return false;
      if (query._id && u._id !== query._id) return false;
      return true;
    });
    return match ? new FallbackUser(match) : null;
  }

  static async findById(id) {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.findById(id);
    }
    const match = memoryUsers.find((u) => String(u._id) === String(id));
    if (!match) return { select: () => null };
    const user = new FallbackUser(match);
    return {
      select: () => user,
    };
  }
}

const UserProxy = new Proxy(MongooseUser, {
  construct(_target, args) {
    if (mongoose.connection.readyState === 1) {
      return new MongooseUser(...args);
    }
    return new FallbackUser(...args);
  },
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return target[prop];
    }
    if (prop === "findOne") return FallbackUser.findOne;
    if (prop === "findById") return FallbackUser.findById;
    return target[prop];
  },
});

export default UserProxy;
