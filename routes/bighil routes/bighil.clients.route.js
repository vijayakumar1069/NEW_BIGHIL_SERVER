import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import {
  addClient,
  deletClient,
  getAllClients,
  searchClients,
  updateClient,
  validateCompanyDetails,
} from "../../controllers/bighil controllers/bighil clients controllers/bighil.clients.controller.js";
const bighilClientsRoute = express.Router();

bighilClientsRoute.post(
  "/validate-company-details",
  verifyToken,
  hasRole("BIGHIL"),
  validateCompanyDetails
);
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
bighilClientsRoute.get(
  "/clients/search",
  verifyToken,
  hasRole("BIGHIL"),
  searchClients
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
