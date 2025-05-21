import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    role: {
      type: String,
      required: true,
      enum: ["user"],
      default: "user",
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
    lastActive: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // ✅ New fields
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },

    notificationHidden: {
      type: Boolean,
      default: false,
    },
    defaultCompany: {
      type: String,
      default: "",
    },
    defaultComplaintType: {
      type: String,
      enum: ["Anonymous", "Non-Anonymous"],
      default: "Anonymous",
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Defensive model export to avoid overwrite in dev
export default mongoose.models.User || mongoose.model("User", userSchema);
