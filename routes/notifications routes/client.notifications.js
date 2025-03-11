import express from "express";
import { hasRole, verifyToken } from "../../middlewars/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import {
  clientNotificationMarkAsRead,
  deleteClientNotification,
  getClientNotifications,
} from "../../controllers/notification controllers/client.notifications.controllers.js";

const clientNotificationRouter = express.Router();

clientNotificationRouter.get(
  "/my-client-notifications",
  verifyToken,
  hasRole(...roles),
  getClientNotifications
);
clientNotificationRouter.delete(
  "/client-delete-notification",
  verifyToken,
  hasRole(...roles),
  deleteClientNotification
);
clientNotificationRouter.patch(
  "/client-mark-as-read",
  verifyToken,
  hasRole(...roles),
  clientNotificationMarkAsRead
);

export default clientNotificationRouter;
