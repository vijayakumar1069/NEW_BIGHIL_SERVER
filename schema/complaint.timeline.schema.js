import mongoose from "mongoose";

const timeLineSchema = new mongoose.Schema({
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Compliant",
    required: true,
  },
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
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "companyAdmin",
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  visibleToUser: {
    type: Boolean,
    default: false, // or false if you want it hidden by default
  },
  message: String,
});

export default mongoose.models.timeLineModel ||
  mongoose.model("timeLineModel", timeLineSchema);
