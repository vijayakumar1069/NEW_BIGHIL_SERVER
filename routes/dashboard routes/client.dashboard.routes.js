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
import { validateActiveSession } from "../../middleware/validateActiveSession.js";

const clientDashboardRouter = express.Router();

clientDashboardRouter.get(
  "/stats",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  getDashboardStats
);
clientDashboardRouter.get(
  "/complaints-timeline",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  getComplaintsTimeline
);
clientDashboardRouter.get(
  "/recent-complaints",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  getRecentComplaints
);
clientDashboardRouter.get(
  "/recent-notifications",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  getRecentNotifications
);
clientDashboardRouter.get(
  "/keywords-charts",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  getKeywordsCharts
);
clientDashboardRouter.get(
  "/top-department",
  verifyToken,
  hasRole(...roles),
  validateActiveSession,
  getMaximumComplaintsDepartment
);

export default clientDashboardRouter;
