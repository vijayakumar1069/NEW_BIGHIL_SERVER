import { Server } from "socket.io";
import { corsOptions } from "../utils/constvalues.js";

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: corsOptions,
    // connectionStateRecovery: {
    //   maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    //   skipMiddlewares: true,
    // },
  });
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
  });

  io.engine.on("connection_error", (err) => {
    console.error("Socket connection error:", err);
  });

  return io;
};
