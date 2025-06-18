import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },

    role: {
      type: String,
      required: true,
      enum: ["user"],
      default: "user",
    },
    loginOtp: {
      type: String,
    },
    loginOtpExpiry: {
      type: Date,
      default: Date.now,
    },

    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },

    isResetActive: {
      type: Boolean,
      default: false,
    },
    lastActive: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Defensive model export to avoid overwrite in dev
export default mongoose.models.User || mongoose.model("User", userSchema);
