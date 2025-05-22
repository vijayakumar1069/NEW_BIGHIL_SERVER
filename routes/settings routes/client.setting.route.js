import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import {
  getCurrentClientSettingInfo,
  loginTwoFactorVerification,
  updateClientSetting,
  verify2fa,
} from "../../controllers/setting controller/client.setting.controller.js";

const ClientSettingRouter = express.Router();

ClientSettingRouter.get(
  "/get-client-setting",
  verifyToken,
  hasRole(...roles),
  getCurrentClientSettingInfo
);
ClientSettingRouter.patch(
  "/update-client-setting",
  verifyToken,
  hasRole(...roles),
  updateClientSetting
);
ClientSettingRouter.post(
  "/verify-2fa",
  verifyToken,
  hasRole(...roles),
  verify2fa
);
ClientSettingRouter.post(
  "/login-2fa-verification",

  loginTwoFactorVerification
);
export default ClientSettingRouter;
