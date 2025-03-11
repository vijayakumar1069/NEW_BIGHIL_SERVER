// internal-thread.schema.js
import mongoose from "mongoose";

const internalThreadSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "complaint",
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "companyAdmin",
        required: true,
      },
    ],
    messages: [
      {
        content: String,
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "companyAdmin",
          required: true,
        },
        readBy: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "companyAdmin",
            },
            readAt: Date,
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// internalThreadSchema.index({ complaint: 1, archived: 1 });
// internalThreadSchema.index({ "messages.readBy.user": 1 });

export default mongoose.models?.InternalThread ||
  mongoose.model("InternalThread", internalThreadSchema);
