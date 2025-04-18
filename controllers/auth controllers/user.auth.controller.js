// controllers/userController.js
import bcrypt from "bcryptjs";
import userSchema from "../../schema/user.schema.js";
import jwt from "jsonwebtoken";

export async function userRegister(req, res) {
  try {
    const { name, email, password } = req.body;

    // 1. Check for existing user
    const checkExistingUser = await userSchema.findOne({ email });
    if (checkExistingUser) {
      return res.status(400).json({
        success: false,
        message: `User ${email} already exists`,
      });
    }

    // 2. Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new userSchema({
      name,
      email,
      password: hashedPassword,
    });

    // 3. Save to DB
    await user.save();
    const { password: pass, ...rest } = user._doc;

    // 4. Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    // 5. Send response with cookie
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_DEV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expiration
    });

    res.status(201).json({
      success: true,
      message: "Registered successfully",
      data: rest,
    });
  } catch (error) {
    console.error("Error in userRegister:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function userLogin(req, res) {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await userSchema.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const { password: pass, ...rest } = user._doc;

    // 3. Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    // Log the cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_DEV === "production", // true in production, false in development
      sameSite: process.env.NODE_DEV === "production" ? "None" : "Lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    console.log("Setting cookie with options:", cookieOptions); // Log cookie options

    res.cookie("access_token", token, cookieOptions);

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: rest,
    });
  } catch (error) {
    console.error("Error in userLogin:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function userLogout(req, res) {
  res.clearCookie("access_token");

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}
