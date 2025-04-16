import express from "express";
import {
  bighilLogoutFunction,
  bighilLoginFunction,
} from "../../controllers/auth controllers/bighil.auth.controller.js";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { bighilRoles } from "../../utils/roles_const.js";
const bighilAuthRoute = express.Router();

bighilAuthRoute.post("/bighil-login", bighilLoginFunction);
bighilAuthRoute.post(
  "/bighil-logout",
  verifyToken,
  hasRole(...bighilRoles),
  bighilLogoutFunction
);

export default bighilAuthRoute;
