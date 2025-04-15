import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { getCompanies } from "../../controllers/company controllers/companies.controller.js";

const companyRoute = express.Router();

companyRoute.get("/", verifyToken, hasRole("user"), getCompanies);

export default companyRoute;
