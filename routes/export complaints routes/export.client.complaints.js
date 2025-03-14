import express from "express";
import { hasRole, verifyToken } from "../../middlewars/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import {
  exportComplaintPdfForClient,
  exportComplaintsForClients,
} from "../../controllers/export complaints controllers/export.client.controllers.js";
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
  exportComplaintPdfForClient
);

export default exportRouter;
