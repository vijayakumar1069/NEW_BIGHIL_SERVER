import { generateMicrosoftAccess_Token } from "./generate_microsoft_api_token.js";

import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import juice from "juice";

export async function WelcomeEmailSendFunction({
  name,
  email,
  password,
  role,
}) {
  try {
    const token = await generateMicrosoftAccess_Token();

    if (!token || !token.token) {
      return {
        status: 500,
        message: "Failed to retrieve email access token",
      };
    }
    // Create __dirname equivalent
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.join(
      __dirname,
      "../email templates/welcome-email.ejs"
    );
    const html = await ejs.renderFile(templatePath, {
      name,
      email,
      password,
      role,
    });
    const inlinedHtml = juice(html);
    const emailBody = {
      message: {
        subject: "Welcome to Bighil",
        body: {
          contentType: "HTML",
          content: inlinedHtml,
        },
        toRecipients: [
          {
            emailAddress: {
              address: email, // Using the provided email
            },
          },
        ],
      },
      saveToSentItems: false,
    };
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${process.env.OBJECT_ID}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailBody),
      }
    );
    if (!response.ok) {
      console.error(
        "Failed to send password reset email:",
        response.statusText
      );
      return {
        status: 500,
        message: "Failed to send password reset email",
      };
    }
    return {
      status: 200,
      message: "Password reset email sent successfully",
    };
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
    const token = await generateMicrosoftAccess_Token();

    if (!token || !token.token) {
      return {
        status: 500,
        message: "Failed to retrieve email access token",
      };
    }
    // Create __dirname equivalent
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.join(
      __dirname,
      subject == "Password Reset OTP"
        ? "../email templates/sendOtp.ejs"
        : "../email templates/two-fa-otp-email-template.ejs"
    );
    const html = await ejs.renderFile(templatePath, {
      userName,
      email,
      otp,
    });
    const inlinedHtml = juice(html);
    const emailBody = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: inlinedHtml,
        },
        toRecipients: [
          {
            emailAddress: {
              address: email, // Using the provided email
            },
          },
        ],
      },
      saveToSentItems: false,
    };
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${process.env.OBJECT_ID}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailBody),
      }
    );
    if (!response.ok) {
      console.error(
        "Failed to send password reset email:",
        response.statusText
      );
      return {
        success: false,
        status: 500,
        message: "Failed to send password reset email",
      };
    }
    return {
      success: true,
      status: 200,
      message: "Password reset email sent successfully",
    };
  } catch (error) {
    console.error("Error in sendOtp function:", error);
    return {
      success: false,
      status: 500,
      message: "An error occurred while sending the password reset email",
    };
  }
}
