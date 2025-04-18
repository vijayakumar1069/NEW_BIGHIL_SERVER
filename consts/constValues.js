// src/utils/constValues.js
import dotenv from "dotenv";
dotenv.config();

export const corsOptions = {
  origin: [
    "https://bighilclient.vercel.app",
    "http://localhost:3000",
    process.env.CLIENT_DEV_URL,
    process.env.CLIENT_PROD_URL,
  ],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  exposedHeaders: ["Set-Cookie"],
};
