import mongoose from "mongoose";

const timeLineSchema = new mongoose.Schema({
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Compliant",
    required: true,
  },
  status_of_client: {
    type: String,
    enum: ["Pending", "In Progress", "Unwanted", "Resolved"],
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
  message: String,
});

export default mongoose.models.timeLineModel ||
  mongoose.model("timeLineModel", timeLineSchema);
