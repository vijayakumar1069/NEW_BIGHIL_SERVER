import accountDeleteSchema from "../../schema/accountDeleteSchema.js";
import userSchema from "../../schema/user.schema.js";
import { getBaseClientUrl } from "../../utils/getBaseClientUrl.js";
import { getImagePath } from "../../utils/getImagePath.js";
import { userAccountDeleteEmail } from "../../utils/send_welcome_email.js";

export async function userAccountDelete(req, res, next) {
  try {
    const { id } = req.user;
    const { reasons, comments } = req.body;

    // 1. Validate reasons
    if (!Array.isArray(reasons) || reasons.length === 0) {
      const error = new Error(
        "Please select at least one reason for deletion."
      );
      error.status = 400;
      throw error;
    }

    // 2. Find user
    const user = await userSchema.findById(id);
    if (!user) {
      const error = new Error(
        "User account not found. It may have already been deleted."
      );
      error.status = 404;
      throw error;
    }

    // 3. Save deletion reason in accountDeleteSchema
    try {
      await accountDeleteSchema.create({
        userId: id,
        reason: reasons,
        additionalComments: comments || "",
      });
    } catch (saveError) {
      const error = new Error("Failed to record account deletion reason.");
      error.status = 500;
      throw error;
    }

    // 4. Send deletion email
    const logoPath = getImagePath();
    const supportEmail = process.env.SUPPORT_EMAIL || "support@yourdomain.com";
    const signUpLink = `${getBaseClientUrl()}/user/user-register`;

    const emailResult = await userAccountDeleteEmail({
      email: user.email,
      userName: user.name,
      subject: "Account Deleted - BIGHIL",
      logoPath,
      supportEmail,
      signUpLink,
    });

    if (!emailResult.success) {
      console.warn("Account deletion email failed:", emailResult.message);
      // You can choose whether or not to block the deletion here
      // If blocking, uncomment below:
      const error = new Error("Failed to send confirmation email.");
      error.status = 500;
      throw error;
    }

    // 5. Delete user account
    const deleted = await userSchema.findByIdAndDelete(id);
    if (!deleted) {
      const error = new Error("Failed to delete user account.");
      error.status = 500;
      throw error;
    }

    // 6. Respond success
    return res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch (error) {
    console.error("Account Deletion Error:", error.message || error);
    next(error);
  }
}
