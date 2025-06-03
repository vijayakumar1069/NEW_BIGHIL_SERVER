import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { bighilRoles, pdfAccessRoles, roles } from "../../utils/roles_const.js";
import {
  exportComplaintsForBighil,
  exportComplaintsForClients,
} from "../../controllers/export complaints controllers/export.client.controllers.js";
import {
  generateComplaintPDFPreview,
  generateComplaintPDFStream,
} from "../../controllers/export complaints controllers/export.pdf.controller.js";
import { validateActiveSession } from "../../middleware/validateActiveSession.js";
const exportRouter = express.Router();

exportRouter.get(
  "/for-client",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  exportComplaintsForClients
);
exportRouter.get(
  "/for-bighil",
  verifyToken,
  hasRole(...bighilRoles),
  exportComplaintsForBighil
);

exportRouter.get(
  "/:id/pdf",
  verifyToken,
  hasRole(...pdfAccessRoles),
  generateComplaintPDFStream
);
exportRouter.get(
  "/:id/pdf-preview",
  verifyToken,
  hasRole(...pdfAccessRoles),
  generateComplaintPDFPreview
);

export default exportRouter;
