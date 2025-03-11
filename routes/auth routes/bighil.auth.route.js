import express from "express";
import {
  bighilLogoutFunction,
  bigilLoginFunction,
} from "../../controllers/auth controllers/bighil.auth.controller.js";
import { hasRole, verifyToken } from "../../middlewars/verifyToken.js";
const bighilAuthRoute = express.Router();

bighilAuthRoute.post("/bighil-login", bigilLoginFunction);
bighilAuthRoute.post(
  "/bighil-logout",
  verifyToken,
  hasRole("BIGHIL"),
  bighilLogoutFunction
);

export default bighilAuthRoute;
