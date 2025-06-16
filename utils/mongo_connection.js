import mongoose from "mongoose";

import dotenv from "dotenv";

dotenv.config();
export const connectToDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) throw new Error("MONGO_URI is not defined in .env file");

    // Enhanced connection options
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      // bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
      retryWrites: true,
      retryReads: true,
    };

    await mongoose.connect(uri, options);
    console.log("✅ Connected to MongoDB");

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
};
