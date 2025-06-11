import { getImagePath } from "../../utils/getImagePath.js";
import { resolveTemplatePath } from "../../utils/resolveTemplatePath.js";
import { sendGraphEmail } from "../../utils/sendGraphEmail.js";
import ejs from "ejs";
import juice from "juice";

export async function clientRequestController(req, res, next) {
  try {
    const {
      companyName,
      numberOfEmployees,
      companyEmail,

      message,
    } = req.body;
    if (!companyName || !numberOfEmployees || !companyEmail) {
      throw new Error("Please fill all the required fields");
    }
    const templatePath = resolveTemplatePath(
      "client-request-email-template.ejs"
    );
    let html;
    const logoPath = getImagePath();
    console.log("client Request logo", logoPath);
    try {
      html = await ejs.renderFile(templatePath, {
        companyName,
        numberOfEmployees,
        companyEmail,

        message,

        logoPath,
      });
    } catch (templateError) {
      throw new Error("Error Receiving Your Request Please Try Again Later");
    }
    const inlinedHtml = juice(html);
    const emailResult = await sendGraphEmail(
      "New Client Request Submission",
      inlinedHtml,
      process.env.BIGHIL_EMAIL_ID
    );
    if (!emailResult.success) {
      throw new Error("Email not sent");
    }

    res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    next(error);
  }
}
