import mongoose from "mongoose";

const bighilAdminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,

      default: "BIGHIL",
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.models?.bighilAdmin ||
  mongoose.model("bighilAdmin", bighilAdminSchema);
