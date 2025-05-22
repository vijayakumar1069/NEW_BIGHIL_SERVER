import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectToDB } from "./utils/mongo_connection.js";
import errorHandler from "./utils/errorHandler.js";
import userAuthRoute from "./routes/auth routes/user.auth.route.js";
import userComplaintRouter from "./routes/complaints routes/user.complaints.route.js";
import dotenv from "dotenv";
import bighilAuthRoute from "./routes/auth routes/bighil.auth.route.js";
import bighilClientsRoute from "./routes/bighil routes/bighil.clients.route.js";
import companyRoute from "./routes/company routes/company.route.js";
import clientAuthRoute from "./routes/auth routes/client.auth.js";
import clientComplaintsRouter from "./routes/clients complaints routes/clients.complaints.route.js";
import chatRouter from "./routes/chats routes/chat.route.js";
import userNotificationRouter from "./routes/notifications routes/user.notifications.js";
import clientNotificationRouter from "./routes/notifications routes/client.notifications.js";
import { app, server } from "./sockets/socketsSetup.js";
import exportRouter from "./routes/export complaints routes/export.client.complaints.js";
import ForgotPasswordRouter from "./routes/forgot password routes/forgot.password.route.js";
import bighilComplaintRouter from "./routes/bighil complaint routes/bighil.complaint.route.js";
import clientDashboardRouter from "./routes/dashboard routes/client.dashboard.routes.js";
import { corsOptions } from "./consts/constValues.js";
import dashBoardRouter from "./routes/dashboard routes/bighil.dashboard.routes.js";
import { contactUsMessageController } from "./controllers/conatct-us controller/contact-us.controller.js";
import myAccountRouter from "./routes/account routes/account.routes.js";
import userSettingRouter from "./routes/settings routes/user.setting.route.js";
import ClientSettingRouter from "./routes/settings routes/client.setting.route.js";

dotenv.config();

const port = process.env.PORT || 5000;

// middleware
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
connectToDB();
app.set("view engine", "ejs");
app.set("trust proxy", 1);
// CORS Configuration

app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// Routes
app.use("/api/user-auth", userAuthRoute);
app.use("/api/bighil-auth", bighilAuthRoute);
app.use("/api/client-auth", clientAuthRoute);
app.use("/api/user-complaints", userComplaintRouter);
app.use("/api/user-notifications", userNotificationRouter);
app.use("/api/client-notifications", clientNotificationRouter);

app.use("/api/bighil-clients", bighilClientsRoute);
app.use("/api/companies", companyRoute);
app.use("/api/client", clientComplaintsRouter);
app.use("/api/bighil", bighilComplaintRouter);
app.use("/api/chats", chatRouter);
app.use("/api/account", myAccountRouter);
app.use("/api/user-setting", userSettingRouter);
app.use("/api/client-setting", ClientSettingRouter);

app.use("/api/client-dashboard", clientDashboardRouter);
app.use("/api/bighil-dashboard", dashBoardRouter);
app.use("/api/export-complaints", exportRouter);

app.use("/api/forgot-password", ForgotPasswordRouter);

app.use("/api/contact-us-message", contactUsMessageController);

app.get("/", (req, res) => {
  res.send("Welcome to the Complaint Management System API!");
});

app.use(errorHandler);

// Replace app.listen with httpServer.listen
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
