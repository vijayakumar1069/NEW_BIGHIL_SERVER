import express from "express";
import {
  clientLoginFunction,
  clientLogoutFunction,
  validateSessionFunction,
} from "../../controllers/auth controllers/client.auth.controller.js";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import { validateActiveSession } from "../../middleware/validateActiveSession.js";
const clientAuthRoute = express.Router();

clientAuthRoute.post("/client-login", clientLoginFunction);
clientAuthRoute.post(
  "/client-logout",
  verifyToken,
  validateActiveSession,
  hasRole(...roles),
  clientLogoutFunction
);
clientAuthRoute.get(
  "/validate-active-session",
  verifyToken,
  hasRole(...roles),
  validateSessionFunction
);

export default clientAuthRoute;
