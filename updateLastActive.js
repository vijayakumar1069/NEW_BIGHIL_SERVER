// updateLastActive.ts
import mongoose from "mongoose";
import userSchema from "./schema/user.schema.js";
import { connectToDB } from "./utils/mongo_connection.js";

async function updateLastActiveForAllUsers() {
  try {
    await connectToDB();

    const result = await userSchema.updateMany(
      { lastActive: { $exists: false } }, // ✅ Only update if missing
      { $set: { lastActive: new Date() } }
    );

    console.log("Updated Users:", result.modifiedCount);
  } catch (err) {
    console.error("Failed to update users:", err);
  } finally {
    mongoose.disconnect();
  }
}

updateLastActiveForAllUsers();
