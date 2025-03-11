import express from "express";
import { hasRole, verifyToken } from "../../middlewars/verifyToken.js";
import {
  deleteUserNotification,
  getUserNotifications,
  userNotificationMarkAsRead,
} from "../../controllers/notification controllers/user.notifications.controllers.js";

const userNotificationRouter = express.Router();

userNotificationRouter.get(
  "/my-notifications",
  verifyToken,
  hasRole("user"),
  getUserNotifications
);
userNotificationRouter.delete(
  "/delete-notification",
  verifyToken,
  hasRole("user"),
  deleteUserNotification
);
userNotificationRouter.patch(
  "/mark-as-read",
  verifyToken,
  hasRole("user"),
  userNotificationMarkAsRead
);

export default userNotificationRouter;
