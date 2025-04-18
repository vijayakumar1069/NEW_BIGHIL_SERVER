import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    complaintAgainst: {
      type: String,
      required: true,
    },
    complaintMessage: {
      type: String,
      required: true,
    },

    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "USER",
      required: true,
    },
    tags: [
      {
        type: String,
      },
    ],

    evidence: [
      {
        path: {
          type: String,
        },

        fileName: {
          type: String,
        },
      },
    ],

    status_of_client: {
      type: String,
      enum: ["Pending", "In Progress", "Unwanted", "Resolved"],
    },
    timeline: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "timeLineModel",
      },
    ],
    notes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }],

    chats: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },

    actionMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "resolution",
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW",
    },
    complaintId: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

complaintSchema.index({ complaintId: 1 });
complaintSchema.index({ status_of_client: 1 });
complaintSchema.index({ createdAt: 1 });
complaintSchema.index({ companyName: 1 });

export default mongoose.models?.complaints ||
  mongoose.model("complaint", complaintSchema);
