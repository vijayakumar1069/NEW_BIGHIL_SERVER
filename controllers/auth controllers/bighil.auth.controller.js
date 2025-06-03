import jwt from "jsonwebtoken";
import bighilUserSchema from "../../schema/bighil.user.schema.js";
import bcrypt from "bcryptjs";

export async function bighilLoginFunction(req, res, next) {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      const error = new Error("Email and password are required");
      error.statusCode = 400; // Bad Request
      throw error;
    }

    // Simulate a database query to check if the user exists
    const bighiladmin = await bighilUserSchema.findOne({ email: email });
    if (!bighiladmin) {
      const error = new Error("Invalid username or password");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    // Check if the password matches (await the bcrypt.compare)
    const passwordCheck = await bcrypt.compare(password, bighiladmin.password);
    if (!passwordCheck) {
      const error = new Error("Invalid username or password");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    // Check if JWT_SECRET_KEY exists
    if (!process.env.JWT_SECRET_KEY) {
      const error = new Error("JWT configuration error");
      error.statusCode = 500; // Internal Server Error
      throw error;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: bighiladmin._id, role: bighiladmin.role, email: bighiladmin.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "12h" }
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
    // If error doesn't have statusCode, it will default to 500 in errorHandler
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
    // For logout, most errors would be server errors
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
}
