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
      enum: ["ConsultedAndClosed", "NoUserResponse"],
      required: true,
    },

    resolutionNote: {
      type: String,
      required: true,
    },
    addedBy: {
      type: String,
      required: true,
      enum: ["SUPER ADMIN", "ADMIN"],
    },
  },
  { timestamps: true }
);
export default mongoose.models.resolution ||
  mongoose.model("resolution", resolutionSchema);
