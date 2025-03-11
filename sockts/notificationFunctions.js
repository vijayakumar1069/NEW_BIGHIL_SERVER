import complaintSchema from "../schema/complaint.schema.js";
import timelinemodel from "../schema/complaint.timeline.schema.js";
import notificationSchema from "../schema/notification.schema.js";

export async function handleStatusChange(io, socket, data) {
  const { complaintId, status } = data;
  // const { complaintId } = req.params;
  // const { status } = req.body;
  try {
    const complaint = await complaintSchema.findById(complaintId);
    if (!complaint) {
      const error = new Error("Complaint not found");
      error.statusCode = 404;
      throw error;
    }
    complaint.status_of_client = status;
    await complaint.save();
    const newTimeObj = {
      complaintId: complaint._id,
      status_of_client: status,
      changedBy: socket.user.id,
      timestamp: Date.now(),
      message: "Status updated",
    };
    const newLineTime = await timelinemodel.create(newTimeObj);
    complaint.timeline.push(newLineTime._id);
    await complaint.save();

    const newNotification = await notificationSchema({
      complaintId: complaintId,
      type: "STATUS_CHANGE",
      sender: socket.user.id,
      senderModel: "companyAdmin",
      message: `Complaint status updated to ${status}`,
      recipients: [
        {
          user: complaint.userID,
          model: "USER",
        },
      ],
    });
    await newNotification.save();
    let returnData = {
      status_of_client: complaint.status_of_client,
      timelineEvent: newLineTime,
    };

    io.to(`complaint_${complaintId}`).emit("status_get", returnData);

    // res.status(200).json({
    //   success: true,
    //   message: "Complaint status updated successfully",
    //   data: returnData,
    // });
  } catch (error) {
    socket.emit("error", error.message);
    console.error("Chat error:", error);
  }
}
