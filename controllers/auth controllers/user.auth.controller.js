// controllers/userController.js
import bcrypt from "bcryptjs";
import userSchema from "../../schema/user.schema.js";
import jwt from "jsonwebtoken";
import { generateOtp, generateOtpExpiry } from "../../utils/otpHelperFun.js";
import { userLoginOtpEmail } from "../../utils/send_welcome_email.js";
import { getImagePath } from "../../utils/getImagePath.js";

export async function userRegister(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      const error = new Error("Name, email, and password are required");
      error.statusCode = 400;
      throw error;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error("Please provide a valid email address");
      error.statusCode = 400;
      throw error;
    }

    const existingUser = await userSchema.findOne({ email });

    if (existingUser && existingUser.password) {
      const error = new Error(`User with email ${email} already exists`);
      error.statusCode = 409;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;
    if (existingUser) {
      // Complete registration for OTP-created user
      existingUser.name = name;
      existingUser.password = hashedPassword;
      existingUser.loginOtp = null;
      existingUser.loginOtpExpiry = null;
      user = await existingUser.save();
    } else {
      // Fresh user creation
      user = new userSchema({
        name,
        email,
        password: hashedPassword,
      });
      await user.save();
    }

    const { password: _pass, ...rest } = user._doc;

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        name: user.name,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "12h" }
    );

    res.status(201).json({
      success: true,
      message: "Registered successfully",
      data: rest,
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function sendUserOtp(req, res, next) {
  try {
    const { email, name, resend = false } = req.body;

    console.log("sendUserOtp called with:", { email, name, resend });

    // 1. Validate fields
    if (
      !email ||
      typeof email !== "string" ||
      !name ||
      typeof name !== "string"
    ) {
      const error = new Error("Email and name are required");
      error.statusCode = 400;
      throw error;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error("Invalid email format");
      error.statusCode = 400;
      throw error;
    }

    // 2. Check user existence
    const existingUser = await userSchema.findOne({ email });

    if (!resend && existingUser) {
      // Trying to sign up with an already existing user
      const error = new Error("User already exists with this email");
      error.statusCode = 409; // Conflict
      throw error;
    }

    if (resend && !existingUser) {
      // Trying to resend OTP to a user that doesn't exist yet
      const error = new Error(
        "No user found to resend OTP. Please sign up first."
      );
      error.statusCode = 404;
      throw error;
    }

    // 3. Generate OTP and expiry
    const otp = generateOtp();
    const otpExpiry = generateOtpExpiry();

    if (!otp || !otpExpiry) {
      const error = new Error("Failed to generate OTP");
      error.statusCode = 500;
      throw error;
    }

    // 4. Send email
    const logoPath = getImagePath();
    const emailResult = await userLoginOtpEmail({
      email,
      userName: name,
      otp,
      subject: "Signup OTP",
      logoPath,
    });
    console.log("Email result:", emailResult);
    if (!emailResult.success) {
      const error = new Error(
        emailResult.message || "Failed to send OTP email"
      );
      error.statusCode = 500;
      throw error;
    }

    // 5. Save to DB (create or update user)
    if (resend) {
      // Update existing user
      existingUser.loginOtp = otp;
      existingUser.loginOtpExpiry = otpExpiry;
      await existingUser.save();
    } else {
      // Create new user
      const newUser = new userSchema({
        email,
        name,
        loginOtp: otp,
        loginOtpExpiry: otpExpiry,
      });
      await newUser.save();
    }

    // 6. Success response
    res.status(200).json({
      success: true,
      message: resend ? "OTP resent successfully" : "OTP sent successfully",
      data: {
        otp, // ⚠️ remove in production
      },
    });
  } catch (error) {
    console.error("Error in sendUserOtp:", error);
    next(error);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    // 1. Validate required fields
    if (!email || !otp) {
      const error = new Error("Email and OTP are required");
      error.statusCode = 400; // Bad Request
      throw error;
    }
    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error("Please provide a valid email address");
      error.statusCode = 400; // Bad Request
      throw error;
    }
    // 3. Check if user exists
    const user = await userSchema.findOne({ email });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404; // Not Found
      throw error;
    }
    // 4. Check if OTP is valid
    if (!user.loginOtp || user.loginOtp !== otp) {
      const error = new Error("Invalid OTP");
      error.statusCode = 400; // Bad Request
      throw error;
    }
    // 5. Check if OTP has expired
    if (new Date() > user.loginOtpExpiry) {
      const error = new Error("OTP has expired");
      error.statusCode = 400; // Bad Request
      throw error;
    }
    // 6. Update user's loginOtp fields to null

    user.loginOtp = null;
    user.loginOtpExpiry = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function userLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    console.log("userLogin called with:", { email, password });

    // 1. Validate required fields
    if (!email || !password) {
      const error = new Error("Email and password are required");
      error.statusCode = 400; // Bad Request
      throw error;
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error("Please provide a valid email address");
      error.statusCode = 400; // Bad Request
      throw error;
    }

    // 3. Check if user exists
    const user = await userSchema.findOne({ email });
    if (!user) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401; // Unauthorized
      throw error;
    }
    // 5. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    const { password: pass, ...rest } = user._doc;

    // 3. Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "12h" }
    );

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: rest,
      token,
    });
  } catch (error) {
    console.log("Error in userLogin:", error);
    next(error);
  }
}
export async function userLogout(req, res) {
  res.clearCookie("access_token");

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}
