import path from "path";
import { generateMicrosoftAccess_Token } from "./generate_microsoft_api_token.js";
import juice from "juice";
import { fileURLToPath } from "url";
import ejs from "ejs";

export async function complaintResolvedEmail({
  email,
  userName,
  complaintId,
  complaintStatus,
  redirectLink,
  resolutionNote,
  acknowledgements,
}) {
  try {
    const token = await generateMicrosoftAccess_Token();

    if (!token || !token.token) {
      console.error("Token generation failed or token is missing");
      return {
        success: false,
        status: 500,
        message: "Failed to retrieve email access token from Microsoft API",
      };
    }

    // Resolve path to template
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.join(
      __dirname,
      "../email templates/complaint_resolved_email_template.ejs"
    );

    let html;

    try {
      html = await ejs.renderFile(templatePath, {
        userName,
        email,
        complaintId,
        complaintStatus,
        redirectLink,
        resolutionNote,
        acknowledgements,
      });
    } catch (templateError) {
      console.error("Failed to render EJS template:", templateError);
      return {
        success: false,
        status: 500,
        message: "Failed to generate email content from template",
      };
    }

    const inlinedHtml = juice(html);

    const emailBody = {
      message: {
        subject: "Complaint Status Update - Bighil Platform",
        body: {
          contentType: "HTML",
          content: inlinedHtml,
        },
        toRecipients: [
          {
            emailAddress: {
              address: email,
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
      const responseText = await response.text();
      console.error(
        "Failed to send complaint status update email:",
        response.statusText,
        responseText
      );
      return {
        success: false,
        status: response.status,
        message: `Failed to send complaint status update email. Status: ${response.statusText}`,
      };
    }

    return {
      success: true,
      status: 200,
      message: "Complaint status update email sent successfully",
    };
  } catch (error) {
    console.error(
      "Unexpected error while sending complaint status email:",
      error
    );
    return {
      success: false,
      status: 500,
      message:
        "An unexpected error occurred while sending the complaint status update email",
    };
  }
}
