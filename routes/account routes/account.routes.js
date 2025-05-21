import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import {
  getAccountInfo,
  updateAccountInfo,
} from "../../controllers/setting controllers/client.setting.controller.js";
const myAccountRouter = express.Router();

myAccountRouter.get(
  "/my-account",
  verifyToken,
  hasRole(...roles, "BIGHIL", "user"),
  getAccountInfo
);
myAccountRouter.patch(
  "/update-my-account",
  verifyToken,
  hasRole(...roles, "BIGHIL", "user"),
  updateAccountInfo
);

export default myAccountRouter;
