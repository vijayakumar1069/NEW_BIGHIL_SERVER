import companyAdminSchema from "../schema/company.admin.schema.js";
import jwt from "jsonwebtoken";
export async function checkConcurrentSessions(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const userId = decoded.id;
    const deviceId = decoded.deviceId;

    const user = await companyAdminSchema.findById(userId);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    // Check if this device session is still active
    const currentSession = user.deviceSessions.find(
      (session) => session.deviceId === deviceId && session.isActive
    );

    if (!currentSession || currentSession.jwtToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Session expired or logged in from another device",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}
