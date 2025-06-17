import jwt from "jsonwebtoken";
import companyAdminSchema from "../schema/company.admin.schema.js";
export async function validateActiveSession(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded || !decoded.id || !decoded.sessionId) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token structure" });
    }
    const admin = await companyAdminSchema.findById(decoded.id);

    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Admin not found" });
    }

    // Check if session is still valid
    const now = new Date();
    if (
      !admin.isCurrentlyLoggedIn ||
      !admin.sessionExpiry ||
      admin.sessionExpiry < now ||
      admin.currentSessionId !== decoded.sessionId
    ) {
      // Clean up invalid session
      admin.isCurrentlyLoggedIn = false;
      admin.currentSessionId = null;
      admin.currentLoginsCount = 0;
      admin.lastActivityTime = null;
      admin.sessionExpiry = null;
      await admin.save();

      return res.status(401).json({
        success: false,
        message: "Session expired or invalid",
        requiresLogin: true,
      });
    }

    // Update last activity time
    admin.lastActivityTime = now;
    admin.sessionExpiry = new Date(now.getTime() + 12 * 60 * 60 * 1000); // Extend by 12 hours
    // admin.sessionExpiry = new Date(now.getTime() + 5 * 60 * 1000); // Extend by 2 minutes

    await admin.save();

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}
