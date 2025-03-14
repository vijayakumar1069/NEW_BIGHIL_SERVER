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
import { corsOptions } from "./utils/constvalues.js";
import { createServer } from "http";
import { initializeSocket } from "./sockts/socket.config.js";
import { registerSocketEvents } from "./sockts/events.js";
import chatRouter from "./routes/chats routes/chat.route.js";
import userNotificationRouter from "./routes/notifications routes/user.notifications.js";
import clientNotificationRouter from "./routes/notifications routes/client.notifications.js";
import { app, server } from "./sockts/socketsSetup.js";
import settingRouter from "./routes/setting routes/client.setting.routes.js";
import clientDashboardRouter from "./routes/dashbaord routes/client.dashboard.routes.js";
import exportRouter from "./routes/export complaints routes/export.client.complaints.js";
import ForgotPasswordRouter from "./routes/forgot password routes/forgot.password.route.js";

dotenv.config();

// const app = express();
const port = process.env.PORT || 5000;
// app.listen(port, () => console.log(`Server running on port ${port}`));
// const httpServer = createServer(app);
// const io = initializeSocket(httpServer);
// registerSocketEvents(io);
// app.use((req, res, next) => {
//   req.io = io; // Attach socket.io instance to request object
//   next();
// });

// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
connectToDB();

// CORS Configuration

app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// Routes
app.use("/api/user-auth", userAuthRoute);
app.use("/api/bigil-auth", bighilAuthRoute);
app.use("/api/client-auth", clientAuthRoute);
app.use("/api/user-complaints", userComplaintRouter);
app.use("/api/user-notifications", userNotificationRouter);
app.use("/api/client-notifications", clientNotificationRouter);

app.use("/api/bighil-clients", bighilClientsRoute);
app.use("/api/companies", companyRoute);
app.use("/api/client", clientComplaintsRouter);
app.use("/api/chats", chatRouter);
app.use("/api/setting", settingRouter);

app.use("/api/client-dashboard", clientDashboardRouter);
app.use("/api/export-complaints", exportRouter);

app.use("/api/forgot-password", ForgotPasswordRouter);

app.get("/", (req, res) => {
  res.send("Welcome to the Complaint Management System API!");
});

app.use(errorHandler);

// Replace app.listen with httpServer.listen
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
