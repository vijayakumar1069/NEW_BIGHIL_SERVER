import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { connectToDB } from "./utils/mongo_connection.js";
import errorHandler from "./utils/errorHandler.js";
import { corsOptions } from "./consts/constValues.js";
import { app, server } from "./sockets/socketsSetup.js";
import { initializeSessionCleanup } from "./controllers/auth controllers/client.auth.controller.js";

// Route Imports
import userAuthRoute from "./routes/auth routes/user.auth.route.js";
import bighilAuthRoute from "./routes/auth routes/bighil.auth.route.js";
import clientAuthRoute from "./routes/auth routes/client.auth.js";

import userComplaintRouter from "./routes/complaints routes/user.complaints.route.js";
import clientComplaintsRouter from "./routes/clients complaints routes/clients.complaints.route.js";
import bighilComplaintRouter from "./routes/bighil complaint routes/bighil.complaint.route.js";

import userNotificationRouter from "./routes/notifications routes/user.notifications.js";
import clientNotificationRouter from "./routes/notifications routes/client.notifications.js";

import bighilClientsRoute from "./routes/bighil routes/bighil.clients.route.js";
import companyRoute from "./routes/company routes/company.route.js";

import chatRouter from "./routes/chats routes/chat.route.js";

import myAccountRouter from "./routes/account routes/account.routes.js";
import userSettingRouter from "./routes/settings routes/user.setting.route.js";
import ClientSettingRouter from "./routes/settings routes/client.setting.route.js";

import clientDashboardRouter from "./routes/dashboard routes/client.dashboard.routes.js";
import dashBoardRouter from "./routes/dashboard routes/bighil.dashboard.routes.js";

import statisticsRouter from "./routes/statistics routes/statistics.route.js";
import exportRouter from "./routes/export complaints routes/export.client.complaints.js";
import ForgotPasswordRouter from "./routes/forgot password routes/forgot.password.route.js";

import { contactUsMessageController } from "./controllers/conatct-us controller/contact-us.controller.js";
import { clientRequestController } from "./controllers/client request controller/client.request.controller.js";

// Config
dotenv.config();
const port = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------------
// Middleware Setup
// ----------------------------------------
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Preflight support

// Static Assets & Templating
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.set("view engine", "ejs");
app.set("trust proxy", 1);

// Database Connection & Cleanup
connectToDB();
initializeSessionCleanup();

// ----------------------------------------
// Routes Setup
// ----------------------------------------

// Auth
app.use("/api/user-auth", userAuthRoute);
app.use("/api/bighil-auth", bighilAuthRoute);
app.use("/api/client-auth", clientAuthRoute);

// Complaints
app.use("/api/user-complaints", userComplaintRouter);
app.use("/api/client", clientComplaintsRouter);
app.use("/api/bighil", bighilComplaintRouter);

// Notifications
app.use("/api/user-notifications", userNotificationRouter);
app.use("/api/client-notifications", clientNotificationRouter);

// Entities
app.use("/api/bighil-clients", bighilClientsRoute);
app.use("/api/companies", companyRoute);

// Chats
app.use("/api/chats", chatRouter);

// Settings & Account
app.use("/api/account", myAccountRouter);
app.use("/api/user-setting", userSettingRouter);
app.use("/api/client-setting", ClientSettingRouter);

// Dashboards
app.use("/api/client-dashboard", clientDashboardRouter);
app.use("/api/bighil-dashboard", dashBoardRouter);

// Others
app.use("/api/stats", statisticsRouter);
app.use("/api/export-complaints", exportRouter);
app.use("/api/forgot-password", ForgotPasswordRouter);
app.use("/api/contact-us-message", contactUsMessageController);
app.use("/api/client-request-access", clientRequestController);

// Health Check
app.get("/", (req, res) => {
  res.send("Welcome to the Complaint Management System API!");
});

// Error Handling
app.use(errorHandler);

// Server
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
