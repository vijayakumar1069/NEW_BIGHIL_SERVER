
import ejs from "ejs";

import juice from "juice";
import { resolveTemplatePath } from "./resolveTemplatePath.js";
import { sendGraphEmail } from "./sendGraphEmail.js";

export async function WelcomeEmailSendFunction({
  name,
  email,
  password,
  role,
}) {
  try {
    const templatePath = resolveTemplatePath("welcome-email.ejs");

    const html = await ejs.renderFile(templatePath, {
      name,
      email,
      password,
      role,
    });
    const inlinedHtml = juice(html);
    return await sendGraphEmail("Welcome to Bighil", inlinedHtml, email);
  } catch (error) {
    console.error("Error in sendOtp function:", error);
    return {
      status: 500,
      message: "An error occurred while sending the password reset email",
    };
  }
}

export async function sendOtpEmail({ email, userName, otp, subject }) {
  try {
    const templatePath = resolveTemplatePath(
      subject == "Password Reset OTP"
        ? "sendOtp.ejs"
        : "two-fa-otp-email-template.ejs"
    );
    const html = await ejs.renderFile(templatePath, {
      userName,
      email,
      otp,
    });
    const inlinedHtml = juice(html);
    return await sendGraphEmail(subject, inlinedHtml, email);
  } catch (error) {
    console.error("Error in sendOtp function:", error);
    return {
      success: false,
      status: 500,
      message: "An error occurred while sending the password reset email",
    };
  }
}
