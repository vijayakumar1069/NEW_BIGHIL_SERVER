import express from "express";
import {
  AddNoteToComplaint,
  ClosetheComplaint,
  ComplaintStatusUpdate,
  getAllComplaintsCurrentForClient,
  getParticularComplaintForClient,
} from "../../controllers/user complaints controller/clients.complaints.controller.js";
import { hasRole, verifyToken } from "../../middlewars/verifyToken.js";
import { editRoles, roles } from "../../utils/roles_const.js";
import { clinetComplaintsFilters } from "../../controllers/complaints filters controllers/clients.complaints.filter.controller.js";

const clientComplaintsRouter = express.Router();

clientComplaintsRouter.get(
  "/get-complaints",
  verifyToken,
  hasRole(...roles),
  getAllComplaintsCurrentForClient
);
clientComplaintsRouter.get(
  "/get-complaint/:complaintId",
  verifyToken,
  hasRole(...roles),
  getParticularComplaintForClient
);
clientComplaintsRouter.post(
  "/add-note/:complaintId",
  verifyToken,
  hasRole(...roles),
  AddNoteToComplaint
);
clientComplaintsRouter.patch(
  "/change-status/:complaintId",
  verifyToken,
  hasRole(...editRoles),
  ComplaintStatusUpdate
);
clientComplaintsRouter.patch(
  "/close-complaint/:complaintId",
  verifyToken,
  hasRole(...editRoles),
  ClosetheComplaint
);
clientComplaintsRouter.get(
  "/get-filtered-complaints",
  verifyToken,
  hasRole(...roles),
  clinetComplaintsFilters
);

export default clientComplaintsRouter;
