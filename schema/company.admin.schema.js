import mongoose from "mongoose";

const deviceSessionSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
  },
  deviceName: {
    type: String,
    required: true,
  },
  deviceType: {
    type: String,
    enum: ["desktop", "mobile", "tablet"],
    required: true,
  },
  browser: {
    type: String,
    required: true,
  },
  os: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  location: {
    city: String,
    country: String,
    region: String,
  },
  isRemembered: {
    type: Boolean,
    default: false,
  },
  rememberedAt: {
    type: Date,
  },
  rememberExpiresAt: {
    type: Date,
  },
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  jwtToken: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const companyAdminSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "companySchema",
  },
  role: {
    type: String,
    required: true,
    enum: ["SUPER ADMIN", "ADMIN", "SUB ADMIN"],
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  otp: {
    type: String,
  },
  otpExpiry: {
    type: Date,
  },
  resetToken: {
    type: String,
  },
  isResetActive: {
    type: Boolean,
    default: false,
  },
  theme: {
    type: String,
    enum: ["light", "dark"],
    default: "light",
  },
  isTwoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
  },
  twoFactorSecretExpiry: {
    type: Date,
  },
  backupCodes: {
    type: [String],
  },
  twoFactorVerifiedAt: {
    type: Date,
  },
  disableStatus: {
    type: Boolean,
    default: false,
  },
  // New fields for device management
  deviceSessions: [deviceSessionSchema],
  maxConcurrentSessions: {
    type: Number,
    default: 1, // Allow max 1 concurrent sessions
  },
  lastLoginDevice: {
    type: String, // Device ID of last login
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
  },
});

// Index for better performance
companyAdminSchema.index({ email: 1 });
companyAdminSchema.index({ "deviceSessions.deviceId": 1 });
companyAdminSchema.index({ "deviceSessions.isActive": 1 });

// Virtual for checking if account is locked
companyAdminSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

export default mongoose.models?.companyAdmin ||
  mongoose.model("companyAdmin", companyAdminSchema);
