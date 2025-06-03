import companyAdminSchema from "../../schema/company.admin.schema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { setupTwoFactorForAdmin } from "../../utils/setupTwoFactorForAdmin.js";
import { getCurrentDeviceName } from "../../utils/getCurrentDeviceName.js";

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
    if (clientAdmin.currentLoginsCount >= 1) {
      const error = new Error("Someone is already logged in");
      error.statusCode = 401;
      throw error;
    }

    // 3. Check if Admin is disabled
    if (clientAdmin.disableStatus) {
      const error = new Error("This admin has been disabled");
      error.statusCode = 403;
      throw error;
    }

    // 4. Password Verification
    const isMatch = await bcrypt.compare(password, clientAdmin.password);
    if (!isMatch) {
      const error = new Error("Invalid username or password");
      error.statusCode = 401;
      throw error;
    }
    const checkDevice =
      clientAdmin.previousDevice ==
      getCurrentDeviceName(req.headers["user-agent"]);

    clientAdmin.currentDevice = getCurrentDeviceName(req.headers["user-agent"]);

    // 5. If 2FA is enabled
    if (clientAdmin.isTwoFactorEnabled) {
      const isRemembered =
        clientAdmin.rememberMe &&
        clientAdmin.rememberMeExpiry &&
        clientAdmin.rememberMeExpiry > new Date() &&
        checkDevice;

      if (isRemembered) {
        // Only increment when login is complete (remembered device)
        clientAdmin.currentLoginsCount = clientAdmin.currentLoginsCount + 1;
        await clientAdmin.save();

        const token = jwt.sign(
          {
            id: clientAdmin._id,
            role: clientAdmin.role,
            email: clientAdmin.email,
            name: clientAdmin.name,
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
          },
          token,
          requiresTwoFactor: false,
        });
      }

      // 2FA required - send OTP
      const result = await setupTwoFactorForAdmin(clientAdmin);
      if (!result.success) {
        throw new Error("Failed to send OTP email");
      }

      // Update 2FA fields - DON'T increment login count here
      clientAdmin.twoFactorSecret = result.otpPayload.twoFactorSecret;
      clientAdmin.twoFactorSecretExpiry =
        result.otpPayload.twoFactorSecretExpiry;
      clientAdmin.twoFactorVerifiedAt = result.otpPayload.twoFactorVerifiedAt;
      // REMOVED: clientAdmin.currentLoginsCount = clientAdmin.currentLoginsCount + 1;

      await clientAdmin.save();

      return res.status(200).json({
        success: true,
        message: "OTP sent to registered email",
        requiresTwoFactor: true,
      });
    }

    // 6. 2FA not enabled — Generate token and increment login count
    clientAdmin.currentLoginsCount = clientAdmin.currentLoginsCount + 1;
    await clientAdmin.save();

    const token = jwt.sign(
      {
        id: clientAdmin._id,
        role: clientAdmin.role,
        email: clientAdmin.email,
        name: clientAdmin.name,
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

    // Ensure count doesn't go below 0
    currentClient.currentLoginsCount = Math.max(
      0,
      currentClient.currentLoginsCount - 1
    );
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
