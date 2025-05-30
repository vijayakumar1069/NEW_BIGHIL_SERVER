// controllers/userController.js
import bcrypt from "bcryptjs";
import userSchema from "../../schema/user.schema.js";
import jwt from "jsonwebtoken";

export async function userRegister(req, res, next) {
  try {
    const { name, email, password } = req.body;
    // 1. Validate required fields
    if (!name || !email || !password) {
      const error = new Error("Name, email, and password are required");
      error.statusCode = 400; // Bad Request
      throw error;
    }

    // 2. Validate email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error("Please provide a valid email address");
      error.statusCode = 400; // Bad Request
      throw error;
    }

    // 4. Check for existing user
    const checkExistingUser = await userSchema.findOne({ email });
    if (checkExistingUser) {
      const error = new Error(`User with email ${email} already exists`);
      error.statusCode = 409; // Conflict
      throw error;
    }

    // 5. Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new userSchema({
      name,
      email,
      password: hashedPassword,
    });

    // 6. Save to DB
    await user.save();
    const { password: pass, ...rest } = user._doc;

    // 4. Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
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

export async function userLogin(req, res, next) {
  try {
    const { email, password } = req.body;

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
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: rest,
      token,
    });
  } catch (error) {
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
