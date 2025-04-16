import express from "express";
import {
  getAllChats,
  markAsRead,
} from "../../controllers/chat controllers/chats.controller.js";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { allAccessRoles, roles } from "../../utils/roles_const.js";

const chatRouter = express.Router();

chatRouter.get(
  "/get-chats/:complaintId",
  verifyToken,
  hasRole(...allAccessRoles),
  getAllChats
);
chatRouter.patch(
  "/chat-mark-as-read/:complaintId",
  verifyToken,
  hasRole(...allAccessRoles),
  markAsRead
);

export default chatRouter;
