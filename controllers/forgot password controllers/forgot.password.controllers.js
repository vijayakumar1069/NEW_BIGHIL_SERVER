import companyAdminSchema from "../../schema/company.admin.schema.js";
import { generateOtp, generateOtpExpiry } from "../../utils/otpHelperFun.js";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "../../utils/send_welcome_email.js";
import userSchema from "../../schema/user.schema.js";
import bighilUserSchema from "../../schema/bighil.user.schema.js";

export const sendOtpForClientPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      const error = new Error("Email is required");
      error.statusCode = 400;
      throw error;
    }

    // Find admin user with the given email
    const admin = await companyAdminSchema.findOne({ email });
    if (!admin) {
      const error = new Error("Email not found");
      error.statusCode = 404;
      throw error;
    }

    const otp = generateOtp();
    //set otp and expiry time
    const emailSendFun = await sendOtpEmail({
      email: admin.email,
      userName: admin.name,
      otp,
    });

    if (emailSendFun.success !== true) {
      const error = new Error(emailSendFun.message);
      error.statusCode = 404;
      throw error;
    }
    admin.otp = otp;
    admin.otpExpiry = generateOtpExpiry();
    admin.isResetActive = true;

    await admin.save();

    res
      .status(200)
      .json({ success: true, message: "OTP sent successfully to your email." });
  } catch (error) {
    console.error("Error sending OTP:", error);
    next(error); // Forward error to global error handler (if used)
  }
};
export const verifyOtpForClient = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      const error = new Error("Email and OTP are required");
      error.statusCode = 400;
      throw error;
    }

    // Find the admin user
    const admin = await companyAdminSchema.findOne({ email });

    if (!admin) {
      const error = new Error("Email not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if OTP is valid
    if (!admin.otp || admin.otp !== otp) {
      const error = new Error("Invalid OTP");
      error.statusCode = 400;
      throw error;
    }

    // Check if OTP has expired
    if (new Date() > admin.otpExpiry) {
      const error = new Error("OTP has expired");
      error.statusCode = 400;
      throw error;
    }

    // OTP is valid -> Reset OTP fields (for security)
    admin.otp = null;
    admin.otpExpiry = null;
    admin.isResetActive = true; // Mark reset process as active
    await admin.save();

    res
      .status(200)
      .json({ success: true, message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    next(error); // Forward error to global error handler (if used)
  }
};

export const ClientResetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    // Validate input
    if (!email || !newPassword) {
      const error = new Error("Email and new password are required");
      error.statusCode = 400;
      throw error;
    }

    // Find admin user
    const admin = await companyAdminSchema.findOne({ email });

    if (!admin || !admin.isResetActive) {
      const error = new Error("Email not found or reset process not active");
      error.statusCode = 404;
      throw error;
    }

    // Validate password strength (optional but recommended)
    // if (newPassword.length < 6) {
    //   const error = new Error("Password must be at least 6 characters long");
    //   error.statusCode = 400;
    //   throw error;
    // }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and reset fields
    admin.password = hashedPassword;
    admin.otp = null;
    admin.otpExpiry = null;
    admin.isResetActive = false;
    await admin.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("Error resetting password:", error);
    next(error); // Pass error to global error handler
  }
};

export async function sendOtpForUser(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      const error = new Error("Email is required");
      error.statusCode = 400;
      throw error;
    }
    const user = await userSchema.findOne({ email });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    const otp = generateOtp();
    //set otp and expiry time
    const emailSendFun = await sendOtpEmail({
      email: user.email,
      userName: user.name,
      otp,
    });
    if (emailSendFun.success !== true) {
      const error = new Error(emailSendFun.message);
      error.statusCode = 404;
      throw error;
    }
    user.otp = otp;
    user.otpExpiry = generateOtpExpiry();
    user.isResetActive = true;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "OTP sent successfully to your email." });
  } catch (error) {
    console.error("Error sending OTP:", error);
    next(error); // Forward error to global error handler (if used)
  }
}
export async function verifyOtpForUser(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      const error = new Error("Email and OTP are required");
      error.statusCode = 400;
      throw error;
    }
    const user = await userSchema.findOne({ email });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    if (!user.otp || user.otp !== otp) {
      const error = new Error("Invalid OTP");
      error.statusCode = 400;
      throw error;
    }
    if (new Date() > user.otpExpiry) {
      const error = new Error("OTP has expired");
      error.statusCode = 400;
      throw error;
    }
    user.otp = null;
    user.otpExpiry = null;
    user.isResetActive = true; // Mark reset process as active
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    next(error); // Pass error to global error handler
  }
}

export async function resetPasswordForUser(req, res, next) {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      const error = new Error("Email and new password are required");
      error.statusCode = 400;
      throw error;
    }
    const user = await userSchema.findOne({ email });
    if (!user || !user.isResetActive) {
      const error = new Error("Email not found or reset process not active");
      error.statusCode = 404;
      throw error;
    }
    // Validate password strength (optional but recommended)
    // if (newPassword.length < 6) {
    //   const error = new Error("Password must be at least 6 characters long");
    //   error.statusCode = 400;
    //   throw error;
    // }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    user.isResetActive = false;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("Error resetting password:", error);
    next(error); // Pass error to global error handler
  }
}

export async function sendOtpForBighil(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      const error = new Error("Email is required");
      error.statusCode = 400;
      throw error;
    }
    const bighil = await bighilUserSchema.findOne({ email });

    if (!bighil) {
      const error = new Error("Bighil user not found");
      error.statusCode = 404;
      throw error;
    }
    const otp = generateOtp();
    bighil.otp = otp;
    bighil.otpExpiry = generateOtpExpiry();
    bighil.isResetActive = true;
    await bighil.save();
    const emailSendFun = await sendOtpEmail({
      email: bighil.email,
      userName: bighil.username,
      otp,
    });
    if (emailSendFun.success !== true) {
      const error = new Error(emailSendFun.message);
      error.statusCode = 404;
      throw error;
    }
    res
      .status(200)
      .json({ success: true, message: "OTP sent successfully to your email." });
  } catch (error) {
    console.error("Error sending OTP:", error);
    next(error); // Forward error to global error handler (if used)
  }
}

export async function verifyOtpForBighil(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      const error = new Error("Email and OTP are required");
      error.statusCode = 400;
      throw error;
    }
    const bighil = await bighilUserSchema.findOne({ email });
    if (!bighil) {
      const error = new Error("Bighil user not found");
      error.statusCode = 404;
      throw error;
    }
    if (!bighil.otp || bighil.otp !== otp) {
      const error = new Error("Invalid OTP");
      error.statusCode = 400;
      throw error;
    }
    if (new Date() > bighil.otpExpiry) {
      const error = new Error("OTP has expired");
      error.statusCode = 400;
      throw error;
    }
    bighil.otp = null;
    bighil.otpExpiry = null;
    bighil.isResetActive = true; // Mark reset process as active
    await bighil.save();
    res
      .status(200)
      .json({ success: true, message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    next(error); // Pass error to global error handler
  }
}

export async function resetPasswordForBighil(req, res, next) {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      const error = new Error("Email and new password are required");
      error.statusCode = 400;
      throw error;
    }
    const bighil = await bighilUserSchema.findOne({ email });
    if (!bighil || !bighil.isResetActive) {
      const error = new Error("Email not found or reset process not active");
      error.statusCode = 404;
      throw error;
    }
    // Validate password strength (optional but recommended)
    // if (newPassword.length < 6) {
    //   const error = new Error("Password must be at least 6 characters long");
    //   error.statusCode = 400;
    //   throw error;
    // }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    bighil.password = hashedPassword;
    bighil.otp = null;
    bighil.otpExpiry = null;
    bighil.isResetActive = false;
    await bighil.save();
    res
      .status(200)
      .json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("Error resetting password:", error);
    next(error); // Pass error to global error handler
  }
}
