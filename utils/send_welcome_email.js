import ejs from "ejs";

import juice from "juice";
import { resolveTemplatePath } from "./resolveTemplatePath.js";
import { sendGraphEmail } from "./sendGraphEmail.js";
import { getImagePath } from "./getImagePath.js";
import { getBaseClientUrl } from "./getBaseClientUrl.js";

export async function WelcomeEmailSendFunction({
  name,
  email,
  password,
  role,
}) {
  try {
    const templatePath = resolveTemplatePath("welcome-email.ejs");
    const logoPath = getImagePath();
    const clientLoginLink = `${getBaseClientUrl()}/client/client-login`;
    console.log(logoPath)
    const html = await ejs.renderFile(templatePath, {
      name,
      email,
      password,
      role,
      logoPath,
      clientLoginLink,
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

export async function sendOtpEmail({ email, userName, otp, subject, logoPath }) {
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
      logoPath,
    });
    console.log("logo", logoPath);
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
