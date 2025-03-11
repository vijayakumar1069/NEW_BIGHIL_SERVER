// notification.schema.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "complaint",
      required: true,
      // index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "NEW_MESSAGE",
        "STATUS_CHANGE",
        "NOTE_ADDED",
        "RESOLUTION_ADDED",

        "NEW_COMPLAINT",
      ],
    },
    message: {
      // Human-readable notification text
      type: String,
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderModel",
      required: true,
    },
    senderModel: {
      type: String,
      required: true,
      enum: ["USER", "companyAdmin"],
    },
    recipients: [
      {
        _id: false,
        user: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "recipients.model",
          //   required: true,
        },
        model: {
          type: String,
          //   required: true,
          enum: ["USER", "companyAdmin"],
        },
        read: {
          type: Boolean,
          default: false,
        },
        readAt: Date,
      },
    ],
    // relatedMessage: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Chat.messages",
    // },
    // relatedStatus: {
    //   type: String,
    //   enum: ["Pending", "In Progress", "Unwanted", "Resolved"],
    // },
  },
  {
    timestamps: true,
  }
);

// Indexes for frequent queries
notificationSchema.index({ complaint: 1, createdAt: -1 });
notificationSchema.index({ "recipients.user": 1, "recipients.read": 1 });

export default mongoose.models?.Notification ||
  mongoose.model("Notification", notificationSchema);
