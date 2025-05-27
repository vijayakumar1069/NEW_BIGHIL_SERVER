import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    submissionType: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    complaintUser: {
      type: String,
      required: false,
    },
    complaintUserEmail: {
      type: String,
      required: false,
    },
    complaintType: {
      type: String,
      required: true,
      enum: ["Anonymous", "Non-Anonymous"],
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
      enum: [
        "Pending",
        "In Progress",
        "Unwanted",
        "Resolved",
        "Pending Authorization",
      ],
      default: "Pending",
    },
    previous_status_of_client: {
      type: String,
      enum: [
        "Pending",
        "In Progress",
        "Unwanted",
        "Resolved",
        "Pending Authorization",
      ],
      default: "Pending",
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

    actionMessage: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "resolution",
      },
    ],
    authorizationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
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
    authoriseRejectionReason: [
      {
        type: String,
      },
    ],
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
