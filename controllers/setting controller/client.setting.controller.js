import companyAdminSchema from "../../schema/company.admin.schema.js";

import { setupTwoFactorForAdmin } from "../../utils/setupTwoFactorForAdmin.js";
import jwt from "jsonwebtoken";
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
      const result = await setupTwoFactorForAdmin(admin);
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.message || "Failed to send OTP email.",
        });
      }
      updatePayload = result.otpPayload;
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

    const { code } = req.body;
   
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

export async function loginTwoFactorVerification(req, res, next) {
  try {
    const { email, code } = req.body;
    const admin = await companyAdminSchema.findOne({ email });
    if (!admin) {
      throw new Error("Admin not found.");
    }

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
    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role,
        email: admin.email,
        name: admin.name,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    await admin.save();
    return res.status(200).json({
      success: true,
      message: "Verification successful",
      token,
      user: {
        id: admin._id,
        role: admin.role,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    next(error);
  }
}
