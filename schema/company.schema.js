import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    contactNumber: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\+\d{1,15}$/.test(v);
        },
        message:
          "Invalid contact number format. Please use the format +[country code][phone number]",
      },
    },
    companyEmail: {
      type: String,
      required: true,
    },
    companyAddress: {
      type: String,
      required: true,
    },

    companyType: {
      type: String,
      required: true,
    },
    companySize: {
      type: Number,

      default: 0,
    },
    visibleToIT: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models?.company ||
  mongoose.model("company", companySchema);
