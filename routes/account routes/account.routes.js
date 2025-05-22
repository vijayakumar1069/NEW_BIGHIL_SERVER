import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import { getAccountInfo, updateAccountInfo } from "../../controllers/myAccount Controllers/my-account-info.controller.js";
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
