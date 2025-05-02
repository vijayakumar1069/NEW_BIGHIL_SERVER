import Chat from "../schema/chats.schema.js";
import companyAdminSchema from "../schema/company.admin.schema.js";
import companySchema from "../schema/company.schema.js";
import complaintSchema from "../schema/complaint.schema.js";
import notificationSchema from "../schema/notification.schema.js";
import { io } from "./socketsSetup.js";

// Updated handleMessage function for backend - Only change this part
export const handleMessage = async (socket, { complaintId, message }) => {
  try {
    // Step 1: Validate if the complaint exists
    const complaint = await complaintSchema.findById(complaintId);
    if (!complaint) throw new Error("Complaint not found");

    // Step 2: Verify user permissions
    const isOwner = complaint.userID.toString() === socket.user.id;
    const isAuthorizedAdmin =
      ["SUPER ADMIN", "ADMIN"].includes(socket.user.role) &&
      (await companyAdminSchema.exists({ _id: socket.user.id }));
    if (!isOwner && !isAuthorizedAdmin) {
      throw new Error("Unauthorized to send message");
    }

    // Step 3: Prepare message object
    const newMessage = {
      sender: socket.user.role,
      content: message.content,
      createdAt: new Date(),
    };

    // Define role mappings for consistent role naming
    const roleMap = {
      user: "user",
      "SUB ADMIN": "subadmin",
      "SUPER ADMIN": "superadmin",
      ADMIN: "admin",
    };

    // Define room identifiers
    const chatRoom = `chat_${complaintId}`;

    // Fetch active sockets in the chat room and extract user roles
    const activeSockets = await io.in(chatRoom).fetchSockets();
    const activeRoles = activeSockets.map((s) => {
      const role = s.user.role;
      return roleMap[role] || role.toLowerCase();
    });

    // Map sender role for unseen message count tracking
    const senderRole = roleMap[socket.user.role] || "user";

    // Define all possible roles
    const allRoles = ["user", "subadmin", "superadmin", "admin"];

    // Determine roles that should have unseen message count incremented (excluding sender & active users)
    const filteredRoles = allRoles.filter(
      (role) => role !== senderRole && !activeRoles.includes(role)
    );

    // Build increment object for unseen message count updates in MongoDB
    const incUpdate = {};
    filteredRoles.forEach((role) => {
      incUpdate[`unseenCounts.${role}`] = 1;
    });

    // Step 4: Update the chat document with the new message and unseen counts
    const updatedChat = await Chat.findOneAndUpdate(
      { complaintId },
      {
        $push: { messages: newMessage },
        $inc: incUpdate,
      },
      { new: true, upsert: true }
    );

    // Broadcast message and unseen counts update to all clients in the chat room
    io.to(`complaint_${complaintId}`).emit("new_message", newMessage);
    io.to(`complaint_${complaintId}`).emit("unseen_counts_update", {
      complaintId,
      counts: updatedChat.unseenCounts,
    });

    // Step 5: Handle notifications for company admins
    const company = await companySchema.findOne({
      companyName: complaint.companyName,
    });
    if (!company) throw new Error("Company not found");

    // Fetch company admins excluding the sender
    const companyAdmins = await companyAdminSchema.find({
      companyId: company._id,
    });
    const adminIds = companyAdmins
      .map((admin) => admin._id.toString())
      .filter((id) => id !== socket.user.id);

    // Prepare notification content
    const notificationMessage = `New message in complaint ${complaint.complaintId}`;

    // FIXED: Create different notification approaches for user vs admin sender
    if (isOwner) {
      // User sent a message - notify all admins individually
      for (const adminId of adminIds) {
        const adminRoom = `admin_${adminId}`;

        // Create or update notification
        const notification = await notificationSchema.findOneAndUpdate(
          {
            complaintId,
            type: "NEW_MESSAGE",
            "recipients.user": adminId,
            sender: socket.user.id,
          },
          {
            $set: {
              message: notificationMessage,
              createdAt: new Date(),
              isRead: false,
            },
            $setOnInsert: {
              sender: socket.user.id,
              senderModel: "USER",
              recipients: [{ user: adminId, model: "companyAdmin" }],
            },
          },
          { new: true, upsert: true }
        );

        // Direct targeted emission to specific admin room
        io.to(adminRoom).emit("fetch_admin_notifications", notification);
      }
    } else {
      // Admin sent a message - notify the user
      const userRoom = `user_${complaint.userID}`;

      // Create or update notification for user
      const notification = await notificationSchema.findOneAndUpdate(
        {
          complaintId,
          type: "NEW_MESSAGE",
          "recipients.user": complaint.userID,
          sender: socket.user.id,
        },
        {
          $set: {
            message: notificationMessage,
            createdAt: new Date(),
            isRead: false,
          },
          $setOnInsert: {
            sender: socket.user.id,
            senderModel: "companyAdmin",
            recipients: [{ user: complaint.userID, model: "USER" }],
          },
        },
        { new: true, upsert: true }
      );

      // Direct targeted emission to user room
      io.to(userRoom).emit("fetch_user_notifications", notification);
    }

    // Step 6: Link chat to the complaint if it's not already linked
    if (!complaint.chats) {
      await complaintSchema.findByIdAndUpdate(complaintId, {
        $set: { chats: updatedChat._id },
      });
    }

    return updatedChat;
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};
