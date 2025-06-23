import express from "express";
import asyncHandler from "express-async-handler";
import {
  sendUserOtp,
  userLogin,
  userLogout,
  userRegister,
  verifyOtp,
} from "../../controllers/auth controllers/user.auth.controller.js";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import jwt from "jsonwebtoken";
import userSchema from "../../schema/user.schema.js";
const userAuthRoute = express.Router();

userAuthRoute.post("/user-register", userRegister);
userAuthRoute.post("/user-login", userLogin);
userAuthRoute.post("/send-otp", sendUserOtp);
userAuthRoute.post("/verify-otp", verifyOtp);
userAuthRoute.post("/user-logout", verifyToken, hasRole("user"), userLogout);
userAuthRoute.post("/user-beacon-logout", async (req, res) => {
  try {
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(200).json({ success: true });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await userSchema.findById(decoded.id);

    if (user) {
      user.lastActive = Date.now();
      await user.save();
    }

    res.cookie("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_DEV == "production",
      sameSite: process.env.NODE_DEV == "production" ? "none" : "lax",
      path: "/",
      expires: new Date(0), // Immediately expire
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    res.cookie("access_token", "", {
      expires: new Date(0),
      path: "/",
    });
    return res.status(200).json({ success: true });
  }
});

export default userAuthRoute;
