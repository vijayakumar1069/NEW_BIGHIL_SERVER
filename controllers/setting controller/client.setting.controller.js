import companyAdminSchema from "../../schema/company.admin.schema.js";
import { getCurrentDeviceName } from "../../utils/getCurrentDeviceName.js";

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
    const { email, code, rememberMe } = req.body;

    // Input validation
    if (!email || !code) {
      const error = new Error("Email and OTP are required");
      error.statusCode = 400;
      throw error;
    }

    const admin = await companyAdminSchema.findOne({ email });
    if (!admin) {
      const error = new Error("Admin not found");
      error.statusCode = 404;
      throw error;
    }

    // Verify OTP
    if (code !== admin.twoFactorSecret) {
      const error = new Error("Invalid OTP");
      error.statusCode = 400;
      throw error;
    }

    // Check OTP expiry
    const expiryTime = admin.twoFactorSecretExpiry;
    if (!expiryTime || expiryTime < new Date()) {
      const error = new Error("OTP expired");
      error.statusCode = 400;
      throw error;
    }

    const now = new Date();
    // const sessionExpiry = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const sessionExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 2 minutes

    // Complete the login process
    admin.twoFactorVerifiedAt = now;
    admin.rememberMe = rememberMe || false;
    admin.isCurrentlyLoggedIn = true;
    admin.lastActivityTime = now;
    admin.sessionExpiry = sessionExpiry;
    admin.currentLoginsCount = 1; // Set to 1
    admin.currentDevice = getCurrentDeviceName(req.headers["user-agent"]);

    if (rememberMe) {
      const rememberMeExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      admin.rememberMeExpiry = rememberMeExpiry;
    }

    // Clear 2FA secret after successful verification
    admin.twoFactorSecret = null;
    admin.twoFactorSecretExpiry = null;

    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role,
        email: admin.email,
        name: admin.name,
        sessionId: admin.currentSessionId,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "12h" }
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
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
}

export async function getCurrentClientAdmins(req, res, next) {
  try {
    const { id, role } = req.user;
    if (!id || !role) {
      throw new Error("User not found");
    }
    const currentClient = await companyAdminSchema.findById(id);

    if (!currentClient) {
      throw new Error("Client not found");
    }
    const admins = await companyAdminSchema
      .find({
        companyId: currentClient.companyId,
      })
      .select("-password");
    res.status(200).json({
      success: true,
      message: "Client admins fetched successfully",
      data: admins,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdmin(req, res, next) {
  try {
    const { adminId } = req.params;
    const { name, email, role, isTwoFactorEnabled } = req.body;

    const admin = await companyAdminSchema.findById(adminId);
    if (!admin) {
      throw new Error("Admin not found");
    }
    const updatedAdmin = await companyAdminSchema.findByIdAndUpdate(
      adminId,
      {
        name,
        email,
        role,
        isTwoFactorEnabled,
      },
      { new: true }
    );

    if (!updatedAdmin) {
      throw new Error("Failed to update admin");
    }

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    next(error);
  }
}
export async function disableAdmin(req, res, next) {
  try {
    const { adminId } = req.params;
    const { isDisable } = req.body;

    const admin = await companyAdminSchema.findById(adminId);
    if (!admin) {
      throw new Error("Admin not found");
    }

    const updatedAdmin = await companyAdminSchema.findByIdAndUpdate(
      adminId,
      {
        disableStatus: isDisable,
      },
      { new: true }
    );

    if (!updatedAdmin) {
      throw new Error("Failed to update admin");
    }

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdmin(req, res, next) {
  try {
    const { adminId } = req.params;

    const admin = await companyAdminSchema.findById(adminId);
    if (!admin) {
      throw new Error("Admin not found");
    }
    const updatedAdmin = await companyAdminSchema.findByIdAndDelete(adminId);

    if (!updatedAdmin) {
      throw new Error("Failed to delete admin");
    }

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    next(error);
  }
}
