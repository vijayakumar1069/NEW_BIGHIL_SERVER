import crypto from "crypto";

export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

export const generateOtpExpiry = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30); // Set expiry time to now + 30 minutes
  return now;
};
