import mongoose from "mongoose";

const accountDeleteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reason: {
      type: [String], // <-- Array of strings
      required: true,
    },
    additionalComments: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.accountDeleteSchema ||
  mongoose.model("accountDeleteSchema", accountDeleteSchema);
