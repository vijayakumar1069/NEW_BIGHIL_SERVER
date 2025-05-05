import jwt from "jsonwebtoken";
import userSchema from "../schema/user.schema.js";

export const verifyToken = async (req, res, next) => {
  try {
    // 1. Check if Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing",
        code: "AUTH_HEADER_MISSING",
      });
    }

    // 2. Verify header format (Bearer token)
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Authorization header format should be: Bearer <token>",
        code: "INVALID_AUTH_FORMAT",
      });
    }

    // 3. Get and verify token
    const token = parts[1];
    if (!token || token.trim() === "") {
      return res.status(401).json({
        success: false,
        message: "Token not provided",
        code: "TOKEN_MISSING",
      });
    }

    // 4. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded;

    if (req.user.role == "user") {
      // 🔥 Auto-update user's lastActive field
      userSchema
        .findByIdAndUpdate(req.user.id, {
          lastActive: new Date(),
        })
        .exec(); // fire-and-forget (non-blocking)
    }
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
        code: "INVALID_TOKEN",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }
    // Other errors
    next(error);
  }
};

// Improved role checking middleware
export const hasRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User not authenticated",
        code: "UNAUTHENTICATED",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    next();
  };
