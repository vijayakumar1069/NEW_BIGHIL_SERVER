import companyAdminSchema from "../../schema/company.admin.schema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { setupTwoFactorForAdmin } from "../../utils/setupTwoFactorForAdmin.js";
import { getCurrentDeviceName } from "../../utils/getCurrentDeviceName.js";
import crypto from "crypto";
import mongoose from "mongoose";
export async function clientLoginFunction(req, res, next) {
  try {
    const { email, password } = req.body;

    // 1. Input Validation
    if (!email || !password) {
      const error = new Error("Email and password are required");
      error.statusCode = 400;
      throw error;
    }

    // 2. Find Admin
    const clientAdmin = await companyAdminSchema.findOne({ email });

    if (!clientAdmin) {
      const error = new Error("Invalid username or password");
      error.statusCode = 401;
      throw error;
    }

    // 3. Check if Admin is disabled
    if (clientAdmin.disableStatus) {
      const error = new Error("This admin has been disabled");
      error.statusCode = 403;
      throw error;
    }

    // 4. ENHANCED: Check if admin is already logged in from another session
    if (
      clientAdmin.isCurrentlyLoggedIn &&
      clientAdmin.sessionExpiry &&
      clientAdmin.sessionExpiry > new Date()
    ) {
      const error = new Error(
        "This admin is already logged in from another device/session. Please logout from the other session first."
      );
      error.statusCode = 409; // Conflict status code
      throw error;
    }

    // 5. Password Verification
    const isMatch = await bcrypt.compare(password, clientAdmin.password);
    if (!isMatch) {
      const error = new Error("Invalid username or password");
      error.statusCode = 401;
      throw error;
    }

    const currentDevice = getCurrentDeviceName(req.headers["user-agent"]);
    const checkDevice = clientAdmin.previousDevice === currentDevice;

    // Generate unique session ID
    const sessionId = crypto.randomBytes(32).toString("hex");
    const now = new Date();
    const sessionExpiry = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours
    // const sessionExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    // Update device info
    clientAdmin.currentDevice = currentDevice;

    // 6. If 2FA is enabled
    if (clientAdmin.isTwoFactorEnabled) {
      const isRemembered =
        clientAdmin.rememberMe &&
        clientAdmin.rememberMeExpiry &&
        clientAdmin.rememberMeExpiry > new Date() &&
        checkDevice;

      if (isRemembered) {
        // Complete login for remembered device
        clientAdmin.isCurrentlyLoggedIn = true;
        clientAdmin.currentSessionId = sessionId;
        clientAdmin.lastActivityTime = now;
        clientAdmin.sessionExpiry = sessionExpiry;
        clientAdmin.currentLoginsCount = 1; // Set to 1, not increment
        await clientAdmin.save();

        const token = jwt.sign(
          {
            id: clientAdmin._id,
            role: clientAdmin.role,
            email: clientAdmin.email,
            name: clientAdmin.name,
            sessionId: sessionId, // Include session ID in token
          },
          process.env.JWT_SECRET_KEY,
          { expiresIn: "12h" }
        );

        return res.status(200).json({
          success: true,
          message: "Login successful",
          user: {
            id: clientAdmin._id,
            role: clientAdmin.role,
            email: clientAdmin.email,
            name: clientAdmin.name,
            companyId: clientAdmin.companyId,
          },
          token,
          requiresTwoFactor: false,
        });
      }

      // 2FA required - send OTP but don't mark as logged in yet
      const result = await setupTwoFactorForAdmin(clientAdmin);
      if (!result.success) {
        throw new Error("Failed to send OTP email");
      }

      // Store session info temporarily (will be activated after 2FA)
      clientAdmin.twoFactorSecret = result.otpPayload.twoFactorSecret;
      clientAdmin.twoFactorSecretExpiry =
        result.otpPayload.twoFactorSecretExpiry;
      clientAdmin.twoFactorVerifiedAt = result.otpPayload.twoFactorVerifiedAt;
      clientAdmin.currentSessionId = sessionId; // Store for 2FA completion

      await clientAdmin.save();

      return res.status(200).json({
        success: true,
        message: "OTP sent to registered email",
        requiresTwoFactor: true,
      });
    }

    // 7. 2FA not enabled — Complete login
    clientAdmin.isCurrentlyLoggedIn = true;
    clientAdmin.currentSessionId = sessionId;
    clientAdmin.lastActivityTime = now;
    clientAdmin.sessionExpiry = sessionExpiry;
    clientAdmin.currentLoginsCount = 1; // Set to 1, not increment
    await clientAdmin.save();

    const token = jwt.sign(
      {
        id: clientAdmin._id,
        role: clientAdmin.role,
        email: clientAdmin.email,
        name: clientAdmin.name,
        sessionId: sessionId,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "12h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: clientAdmin._id,
        role: clientAdmin.role,
        email: clientAdmin.email,
        name: clientAdmin.name,
        companyId: clientAdmin.companyId,
      },
      token,
      requiresTwoFactor: false,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
}

export async function clientLogoutFunction(req, res, next) {
  try {
    const { id, role } = req.user;
    console.log(
      "Client Logout Function called with ID:",
      id,
      "and role:",
      role
    );
    if (!id || !role) {
      const error = new Error("User not found");
      error.statusCode = 401;
      throw error;
    }

    const currentClient = await companyAdminSchema.findById(id);
    if (!currentClient) {
      const error = new Error("Client not found");
      error.statusCode = 404;
      throw error;
    }

    // Clear all session data
    currentClient.isCurrentlyLoggedIn = false;
    currentClient.currentSessionId = null;
    currentClient.lastActivityTime = null;
    currentClient.sessionExpiry = null;
    currentClient.currentLoginsCount = 0;
    currentClient.previousDevice = currentClient.currentDevice;
    currentClient.currentDevice = "";

    await currentClient.save();

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

export async function forceLogoutAdmin(req, res, next) {
  try {
    const { adminId } = req.params;

    const admin = await companyAdminSchema.findById(adminId);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    // Clear all session data
    admin.isCurrentlyLoggedIn = false;
    admin.currentSessionId = null;
    admin.lastActivityTime = null;
    admin.sessionExpiry = null;
    admin.currentLoginsCount = 0;
    admin.previousDevice = admin.currentDevice;
    admin.currentDevice = "";

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Admin forcefully logged out",
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
}

export async function cleanupExpiredSessions() {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      // Check if mongoose is connected
      if (mongoose.connection.readyState !== 1) {
        console.log("MongoDB not connected, skipping session cleanup");
        return;
      }

      const now = new Date();

      // Use a more robust query with timeout
      const result = await companyAdminSchema.updateMany(
        {
          $or: [
            { sessionExpiry: { $lt: now } },
            { sessionExpiry: null, isCurrentlyLoggedIn: true },
          ],
        },
        {
          $set: {
            isCurrentlyLoggedIn: false,
            currentSessionId: null,
            lastActivityTime: null,
            sessionExpiry: null,
            currentLoginsCount: 0,
            currentDevice: "",
          },
        },
        {
          timeout: 30000, // 30 second timeout
          maxTimeMS: 30000, // MongoDB server timeout
        }
      );

      console.log(
        `✅ Session cleanup completed. Modified ${result.modifiedCount} documents`
      );
      return; // Success, exit retry loop
    } catch (error) {
      retryCount++;
      console.error(
        `❌ Error cleaning up expired sessions (attempt ${retryCount}/${maxRetries}):`,
        error.message
      );

      if (retryCount < maxRetries) {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        console.error("❌ Session cleanup failed after all retries");
      }
    }
  }
}
let cleanupInterval = null;

export function initializeSessionCleanup() {
  // Clear any existing interval
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  // Run cleanup every 15 minutes
  cleanupInterval = setInterval(
    () => {
      cleanupExpiredSessions();
    },
    15 * 60 * 1000
  );

  setTimeout(() => {
    cleanupExpiredSessions();
  }, 5000);

  console.log("✅ Session cleanup initialized");
}

export function stopSessionCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log("✅ Session cleanup stopped");
  }
}

// Export the interval reference (optional, for debugging)
export function getCleanupInterval() {
  return cleanupInterval;
}
