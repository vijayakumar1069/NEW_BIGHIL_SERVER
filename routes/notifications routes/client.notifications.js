import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import {
  clientDeleteAllNotifications,
  clientMarkAllNotificationsAsRead,
  clientNotificationMarkAsRead,
  deleteClientNotification,
  getClientNotifications,
  getUnreadCount,
} from "../../controllers/notification controllers/client.notifications.controllers.js";
import { validateActiveSession } from "../../middleware/validateActiveSession.js";

const clientNotificationRouter = express.Router();
clientNotificationRouter.get(
  "/unread-count",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  getUnreadCount
);

clientNotificationRouter.get(
  "/my-client-notifications",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  getClientNotifications
);
clientNotificationRouter.delete(
  "/client-delete-notification",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  deleteClientNotification
);
clientNotificationRouter.patch(
  "/client-mark-as-read",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  clientNotificationMarkAsRead
);
clientNotificationRouter.patch(
  "/client-mark-all-as-read",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  clientMarkAllNotificationsAsRead
);
clientNotificationRouter.delete(
  "/client-delete-all-notifications",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  clientDeleteAllNotifications
);

export default clientNotificationRouter;
