import express from "express";
import {
  clientLoginFunction,
  clientLogoutFunction,
} from "../../controllers/auth controllers/client.auth.controller.js";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
const clientAuthRoute = express.Router();

clientAuthRoute.post("/client-login", clientLoginFunction);
clientAuthRoute.post(
  "/client-logout",
  verifyToken,
  hasRole(...roles),
  clientLogoutFunction
);

export default clientAuthRoute;
