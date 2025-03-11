import Chat from "../../schema/chats.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";
import { io } from "../../sockts/socketsSetup.js";

export async function getAllchats(req, res, next) {
  const { complaintId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;

  try {
    const complaint = await complaintSchema.findById(complaintId).populate({
      path: "chats",
      options: {
        sort: { createdAt: -1 },
        skip: (page - 1) * limit,
        limit: limit,
      },
    });

    const totalMessages = complaint.chats?.messages?.length || 0;
    const totalPages = Math.ceil(totalMessages / limit);

    res.status(200).json({
      success: true,
      data: {
        messages: complaint.chats?.messages || [],
        currentPage: page,
        totalPages,
      },
      userRole: req.user.role,
    });
  } catch (error) {
    next(error);
  }
}

// In chats.controllers.js
export async function markAsRead(req, res) {
  try {
    // Get complaintId from request parameters or body
    const complaintId = req.params.complaintId || req.body.complaintId;

    if (!complaintId) {
      return res.status(400).json({
        success: false,
        message: "Missing complaintId",
      });
    }

    // Map frontend roles to database field names
    const roleMap = {
      user: "user",
      "SUB ADMIN": "subadmin",
      "SUPER ADMIN": "superadmin",
      ADMIN: "admin",
    };

    const currentUserRole = roleMap[req.user.role];

    if (!currentUserRole) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    // Create update object to set the current user role's unseen count to 0
    const updateObj = {};
    updateObj[`unseenCounts.${currentUserRole}`] = 0;

    // Update the chat document
    const updatedChat = await Chat.findOneAndUpdate(
      { complaintId },
      { $set: updateObj },
      { new: true }
    );

    if (!updatedChat) {
      // If no chat exists yet, create one with all counts at 0
      const newChat = new Chat({
        complaintId,
        messages: [],
        unseenCounts: { user: 0, subadmin: 0, superadmin: 0, admin: 0 },
      });

      await newChat.save();

      // Broadcast the zeroed counts
      io.to(`complaint_${complaintId}`).emit("unseen_counts_update", {
        complaintId,
        counts: newChat.unseenCounts,
      });

      return res.status(200).json({
        success: true,
        unseenCounts: newChat.unseenCounts,
      });
    }

    // Broadcast updated counts to all clients in the room
    io.to(`complaint_${complaintId}`).emit("unseen_counts_update", {
      complaintId,
      counts: updatedChat.unseenCounts,
    });

    res.status(200).json({
      success: true,
      unseenCounts: updatedChat.unseenCounts,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      message: "Server error while marking messages as read",
      error: error.message,
    });
  }
}
