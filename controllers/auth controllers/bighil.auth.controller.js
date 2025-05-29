import jwt from "jsonwebtoken";
import bighilUserSchema from "../../schema/bighil.user.schema.js";

import bcrypt from "bcryptjs";

export async function bighilLoginFunction(req, res, next) {
  try {
    const { email, password } = req.body;

    // Simulate a database query to check if the user exists
    const bighiladmin = await bighilUserSchema.findOne({ email: email });
    if (!bighiladmin) {
      throw new Error("Invalid username or password");
    }
    // Check if the password matches
    const passwordCheck = bcrypt.compare(password, bighiladmin.password);
    if (!passwordCheck) {
      throw new Error("Invalid username or password");
    }
    // 3. Generate JWT token
    const token = jwt.sign(
      { id: bighiladmin._id, role: bighiladmin.role, email: bighiladmin.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

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
