export const configureNotifications = (io, socket) => {
  // Subscribe user to their personal notifications room
  socket.join(`user_${socket.user.id}`);

  // const handleStatusUpdate = (updateData) => {
  //   // Implement notification logic for complaint status changes
  //   io.to(`complaint_${updateData.complaintId}`).emit(
  //     "status_update",
  //     updateData
  //   );
  // };

  // socket.on("status_update", handleStatusUpdate);
};
