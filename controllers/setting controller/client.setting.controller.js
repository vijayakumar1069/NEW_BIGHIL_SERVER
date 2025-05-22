import companyAdminSchema from "../../schema/company.admin.schema.js";
import { generateOtp, generateOtpExpiry } from "../../utils/otpHelperFun.js";
import { sendOtpEmail } from "../../utils/send_welcome_email.js";

export async function getCurrentClientSettingInfo(req, res, next) {
  try {
    const { id, role } = req.user;
    if (!id || !role) {
      throw new Error("User not found");
    }
    const currentClient = await companyAdminSchema
      .findById(id)
      .select("-password");

    if (!currentClient) {
      throw new Error("Client not found");
    }
    res.status(200).json({
      success: true,
      message: "Client setting fetched successfully",
      data: currentClient,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateClientSetting(req, res, next) {
  try {
    const { id, role } = req.user;

    if (!id || !role) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user." });
    }

    const { isTwoFactorEnabled } = req.body;
    console.log("isTwoFactorEnabled:", isTwoFactorEnabled);

    // Optional: Validate type
    if (typeof isTwoFactorEnabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "`isTwoFactorEnabled` must be a boolean.",
      });
    }

    // Step 1: Find admin
    const admin = await companyAdminSchema.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }

    let updatePayload = {};

    if (isTwoFactorEnabled) {
      const otp = generateOtp();
      const expiryTime = generateOtpExpiry();

      // Send OTP via email
      const emailResult = await sendOtpEmail({
        email: admin.email,
        userName: admin.name,
        otp,
        subject: "Two Factor Authentication",
      });

      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: emailResult.message || "Failed to send OTP email.",
        });
      }

      updatePayload = {
        twoFactorSecret: otp,
        twoFactorSecretExpiry: expiryTime,
        twoFactorVerifiedAt: new Date(),
      };
    } else {
      updatePayload = {
        twoFactorSecret: null,
        twoFactorSecretExpiry: null,
        twoFactorVerifiedAt: null,
        isTwoFactorEnabled: false,
      };
    }

    // Step 2: Update user
    const updatedAdmin = await companyAdminSchema.findByIdAndUpdate(
      id,
      updatePayload,
      {
        new: true,
      }
    );

    if (!updatedAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Failed to update settings." });
    }

    res.status(200).json({
      success: true,
      message: isTwoFactorEnabled
        ? "Otp sent successfully."
        : "2FA disabled successfully.",
      data: {
        name: updatedAdmin.name,
        email: updatedAdmin.email,
       
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verify2fa(req, res, next) {
  try {
    const { id, role } = req.user;
    if (!id || !role) {
      throw new Error("User not found");
    }
    const admin = await companyAdminSchema.findById(id);
    if (!admin) {
      throw new Error("Admin not found.");
    }
    console.log("req.body:", req.body);
    const { code } = req.body;
    console.log("OTP received:", code);
    if (!code) {
      throw new Error("OTP is required.");
    }
    if (code !== admin.twoFactorSecret) {
      throw new Error("Invalid OTP.");
    }
    const expiryTime = admin.twoFactorSecretExpiry;
    if (expiryTime < new Date()) {
      throw new Error("OTP expired.");
    }
    admin.twoFactorVerifiedAt = new Date();
    admin.isTwoFactorEnabled = true;
    await admin.save();
    res.status(200).json({
      success: true,
      message: "2FA verified successfully.",
      data: {
        name: admin.name,
        email: admin.email,
        twoFactorEnabled: true,
      },
    });
  } catch (error) {
    next(error);
  }
}
