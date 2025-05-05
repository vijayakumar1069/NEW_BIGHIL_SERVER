import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import {
  bighilDashBoardStats,
  clientDetailsStats,
  usersStats,
} from "../../controllers/dashboard controllers/bighil.dashboard.controller.js";

const dashBoardRouter = express.Router();

dashBoardRouter.get(
  "/bighil-cards",
  verifyToken,
  hasRole("BIGHIL"),
  bighilDashBoardStats
);
dashBoardRouter.get(
  "/bighil-client-stats",
  verifyToken,
  hasRole("BIGHIL"),
  clientDetailsStats
);
dashBoardRouter.get(
  "/bighil-user-stats",
  verifyToken,
  hasRole("BIGHIL"),
  usersStats
);

export default dashBoardRouter;
