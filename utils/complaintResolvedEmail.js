import path from "path";
import { generateMicrosoftAccess_Token } from "./generate_microsoft_api_token.js";
import juice from "juice";
import { fileURLToPath } from "url";
import ejs from "ejs";
import { resolveTemplatePath } from "./resolveTemplatePath.js";
import { sendGraphEmail } from "./sendGraphEmail.js";

export async function complaintResolvedEmail({
  email,
  userName,
  complaintId,
  complaintStatus,
  redirectLink,
  resolutionNote,
  acknowledgements,
  logoPath,
}) {
  try {
    const templatePath = resolveTemplatePath(
      "complaint_resolved_email_template.ejs"
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
        logoPath
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
    return await sendGraphEmail(
      "Complaint Status Update - Bighil Platform",
      inlinedHtml,
      process.env.BIGHIL_EMAIL_ID
    );
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
