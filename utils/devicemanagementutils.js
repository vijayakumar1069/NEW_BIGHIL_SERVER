import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";

// Generate unique device fingerprint
export function generateDeviceFingerprint(req) {
  const userAgent = req.headers["user-agent"] || "";
  const acceptLanguage = req.headers["accept-language"] || "";
  const acceptEncoding = req.headers["accept-encoding"] || "";
  const ip = getClientIP(req);

  // Create a unique string from various headers
  const fingerprint = `${userAgent}-${acceptLanguage}-${acceptEncoding}-${ip}`;

  // Generate a hash for the fingerprint
  return crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex")
    .substring(0, 32);
}

// Get client IP address
export function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "127.0.0.1"
  );
}

// Parse device information from user agent
export function parseDeviceInfo(req) {
  const userAgent = req.headers["user-agent"] || "";
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser:
      `${result.browser.name || "Unknown"} ${result.browser.version || ""}`.trim(),
    os: `${result.os.name || "Unknown"} ${result.os.version || ""}`.trim(),
    deviceType: result.device.type || "desktop",
    deviceName: result.device.model || `${result.os.name || "Unknown"} Device`,
  };
}

// Get location from IP
export function getLocationFromIP(ip) {
  try {
    const geo = geoip.lookup(ip);
    if (geo) {
      return {
        city: geo.city || "Unknown",
        region: geo.region || "Unknown",
        country: geo.country || "Unknown",
      };
    }
  } catch (error) {
    console.error("Error getting location:", error);
  }

  return {
    city: "Unknown",
    region: "Unknown",
    country: "Unknown",
  };
}

// Create device session object
export function createDeviceSession(req, isRemembered = false) {
  const deviceId = generateDeviceFingerprint(req);
  const deviceInfo = parseDeviceInfo(req);
  const ip = getClientIP(req);
  const location = getLocationFromIP(ip);

  return {
    deviceId,
    deviceName: deviceInfo.deviceName,
    deviceType: deviceInfo.deviceType,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    ipAddress: ip,
    location,
    isRemembered,
    rememberedAt: isRemembered ? new Date() : null,
    lastLoginAt: new Date(),
    isActive: true,
  };
}

// Check if device is remembered
export function isDeviceRemembered(user, deviceId) {
  const deviceSession = user.deviceSessions.find(
    (session) => session.deviceId === deviceId && session.isActive
  );

  return deviceSession?.isRemembered || false;
}

// Get active device sessions
export function getActiveDeviceSessions(user) {
  return user.deviceSessions.filter((session) => session.isActive);
}

// Deactivate device session
export function deactivateDeviceSession(user, deviceId) {
  const sessionIndex = user.deviceSessions.findIndex(
    (session) => session.deviceId === deviceId
  );

  if (sessionIndex !== -1) {
    user.deviceSessions[sessionIndex].isActive = false;
    return true;
  }

  return false;
}
