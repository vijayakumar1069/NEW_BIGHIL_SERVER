import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { bighilRoles } from "../../utils/roles_const.js";
import { getAllComplaintForBighil } from "../../controllers/bighil complaints controllers/bighil.complaints.controller.js";

const bighilComplaintRouter = express.Router();

bighilComplaintRouter.get(
  "/get-filtered-complaints",
  verifyToken,
  hasRole(...bighilRoles),
  getAllComplaintForBighil
);

export default bighilComplaintRouter;
