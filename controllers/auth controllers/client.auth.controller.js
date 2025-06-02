import companyAdminSchema from "../../schema/company.admin.schema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { setupTwoFactorForAdmin } from "../../utils/setupTwoFactorForAdmin.js";
import {
  createDeviceSession,
  isDeviceRemembered,
  getActiveDeviceSessions,
  generateDeviceFingerprint,
} from "../../utils/devicemanagementutils.js";

export async function clientLoginFunction(req, res, next) {
  try {
    const { email, password, rememberDevice = false } = req.body;

    // Input validation
    if (!email || !password) {
      const error = new Error("Email and password are required");
      error.statusCode = 400;
      throw error;
    }

    // Find client admin
    const clientAdmin = await companyAdminSchema.findOne({ email: email });

    if (!clientAdmin) {
      const error = new Error("Invalid username or password");
      error.statusCode = 401;
      throw error;
    }

    // Check if admin is disabled
    if (clientAdmin.disableStatus) {
      const error = new Error("This admin has been disabled");
      error.statusCode = 403;
      throw error;
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, clientAdmin.password);

    if (!isMatch) {
      const error = new Error("Invalid username or password");
      error.statusCode = 401;
      throw error;
    }

    // Generate device fingerprint
    const currentDeviceId = generateDeviceFingerprint(req);

    // Check if device is remembered
    const deviceRemembered = isDeviceRemembered(clientAdmin, currentDeviceId);

    // Get active sessions to check for conflicts
    const activeSessions = getActiveDeviceSessions(clientAdmin);
    const hasActiveSessionsOnOtherDevices = activeSessions.some(
      (session) => session.deviceId !== currentDeviceId
    );

    // If 2FA is enabled and device is not remembered, send OTP
    if (clientAdmin.isTwoFactorEnabled && !deviceRemembered) {
      try {
        const result = await setupTwoFactorForAdmin(clientAdmin);

        if (!result.success) {
          const error = new Error("Failed to send OTP email");
          error.statusCode = 500;
          throw error;
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
          message: "OTP sent to registered email",
          requiresTwoFactor: true,
          deviceId: currentDeviceId,
          hasActiveSessionsOnOtherDevices,
          activeSessions: activeSessions.map((session) => ({
            deviceId: session.deviceId,
            deviceName: session.deviceName,
            deviceType: session.deviceType,
            browser: session.browser,
            os: session.os,
            location: session.location,
            lastLoginAt: session.lastLoginAt,
          })),
        });
      } catch (twoFactorError) {
        const error = new Error("Two-factor authentication setup failed");
        error.statusCode = 500;
        throw error;
      }
    }

    // Generate JWT token
    if (!process.env.JWT_SECRET_KEY) {
      const error = new Error("JWT configuration error");
      error.statusCode = 500;
      throw error;
    }

    const token = jwt.sign(
      {
        id: clientAdmin._id,
        role: clientAdmin.role,
        email: clientAdmin.email,
        name: clientAdmin.name,
        deviceId: currentDeviceId,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    // Handle device session management
    await manageDeviceSession(clientAdmin._id, req, token, rememberDevice);

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
      deviceId: currentDeviceId,
      hasActiveSessionsOnOtherDevices,
      activeSessions: activeSessions.map((session) => ({
        deviceId: session.deviceId,
        deviceName: session.deviceName,
        deviceType: session.deviceType,
        browser: session.browser,
        os: session.os,
        location: session.location,
        lastLoginAt: session.lastLoginAt,
      })),
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
}

// Verify 2FA and complete login
export async function verifyTwoFactorAndLogin(req, res, next) {
  try {
    const {
      email,
      otp,
      rememberDevice = false,
      logoutOtherDevices = false,
    } = req.body;

    if (!email || !otp) {
      const error = new Error("Email and OTP are required");
      error.statusCode = 400;
      throw error;
    }

    const clientAdmin = await companyAdminSchema.findOne({ email: email });

    if (!clientAdmin) {
      const error = new Error("Invalid request");
      error.statusCode = 401;
      throw error;
    }

    // Verify OTP (implement your OTP verification logic here)
    const isOTPValid = await verifyOTP(clientAdmin, otp);

    if (!isOTPValid) {
      const error = new Error("Invalid or expired OTP");
      error.statusCode = 401;
      throw error;
    }

    // Generate device fingerprint
    const currentDeviceId = generateDeviceFingerprint(req);

    // If user chose to logout other devices
    if (logoutOtherDevices) {
      await logoutOtherDeviceSessions(clientAdmin._id, currentDeviceId);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: clientAdmin._id,
        role: clientAdmin.role,
        email: clientAdmin.email,
        name: clientAdmin.name,
        deviceId: currentDeviceId,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    // Handle device session management
    await manageDeviceSession(clientAdmin._id, req, token, rememberDevice);

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
    });
  } catch (error) {
    next(error);
  }
}

// Helper function to manage device sessions
async function manageDeviceSession(userId, req, token, rememberDevice) {
  const currentDeviceId = generateDeviceFingerprint(req);
  const deviceSession = createDeviceSession(req, rememberDevice);
  deviceSession.jwtToken = token;

  await companyAdminSchema.findByIdAndUpdate(userId, {
    $pull: { deviceSessions: { deviceId: currentDeviceId } }, // Remove existing session for this device
  });

  await companyAdminSchema.findByIdAndUpdate(userId, {
    $push: { deviceSessions: deviceSession },
    lastLoginDevice: currentDeviceId,
  });

  // Clean up old inactive sessions (keep only last 10)
  await companyAdminSchema.findByIdAndUpdate(userId, {
    $push: {
      deviceSessions: {
        $each: [],
        $slice: -10, // Keep only the last 10 sessions
      },
    },
  });
}

// Helper function to logout other device sessions
async function logoutOtherDeviceSessions(userId, currentDeviceId) {
  await companyAdminSchema.findByIdAndUpdate(
    userId,
    {
      $set: {
        "deviceSessions.$[elem].isActive": false,
      },
    },
    {
      arrayFilters: [
        {
          "elem.deviceId": { $ne: currentDeviceId },
          "elem.isActive": true,
        },
      ],
    }
  );
}

async function verifyOTP(user, otp) {
  return (
    user.twoFactorSecret === otp && user.twoFactorSecretExpiry > new Date()
  );
}

export async function clientLogoutFunction(req, res, next) {
  try {
    const { deviceId } = req.body;
    const userId = req.user?.id; // Assuming you have user info from JWT middleware

    if (userId && deviceId) {
      // Deactivate the specific device session
      await companyAdminSchema.findByIdAndUpdate(
        userId,
        {
          $set: {
            "deviceSessions.$[elem].isActive": false,
          },
        },
        {
          arrayFilters: [{ "elem.deviceId": deviceId }],
        }
      );
    }

    // Clear the access token cookie
    res.clearCookie("access_token");

    res.status(200).json({
      message: "Logout successful",
      success: true,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
}
