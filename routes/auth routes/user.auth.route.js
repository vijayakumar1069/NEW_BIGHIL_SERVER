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
const userAuthRoute = express.Router();

userAuthRoute.post("/user-register", userRegister);
userAuthRoute.post("/user-login", userLogin);
userAuthRoute.post("/send-otp", sendUserOtp);
userAuthRoute.post("/verify-otp", verifyOtp);
userAuthRoute.post("/user-logout", verifyToken, hasRole("user"), userLogout);

export default userAuthRoute;
