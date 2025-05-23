import path from "path";
import ejs from "ejs";
import juice from "juice";
import { fileURLToPath } from "url";
import { generateMicrosoftAccess_Token } from "./generate_microsoft_api_token.js";
import { resolveTemplatePath } from "./resolveTemplatePath.js";
import { sendGraphEmail } from "./sendGraphEmail.js";

export async function contactUsEmail({ name, email, subject, message }) {
  try {
    const templatePath = resolveTemplatePath("contact-us-email-template.ejs");

    let html;
    try {
      html = await ejs.renderFile(templatePath, {
        name,
        subject,
        message,
        email,
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
      "New Contact Form Submission",
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
