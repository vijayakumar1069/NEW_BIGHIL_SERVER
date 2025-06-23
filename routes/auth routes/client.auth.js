import express from "express";
import {
  clientLoginFunction,
  clientLogoutFunction,
} from "../../controllers/auth controllers/client.auth.controller.js";
import { hasRole, verifyToken } from "../../middleware/verifyToken.js";
import { roles } from "../../utils/roles_const.js";
import { validateActiveSession } from "../../middleware/validateActiveSession.js";
import jwt from "jsonwebtoken";
import companyAdminSchema from "../../schema/company.admin.schema.js";
const clientAuthRoute = express.Router();

clientAuthRoute.post("/client-login", clientLoginFunction);
clientAuthRoute.post(
  "/client-logout",
  verifyToken,
  validateActiveSession,
  hasRole(...roles),
  clientLogoutFunction
);

// Add this method to handle beacon logout
export async function handleBeaconLogout(admin) {
  admin.isCurrentlyLoggedIn = false;
  admin.currentSessionId = null;
  admin.lastActivityTime = null;
  admin.sessionExpiry = null;
  admin.currentLoginsCount = 0;
  admin.previousDevice = admin.currentDevice;
  admin.currentDevice = "";
  await admin.save();
}

// Update the beacon logout endpoint
clientAuthRoute.post("/client-beacon-logout", async (req, res) => {
  try {
    const token = req.cookies.access_token;
    if (!token) return res.status(200).json({ success: true });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      const admin = await companyAdminSchema.findById(decoded.id);
      if (admin) await handleBeaconLogout(admin);
    } catch (e) {
      console.error("Beacon logout error:", e.message);
    }

    res.cookie("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_DEV === "production",
      sameSite: process.env.NODE_DEV === "production" ? "none" : "lax",
      path: "/",
      expires: new Date(0),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(200).json({ success: true });
  }
});

export default clientAuthRoute;
