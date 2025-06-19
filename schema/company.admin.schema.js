import mongoose from "mongoose";
const companyAdminSchema = new mongoose.Schema(
  {
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
      type: String, // Store the generated OTP
    },
    otpExpiry: {
      type: Date, // Store when the OTP will expire
    },
    resetToken: {
      type: String, // Token for validating secure password resets
    },
    isResetActive: {
      type: Boolean, // To track if a reset process is ongoing
      default: false,
    },
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },
    emailNotificaion: {
      type: Boolean,
      default: false,
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

    twoFactorVerifiedAt: {
      type: Date,
    },
    disableStatus: {
      type: Boolean,
      default: false,
    },
    currentLoginsCount: {
      type: Number,
      default: 0,
    },
    rememberMe: {
      type: Boolean,
      default: false,
    },
    rememberMeExpiry: {
      type: Date,
    },
    currentDevice: {
      type: String,
    },
    previousDevice: {
      type: String,
    },
    // New field for session management
    lastActivityTime: {
      type: Date,
      default: null,
    },
    isCurrentlyLoggedIn: {
      type: Boolean,
      default: false,
    },
    currentSessionId: {
      type: String,
      default: null,
    },
    sessionExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt fields
  }
);

export default mongoose.models?.companyAdmin ||
  mongoose.model("companyAdmin", companyAdminSchema);
