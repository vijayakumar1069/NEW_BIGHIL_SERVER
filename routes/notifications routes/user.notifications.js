import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import {
  deleteUserNotification,
  getUserNotifications,
  userNotificationMarkAsRead,
  getUnreadCountForUser,
  userMarkAllNotificationsAsRead,
  userDeleteAllNotifications,
} from "../../controllers/notification controllers/user.notifications.controllers.js";

const userNotificationRouter = express.Router();

userNotificationRouter.get(
  "/unread-count",
  verifyToken,
  hasRole("user"),
  getUnreadCountForUser
);
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
userNotificationRouter.patch(
  "/mark-all-as-read",
  verifyToken,
  hasRole("user"),
  userMarkAllNotificationsAsRead
);
userNotificationRouter.delete(
  "/delete-all-notifications",
  verifyToken,
  hasRole("user"),
  userDeleteAllNotifications
);

export default userNotificationRouter;
