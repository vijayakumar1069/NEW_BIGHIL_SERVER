import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import {
  getComplaintsTimeline,
  getDashboardStats,
  getKeywordsCharts,
  getMaximumComplaintsDepartment,
  getRecentComplaints,
  getRecentNotifications,
} from "../../controllers/dashboard controllers/client.dashboard.controllers.js";

const clientDashboardRouter = express.Router();

clientDashboardRouter.get(
  "/stats",
  verifyToken,
  hasRole(...roles),
  getDashboardStats
);
clientDashboardRouter.get(
  "/complaints-timeline",
  verifyToken,
  hasRole(...roles),
  getComplaintsTimeline
);
clientDashboardRouter.get(
  "/recent-complaints",
  verifyToken,
  hasRole(...roles),
  getRecentComplaints
);
clientDashboardRouter.get(
  "/recent-notifications",
  verifyToken,
  hasRole(...roles),
  getRecentNotifications
);
clientDashboardRouter.get(
  "/keywords-charts",
  verifyToken,
  hasRole(...roles),
  getKeywordsCharts
);
clientDashboardRouter.get(
  "/top-department",
  verifyToken,
  hasRole(...roles),
  getMaximumComplaintsDepartment
);

export default clientDashboardRouter;
