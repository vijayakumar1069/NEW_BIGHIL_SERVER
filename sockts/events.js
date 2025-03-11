import { configureChat } from "./chat.handler.js";
import { configureNotifications } from "./configureNotifications.js";
import { socketAuth } from "./socket.auth.js";

export const registerSocketEvents = (io) => {
  // io.use(socketAuth);

  io.on("connection", (socket) => {
    // Initialize handlers
    configureChat(io, socket);
    configureNotifications(io, socket);
    // configureComplaints(io, socket);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
};
