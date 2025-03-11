// notes.schema.js
import mongoose from "mongoose";

const notesSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Compliant",
      required: true,
    },
    complaintNote: {
      type: String,
      required: true,
    },
    addedBy: {
      type: String,
      required: true,
      enum: ["SUPER ADMIN", "ADMIN", "SUB ADMIN"],
    },
  },
  { timestamps: true }
);

// Create and export the model
const Note = mongoose.models?.Note || mongoose.model("Note", notesSchema);
export default Note;
