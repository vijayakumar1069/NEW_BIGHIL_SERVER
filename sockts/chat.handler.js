import { handleMessage } from "./chatsFunctions.js";

export const configureChat = (io, socket) => {
  socket.on("join_complaint", (complaintId) => {
    const roomName = `${complaintId}`;

    socket.join(roomName);
  });

  // Pass socket and io to handleMessage
  socket.on("send_message", (data) => handleMessage(io, socket, data));
};
