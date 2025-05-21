import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { getCurrentSettingInfo, updateUserSetting } from "../../controllers/setting controller/user.setting.controller.js";
const userSettingRouter = express.Router();

userSettingRouter.get(
  "/get-user-setting",
  verifyToken,
  hasRole("user"),
  getCurrentSettingInfo
);
userSettingRouter.patch(
  "/update-user-setting",
  verifyToken,
  hasRole("user"),
  updateUserSetting
);


export default userSettingRouter;
