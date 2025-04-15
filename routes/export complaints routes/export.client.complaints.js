import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import { exportComplaintsForClients } from "../../controllers/export complaints controllers/export.client.controllers.js";
import { generateComplaintPDFStream } from "../../controllers/export complaints controllers/export.pdf.controller.js";
const exportRouter = express.Router();

exportRouter.get(
  "/for-client",
  verifyToken,
  hasRole(...roles),
  exportComplaintsForClients
);

exportRouter.get(
  "/:id/pdf",
  verifyToken,
  hasRole(...roles),
  generateComplaintPDFStream
);

export default exportRouter;
