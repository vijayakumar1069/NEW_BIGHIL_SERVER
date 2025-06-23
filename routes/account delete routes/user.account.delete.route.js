import express from "express";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { userAccountDelete } from "../../controllers/account delete controllers/user.account.delete.controller.js";
const deleteAccountRoute = express.Router();

deleteAccountRoute.delete(
  "/user-delete-my-account",
  verifyToken,
  hasRole("user"),
  userAccountDelete
);

export default deleteAccountRoute;
