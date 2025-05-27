import mongoose from "mongoose";
const resolutionSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "complaint",
      required: true,
    },
    acknowledgements: {
      type: String,
      enum: ["Consulted And Closed", "No User Response", "Marked As Unwanted"],
      required: true,
    },

    resolutionNote: {
      type: String,
      required: true,
    },
    addedBy: {
      type: String,
      required: true,
      enum: ["SUB ADMIN"],
    },
    requiresAuthorization: {
      type: Boolean,
      default: true,
    },
    authorizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
    },
    authorizationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
    },
    reason: String, // For unwanted complaints
  },
  { timestamps: true }
);
export default mongoose.models.resolution ||
  mongoose.model("resolution", resolutionSchema);
