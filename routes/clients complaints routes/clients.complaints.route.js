import express from "express";
import {
  AddNoteToComplaint,
  CloseTheComplaint,
  complaintAuthorizationStatusUpdate,
  ComplaintStatusUpdate,
  getAllComplaintsCurrentForClient,
  getParticularComplaintForClient,
  getVisibleToIT,
} from "../../controllers/user complaints controller/clients.complaints.controller.js";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { editRoles, roles } from "../../utils/roles_const.js";
import { clientComplaintFilters } from "../../controllers/complaints filters controllers/clients.complaints.filter.controller.js";
import uploadToCloudinary from "../../middleware/uploadToCloudinary.js";
import { validateActiveSession } from "../../middleware/validateActiveSession.js";

const clientComplaintsRouter = express.Router();

clientComplaintsRouter.get(
  "/get-complaints",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,

  getAllComplaintsCurrentForClient
);
clientComplaintsRouter.get(
  "/get-complaint/:complaintId",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,

  getParticularComplaintForClient
);
clientComplaintsRouter.post(
  "/add-note/:complaintId",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  uploadToCloudinary("attachment", "attachment"),

  AddNoteToComplaint
);
clientComplaintsRouter.patch(
  "/change-status/:complaintId",
  verifyToken,
  hasRole(...editRoles),
  validateActiveSession,

  ComplaintStatusUpdate
);
clientComplaintsRouter.patch(
  "/close-complaint/:complaintId",
  verifyToken,
  hasRole(...editRoles),
  validateActiveSession,

  CloseTheComplaint
);
clientComplaintsRouter.get(
  "/get-filtered-complaints",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,

  clientComplaintFilters
);
clientComplaintsRouter.patch(
  "/change-authorization-status/:complaintId",
  verifyToken,
  hasRole("SUPER ADMIN"),
  validateActiveSession,

  complaintAuthorizationStatusUpdate
);
clientComplaintsRouter.get(
  "/visible-to-it",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,

  getVisibleToIT
);
export default clientComplaintsRouter;
