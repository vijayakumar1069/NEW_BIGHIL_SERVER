import express from "express";
import { hasRole, verifyToken } from "../../middlewars/verifyToken.js";
import {
  addClient,
  deletClient,
  getAllClients,
  updateClient,
} from "../../controllers/bighil controllers/bighil clients controllers/bighil.clients.controller.js";
const bighilClientsRoute = express.Router();

bighilClientsRoute.post(
  "/add-new-client",
  verifyToken,
  hasRole("BIGHIL"),
  addClient
);
bighilClientsRoute.get(
  "/get-all-clients",
  verifyToken,
  hasRole("BIGHIL"),
  getAllClients
);
bighilClientsRoute.delete(
  "/delete-client/:clientId",
  verifyToken,
  hasRole("BIGHIL"),
  deletClient
);
bighilClientsRoute.patch(
  "/edit-client/:clientId",
  verifyToken,
  hasRole("BIGHIL"),
  updateClient
);

export default bighilClientsRoute;
