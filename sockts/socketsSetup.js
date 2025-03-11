import { Server } from "socket.io";
import { corsOptions } from "../utils/constvalues.js";
import http from "http";
import express from "express";
import { socketAuth } from "./socket.auth.js";
import { handleMessage } from "./chatsFunctions.js";
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});
io.use(socketAuth);

io.on("connection", (socket) => {
  socket.on("joinRoom", (room) => {
    socket.join(room);
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
  });

  socket.on("joinComplaintRoom", (room) => {
    socket.join(room);
  });

  socket.on("leaveComplaintRoom", (room) => {
    socket.leave(room);
  });
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.user.id);
  });
  socket.on("send_message", (message) => {
    handleMessage(socket, message);
  });
  socket.on("leaveComplaintRoom", (room) => {
    socket.leave(room);
  });
  socket.on("joinChatRoom", (room) => {
    socket.join(room);
  });
  socket.on("leaveChatRoom", (room) => {
    socket.leave(room);
  });
});

export { io, server, app };
