import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import {
  getSetting,
  updateSetting,
} from "../../controllers/setting controllers/client.setting.controller.js";
const settingRouter = express.Router();

settingRouter.get(
  "/get-setting",
  verifyToken,
  hasRole(...roles, "BIGHIL", "user"),
  getSetting
);
settingRouter.patch(
  "/update-setting",
  verifyToken,
  hasRole(...roles, "BIGHIL", "user"),
  updateSetting
);

export default settingRouter;
