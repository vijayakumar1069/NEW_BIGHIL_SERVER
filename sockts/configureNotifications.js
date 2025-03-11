// import { handleStatusChange } from "./notificationFunctions.js";

export const configureNotifications = (io, socket) => {
  socket.on("join_room", (roomName) => {
    socket.join(roomName);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.user.id}`);
  });
};
