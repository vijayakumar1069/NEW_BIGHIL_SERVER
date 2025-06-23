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

export async function sendOtpEmail({
  email,
  userName,
  otp,
  subject,
  logoPath,
}) {
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
export async function userLoginOtpEmail({
  email,
  userName,
  otp,
  subject = "SignUp OTP",
  logoPath = getImagePath(),
}) {
  try {
    const templatePath = resolveTemplatePath(
      "user-login-otp-email-template.ejs"
    );
    const html = await ejs.renderFile(templatePath, {
      userName,
      email,
      otp,
      logoPath,
    });

    const inlinedHtml = juice(html);
    return await sendGraphEmail(subject, inlinedHtml, email);
  } catch (error) {
    console.error("Error in sendOtp function:", error);
    return {
      success: false,
      status: 500,
      message: "An error occurred while sending the login OTP email",
    };
  }
}

export async function complaintAddedEmail({
  userName,
  email,
  complaintId,
  logoPath,
  redirectLink,
  supportEmail,
  subject = "Complaint Added Successfully",
}) {
  try {
    const templatePath = resolveTemplatePath("complaint-added-email-user.ejs");
    const html = await ejs.renderFile(templatePath, {
      userName,
      email,
      complaintId,
      logoPath,
      redirectLink,
      supportEmail,
    });

    const inlinedHtml = juice(html);
    return await sendGraphEmail(subject, inlinedHtml, email);
  } catch (error) {
    console.error("Error in complaintAddedEmail function:", error);
    return {
      success: false,
      status: 500,
      message: "An error occurred while sending the complaint added email",
    };
  }
}
export async function complaintReceivedEmail({
  role,
  email,
  complaintId,
  logoPath,
  redirectLink,
  supportEmail,
  subject = "Complaint Received Successfully",
}) {
  try {
    const templatePath = resolveTemplatePath("complaint-received-email.ejs");
    const html = await ejs.renderFile(templatePath, {
      role,
      email,
      complaintId,
      logoPath,
      redirectLink,
      supportEmail,
    });

    const inlinedHtml = juice(html);
    return await sendGraphEmail(subject, inlinedHtml, email);
  } catch (error) {
    console.error("Error in complaintReceivedEmail function:", error);
    return {
      success: false,
      status: 500,
      message: "An error occurred while sending the complaint received email",
    };
  }
}
export async function userAccountDeleteEmail({
  email,
  userName,
  subject = "Account Deleted - BIGHIL",
  logoPath,
  supportEmail,
  signUpLink,
}) {
  try {
    const templatePath = resolveTemplatePath(
      "user-account-delete-template.ejs"
    );
    const html = await ejs.renderFile(templatePath, {
      userName,
      email,
      logoPath,
      supportEmail,
      signUpLink,
    });

    const inlinedHtml = juice(html);
    return await sendGraphEmail(subject, inlinedHtml, email);
  } catch (error) {
    console.error("Error in userAccountDeleteEmail function:", error);
    return {
      success: false,
      status: 500,
      message: "An error occurred while sending the account delete email",
    };
  }
}
