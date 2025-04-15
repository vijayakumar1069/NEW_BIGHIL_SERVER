import express from "express";
import asyncHandler from "express-async-handler";
import {
  userLogin,
  userLogout,
  userRegister,
} from "../../controllers/auth controllers/user.auth.controller.js";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
const userAuthRoute = express.Router();

userAuthRoute.post("/user-register", userRegister);
userAuthRoute.post("/user-login", userLogin);
userAuthRoute.post("/user-logout", verifyToken, hasRole("user"), userLogout);

export default userAuthRoute;
