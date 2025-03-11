import Chat from "../schema/chats.schema.js";
import companyAdminSchema from "../schema/company.admin.schema.js";
import companySchema from "../schema/company.schema.js";
import complaintSchema from "../schema/complaint.schema.js";
import notificationSchema from "../schema/notification.schema.js";
import { io } from "./socketsSetup.js";

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
      return roleMap[role] || role.toLowerCase(); // Ensure consistent role naming
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
        $push: { messages: newMessage }, // Append the new message to the messages array
        $inc: incUpdate, // Increment unseen message counts for relevant roles
      },
      { new: true, upsert: true } // Return the updated document, create if not exists
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

    // Prepare recipients for notification
    const recipients = adminIds.map((adminId) => ({
      user: adminId,
      model: "companyAdmin",
    }));

    // Create or update notification for new messages
    if (recipients.length > 0) {
      const existing = await notificationSchema.findOneAndUpdate(
        {
          complaintId,
          type: "NEW_MESSAGE",
          "recipients.user": { $in: adminIds },
        },
        {
          $set: {
            createdAt: new Date(),
            message: `New message in complaint ${complaint.complaintId}`,
          },
        },
        { new: true }
      );

      if (!existing) {
        const newNotification = new notificationSchema({
          complaintId,
          type: "NEW_MESSAGE",
          sender: socket.user.id,
          senderModel: isOwner ? "USER" : "companyAdmin",
          message: `New message in complaint ${complaint.complaintId}`,
          recipients: isOwner
            ? recipients // Notify admins if the sender is the user
            : [{ user: complaint.userID, model: "USER" }], // Notify the user if sender is an admin
        });

        await newNotification.save();
      }
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

// Add this helper function
// This function takes a senderRole as an argument and returns an array of receiver roles based on the senderRole
// function getReceiverRoles(senderRole) {
//   // Create a map of sender roles to receiver roles
//   const roleMap = {
//     user: ["subadmin", "superadmin", "admin"],
//     // "SUB ADMIN": ["user", "superadmin", "admin"],
//     "SUPER ADMIN": ["user", "subadmin", "admin"],
//     ADMIN: ["user", "superadmin", "subadmin"],
//   };
//   // Return the array of receiver roles based on the senderRole
//   return roleMap[senderRole] || [];
// }
