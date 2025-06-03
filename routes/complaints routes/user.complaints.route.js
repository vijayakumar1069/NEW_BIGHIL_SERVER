import express from "express";

import {
  getAllUserComplaintsForUser,
  particular_Complaint_For_User,
  userAddComplaint,
} from "../../controllers/user complaints controller/user.complaints.controller.js";
// import parser from "../../middleware/parser.js";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import uploadToCloudinary from "../../middleware/uploadToCloudinary.js";

const userComplaintRouter = express.Router();

userComplaintRouter.post(
  "/user-add-complaint",
  verifyToken,
  hasRole("user"),
  uploadToCloudinary("complaints", "files"), // folder, fieldName,
  // parser.array("files", 5),
  userAddComplaint
);
userComplaintRouter.get(
  "/my-complaints",
  verifyToken,
  hasRole("user"),
  getAllUserComplaintsForUser
);
userComplaintRouter.get(
  "/my-complaints/:id",
  verifyToken,
  hasRole("user"),

  particular_Complaint_For_User
);

export default userComplaintRouter;
