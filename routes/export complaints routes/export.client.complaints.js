import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { bighilRoles, roles } from "../../utils/roles_const.js";
import {
  exportComplaintsForBighil,
  exportComplaintsForClients,
} from "../../controllers/export complaints controllers/export.client.controllers.js";
import { generateComplaintPDFStream } from "../../controllers/export complaints controllers/export.pdf.controller.js";
const exportRouter = express.Router();

exportRouter.get(
  "/for-client",
  verifyToken,
  hasRole(...roles),
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
  hasRole(...roles),
  generateComplaintPDFStream
);

export default exportRouter;
