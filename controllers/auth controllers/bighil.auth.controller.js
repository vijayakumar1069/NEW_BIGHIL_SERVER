import jwt from "jsonwebtoken";
import bighilUserSchema from "../../schema/bighil.user.schema.js";

import bcrypt from "bcryptjs";

export async function bighilLoginFunction(req, res, next) {
  try {
    const { email, password } = req.body;

    // Simulate a database query to check if the user exists
    const bighiladmin = await bighilUserSchema.findOne({ email: email });
    if (!bighiladmin) {
      const error = new Error(`Invalid username or password`);
      error.statusCode = 401;
      throw error;
    }
    // Check if the password matches
    const passwordCheck = bcrypt.compare(password, bighiladmin.password);
    if (!passwordCheck) {
      const error = new Error("Invalid username or password");
      error.statusCode = 401;
      throw error;
    }
    // 3. Generate JWT token
    const token = jwt.sign(
      { id: bighiladmin._id, role: bighiladmin.role, email: bighiladmin.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    // 4. Send response with cookie
    // res.cookie("access_token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_DEV === "production",
    //   sameSite: "strict",
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expiration
    // });
    res.status(200).json({
      message: "Login successful",
      token: token,

      user: {
        id: bighiladmin._id,
        role: bighiladmin.role,
        email: bighiladmin.email,
      },
      success: true,
    });
  } catch (error) {
    next(error);
  }
}

export async function bighilLogoutFunction(req, res, next) {
  try {
    // Clear the access token cookie
    res.clearCookie("access_token");
    res.status(200).json({
      message: "Logout successful",
      success: true,
    });
  } catch (error) {
    next(error);
  }
}
