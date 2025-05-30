import companyAdminSchema from "../../schema/company.admin.schema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { setupTwoFactorForAdmin } from "../../utils/setupTwoFactorForAdmin.js";

export async function clientLoginFunction(req, res, next) {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      const error = new Error("Email and password are required");
      error.statusCode = 400; // Bad Request
      throw error;
    }

    // Find client admin
    const clientAdmin = await companyAdminSchema.findOne({ email: email });

    if (!clientAdmin) {
      const error = new Error("Invalid username or password");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    // Check if admin is disabled
    if (clientAdmin.disableStatus) {
      const error = new Error("This admin has been disabled");
      error.statusCode = 403; // Forbidden
      throw error;
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, clientAdmin.password);

    if (!isMatch) {
      const error = new Error("Invalid username or password");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    // If 2FA is enabled, send OTP and return success WITHOUT token
    if (clientAdmin.isTwoFactorEnabled) {
      try {
        const result = await setupTwoFactorForAdmin(clientAdmin);

        if (!result.success) {
          const error = new Error("Failed to send OTP email");
          error.statusCode = 500; // Internal Server Error
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
        });
      } catch (twoFactorError) {
        // Handle 2FA setup errors
        const error = new Error("Two-factor authentication setup failed");
        error.statusCode = 500; // Internal Server Error
        throw error;
      }
    }

    // Check if JWT secret exists
    if (!process.env.JWT_SECRET_KEY) {
      const error = new Error("JWT configuration error");
      error.statusCode = 500; // Internal Server Error
      throw error;
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
    // Ensure all errors have proper status codes
    if (!error.statusCode) {
      error.statusCode = 500; // Default to Internal Server Error
    }
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
    // Logout errors are typically server errors
    if (!error.statusCode) {
      error.statusCode = 500; // Internal Server Error
    }
    next(error);
  }
}
