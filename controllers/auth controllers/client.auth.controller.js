import companyAdminSchema from "../../schema/company.admin.schema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { setupTwoFactorForAdmin } from "../../utils/setupTwoFactorForAdmin.js";
export async function clientLoginFunction(req, res, next) {
  try {
    const { email, password } = req.body;

    const clientAdmin = await companyAdminSchema.findOne({ email: email });

    if (!clientAdmin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, clientAdmin.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    // If 2FA is enabled, send OTP and return success WITHOUT token
    if (clientAdmin.isTwoFactorEnabled) {
      const result = await setupTwoFactorForAdmin(clientAdmin);
      if (!result.success) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to send OTP email." });
      }
      // Update the clientAdmin with the OTP payload
      await companyAdminSchema.findByIdAndUpdate(
        clientAdmin._id,
        {
          twoFactorSecret: result.otpPayload.twoFactorSecret,
          twoFactorSecretExpiry: result.otpPayload.twoFactorSecretExpiry,
          twoFactorVerifiedAt: result.otpPayload.twoFactorVerifiedAt,
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "OTP sent to registered email.",
        requiresTwoFactor: true,
      });
    }

    // If 2FA is not enabled, proceed to generate token
    const token = jwt.sign(
      {
        id: clientAdmin._id,
        role: clientAdmin.role,
        email: clientAdmin.email,
        name: clientAdmin.name,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: clientAdmin._id,
        role: clientAdmin.role,
        email: clientAdmin.email,
        name: clientAdmin.name,
      },
      token,
      requiresTwoFactor: false,
    });
  } catch (error) {
    next(error);
  }
}

export async function clientLogoutFunction(req, res, next) {
  try {
    // Clear the access token cookie
    res.clearCookie("access_token");
    res.status(200).json({
      message: "Logout successful",
      success: true,
    });
  } catch (error) {
    next(error);
  }
}
