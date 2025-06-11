import { io } from "../sockets/socketsSetup.js";

export function emitNotifications(notifications) {
  notifications.forEach(({ notification, userId, adminId }) => {

    if (userId) {
      io.to(`user_${userId}`).emit("fetch_user_notifications", notification);
    }
    if (adminId) {
      io.to(`admin_${adminId}`).emit("fetch_admin_notifications", notification);
    }
  });
}
