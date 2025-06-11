import juice from "juice";
import ejs from "ejs";
import { sendGraphEmail } from "./sendGraphEmail.js";
import { resolveTemplatePath } from "./resolveTemplatePath.js";

export async function complaint_Status_Change_email({
  email,
  userName,
  complaintId,
  complaintStatus,
  logoPath,
  redirectLink,
}) {
  try {
    const templatePath = resolveTemplatePath("status-update-email.ejs");
    console.log("complaint status changed ", logoPath);
    let html;
    try {
      html = await ejs.renderFile(templatePath, {
        userName,
        email,
        complaintId,
        complaintStatus,
        logoPath,
        redirectLink,
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
    return sendGraphEmail(
      "Complaint Status Update - Bighil Platform",
      inlinedHtml,
      email
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
