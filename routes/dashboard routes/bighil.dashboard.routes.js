import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { bighilDashBoardStats } from "../../controllers/dashboard controllers/bighil.dashboard.controller.js";

const dashBoardRouter = express.Router();

dashBoardRouter.get(
  "/bighil-cards",
  verifyToken,
  hasRole("BIGHIL"),
  bighilDashBoardStats
);

export default dashBoardRouter;
