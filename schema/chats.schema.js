import mongoose from "mongoose";

const chatsSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "complaint",
      required: true,
    },
    messages: [
      {
        sender: {
          type: String,
          required: true,
          enum: ["user", "SUPER ADMIN", "ADMIN", "SUB ADMIN"],
        },
        content: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    unseenCounts: {
      user: { type: Number, default: 0 },
      subadmin: { type: Number, default: 0 },
      superadmin: { type: Number, default: 0 },
      admin: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Fix the export
const Chat = mongoose.models.Chat || mongoose.model("Chat", chatsSchema);
export default Chat;
