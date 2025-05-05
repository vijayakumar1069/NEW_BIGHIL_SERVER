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
export default mongoose.models.userSchema || mongoose.model("USER", userSchema);
