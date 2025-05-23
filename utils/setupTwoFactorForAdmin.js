import { getImagePath } from "./getImagePath.js";
import { generateOtp, generateOtpExpiry } from "./otpHelperFun.js";
import { sendOtpEmail } from "./send_welcome_email.js";

export async function setupTwoFactorForAdmin(admin) {
  const otp = generateOtp();
  const expiryTime = generateOtpExpiry();
  const logoPath = getImagePath();

  const emailResult = await sendOtpEmail({
    email: admin.email,
    userName: admin.name,
    otp,
    subject: "Two Factor Authentication",
    logoPath,
  });

  if (!emailResult.success) {
    return { success: false, message: emailResult.message };
  }

  return {
    success: true,
    otpPayload: {
      twoFactorSecret: otp,
      twoFactorSecretExpiry: expiryTime,
      twoFactorVerifiedAt: new Date(),
    },
  };
}