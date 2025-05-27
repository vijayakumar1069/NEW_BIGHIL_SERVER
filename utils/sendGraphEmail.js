import fetch from "node-fetch"; // optional if using native fetch
import { generateMicrosoftAccess_Token } from "./generate_microsoft_api_token.js";

export async function sendGraphEmail(subject, htmlContent, toEmails) {
  try {
    const token = await generateMicrosoftAccess_Token();

    if (!token?.token) {
      console.error("Microsoft access token is missing or invalid");
      return {
        success: false,
        status: 500,
        message: "Failed to generate Microsoft API access token",
      };
    }

    const recipients = (Array.isArray(toEmails) ? toEmails : [toEmails]).map(
      (email) => ({
        emailAddress: { address: email },
      })
    );
    console.log("Sending email to:", recipients);

    const emailBody = {
      message: {
        subject,
        body: {
          contentType: "HTML",
          content: htmlContent,
        },
        toRecipients: recipients,
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
      const responseText = await response.text();
      console.error("Email send failed:", response.statusText, responseText);
      return {
        success: false,
        status: response.status,
        message: `Microsoft Graph email send failed: ${response.statusText}`,
      };
    }

    return {
      success: true,
      status: 200,
      message: "Email sent successfully ",
    };
  } catch (error) {
    console.error("Unexpected error in sendGraphEmail:", error);
    return {
      success: false,
      status: 500,
      message: "Unexpected error while sending email ",
    };
  }
}
