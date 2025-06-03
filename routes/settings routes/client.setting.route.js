import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { editRoles, roles, settingsRoles } from "../../utils/roles_const.js";
import {
  deleteAdmin,
  disableAdmin,
  getCurrentClientAdmins,
  getCurrentClientSettingInfo,
  loginTwoFactorVerification,
  updateAdmin,
  updateClientSetting,
  verify2fa,
} from "../../controllers/setting controller/client.setting.controller.js";
import { validateActiveSession } from "../../middleware/validateActiveSession.js";

const ClientSettingRouter = express.Router();

ClientSettingRouter.get(
  "/get-client-setting",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  getCurrentClientSettingInfo
);
ClientSettingRouter.patch(
  "/update-client-setting",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
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
ClientSettingRouter.get(
  "/get-all-admins",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  getCurrentClientAdmins
);
ClientSettingRouter.patch(
  "/update-admin/:adminId",
  verifyToken,
  hasRole(...settingsRoles),
  validateActiveSession,
  updateAdmin
);

ClientSettingRouter.patch(
  "/disable-admin/:adminId",
  verifyToken,
  validateActiveSession,
  hasRole(...settingsRoles),
  disableAdmin
);
ClientSettingRouter.delete(
  "/delete-admin/:adminId",
  verifyToken,
  hasRole(...settingsRoles),
  validateActiveSession,
  deleteAdmin
);
export default ClientSettingRouter;
