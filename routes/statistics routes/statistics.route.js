import express from "express";
import { verifyToken, hasRole } from "../../middleware/verifyToken.js";
import { statisticsAccessRoles } from "../../utils/roles_const.js";
import {
  getClientSummary,
  getMonthlyTrends,
} from "../../controllers/statistics controllers/statistics.controller.js";
const statisticsRouter = express.Router();

statisticsRouter.get(
  "/client-summary/:id",
  verifyToken,
  hasRole(...statisticsAccessRoles),
  getClientSummary
);
statisticsRouter.get(
  "/monthly-trends/:id",
  verifyToken,
  hasRole(...statisticsAccessRoles),
  getMonthlyTrends
);

export default statisticsRouter;
