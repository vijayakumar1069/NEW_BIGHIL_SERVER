import mongoose from "mongoose";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

export const connectToDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) throw new Error("MONGO_URI is not defined in .env file");

    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
};
