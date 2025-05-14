import { contactUsEmail } from "../../utils/contact-us-email.js";

export async function contactUsMessageController(req, res, next) {
  try {
    const { name, email, subject, message } = req.body; // ✅ directly from req.body
    const contactUsEmailResponse = await contactUsEmail({
      name,
      email,
      subject: subject || "", // fallback to empty string if undefined
      message,
    });
    if (contactUsEmailResponse.success !== true) {
      throw new Error("Email not sent");
    }

    res.status(200).json({
      success: true,
      message: "Contact form submitted successfully",
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
}
