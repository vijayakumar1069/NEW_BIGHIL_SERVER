import express from "express";
import { hasRole, verifyToken } from "../../middlewars/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import {
  getComplaintsTimeline,
  getDashboardStats,
  getKeywordsCharts,
  getMaximumComplaintsAgainst,
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
  "/more-complaints-against",
  verifyToken,
  hasRole(...roles),
  getMaximumComplaintsAgainst
);

export default clientDashboardRouter;
