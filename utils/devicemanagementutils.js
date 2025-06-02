import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
import axios from "axios"; // For external IP/location services

// Generate unique device fingerprint
export function generateDeviceFingerprint(req) {
  const userAgent = req.headers["user-agent"] || "";
  const acceptLanguage = req.headers["accept-language"] || "";
  const acceptEncoding = req.headers["accept-encoding"] || "";
  const ip = req.ip || req.connection.remoteAddress || "";

  const fingerprint = `${userAgent}-${acceptLanguage}-${acceptEncoding}-${ip}`;
  return crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex")
    .substring(0, 16);
}

// Improved client IP detection
export function getClientIP(req) {
  // Check for real IP from various headers (common in production environments)
  const forwarded = req.headers["x-forwarded-for"];
  const realIP = req.headers["x-real-ip"];
  const cfConnectingIP = req.headers["cf-connecting-ip"]; // Cloudflare
  const trueClientIP = req.headers["true-client-ip"]; // Akamai
  const xClientIP = req.headers["x-client-ip"];

  let clientIP = null;

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    clientIP = forwarded.split(",")[0].trim();
  } else if (realIP) {
    clientIP = realIP;
  } else if (cfConnectingIP) {
    clientIP = cfConnectingIP;
  } else if (trueClientIP) {
    clientIP = trueClientIP;
  } else if (xClientIP) {
    clientIP = xClientIP;
  } else {
    // Fallback to connection properties
    clientIP =
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      "127.0.0.1";
  }

  // Clean IPv6 localhost or mapped IPv4
  if (clientIP === "::1" || clientIP === "::ffff:127.0.0.1") {
    clientIP = "127.0.0.1";
  }

  // Remove IPv6 prefix if present
  if (clientIP && clientIP.startsWith("::ffff:")) {
    clientIP = clientIP.substring(7);
  }

  console.log("Detected client IP:", clientIP); // Debug log
  return clientIP;
}

// Enhanced device information parsing
export function parseDeviceInfo(req) {
  const userAgent = req.headers["user-agent"] || "";
  console.log("User Agent:", userAgent); // Debug log

  if (!userAgent || userAgent === "") {
    return {
      browser: "Unknown Browser",
      os: "Unknown OS",
      deviceType: "desktop",
      deviceName: "Unknown Device",
    };
  }

  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    console.log("Parsed UA result:", JSON.stringify(result, null, 2)); // Debug log

    // Enhanced browser detection
    const browserName = result.browser.name || "Unknown Browser";
    const browserVersion = result.browser.version
      ? ` ${result.browser.version}`
      : "";
    const browser = `${browserName}${browserVersion}`.trim();

    // Enhanced OS detection
    const osName = result.os.name || "Unknown OS";
    const osVersion = result.os.version ? ` ${result.os.version}` : "";
    const os = `${osName}${osVersion}`.trim();

    // Enhanced device type detection
    let deviceType = result.device.type || "desktop";

    // Additional device type detection based on user agent
    if (!result.device.type) {
      const ua = userAgent.toLowerCase();
      if (
        ua.includes("mobile") ||
        ua.includes("android") ||
        ua.includes("iphone")
      ) {
        deviceType = "mobile";
      } else if (ua.includes("tablet") || ua.includes("ipad")) {
        deviceType = "tablet";
      }
    }

    // Enhanced device name generation
    let deviceName = result.device.model || "";

    if (!deviceName) {
      const vendor = result.device.vendor || "";
      const osName = result.os.name || "";

      if (vendor && osName) {
        deviceName = `${vendor} ${osName} Device`;
      } else if (osName) {
        if (osName.toLowerCase().includes("windows")) {
          deviceName = "Windows PC";
        } else if (osName.toLowerCase().includes("mac")) {
          deviceName = "Mac";
        } else if (osName.toLowerCase().includes("linux")) {
          deviceName = "Linux PC";
        } else if (osName.toLowerCase().includes("android")) {
          deviceName = "Android Device";
        } else if (osName.toLowerCase().includes("ios")) {
          deviceName = "iOS Device";
        } else {
          deviceName = `${osName} Device`;
        }
      } else {
        deviceName =
          deviceType === "mobile"
            ? "Mobile Device"
            : deviceType === "tablet"
              ? "Tablet Device"
              : "Desktop Device";
      }
    }

    return {
      browser,
      os,
      deviceType,
      deviceName: deviceName.trim(),
    };
  } catch (error) {
    console.error("Error parsing device info:", error);
    return {
      browser: "Unknown Browser",
      os: "Unknown OS",
      deviceType: "desktop",
      deviceName: "Unknown Device",
    };
  }
}

// Enhanced location detection with fallback to external service
export async function getLocationFromIP(ip) {
  console.log("Getting location for IP:", ip); // Debug log

  // Skip location lookup for local/private IPs
  if (
    !ip ||
    ip === "127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    console.log("Local/private IP detected, skipping geolocation");
    return {
      city: "Local Network",
      region: "Local",
      country: "Local",
    };
  }

  try {
    // First try geoip-lite (faster, local database)
    const geo = geoip.lookup(ip);
    if (geo && geo.city && geo.country) {
      console.log("geoip-lite result:", geo);
      return {
        city: geo.city,
        region: geo.region || "Unknown",
        country: geo.country,
      };
    }

    // Fallback to external service (ipapi.co - free tier available)
    console.log("Fallback to external geolocation service");
    const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
      timeout: 5000,
      headers: {
        "User-Agent": "Your-App-Name/1.0",
      },
    });

    if (response.data && response.data.city && response.data.country_name) {
      console.log("External service result:", response.data);
      return {
        city: response.data.city,
        region: response.data.region || response.data.region_code || "Unknown",
        country: response.data.country_name || response.data.country_code,
      };
    }
  } catch (error) {
    console.error("Error getting location:", error.message);
  }

  // Final fallback
  return {
    city: "Unknown",
    region: "Unknown",
    country: "Unknown",
  };
}

// Create device session object with enhanced detection
export async function createDeviceSession(req, rememberDevice = false) {
  const userAgent = req.headers["user-agent"] || "";
  const ip = req.ip || req.connection.remoteAddress || "";

  // Parse user agent for device info
  const deviceInfo = parseUserAgent(userAgent);

  const session = {
    deviceId: generateDeviceFingerprint(req),
    deviceName: deviceInfo.deviceName,
    deviceType: deviceInfo.deviceType,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    ipAddress: ip,
    location: {
      city: "Unknown",
      country: "Unknown",
      region: "Unknown",
    },
    isRemembered: rememberDevice,
    rememberedAt: rememberDevice ? new Date() : null,
    rememberExpiresAt: rememberDevice
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null, // 30 days
    lastLoginAt: new Date(),
    isActive: true,
    createdAt: new Date(),
  };

  return session;
}
function parseUserAgent(userAgent) {
  // Simple user agent parsing - you might want to use a library like 'ua-parser-js'
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);

  let deviceType = "desktop";
  if (isTablet) deviceType = "tablet";
  else if (isMobile) deviceType = "mobile";

  let browser = "Unknown";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";

  let os = "Unknown";
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iOS")) os = "iOS";

  return {
    deviceName: `${os} - ${browser}`,
    deviceType,
    browser,
    os,
  };
}

// Check if device is remembered
export function isDeviceRemembered(clientAdmin, deviceId) {
  if (
    !clientAdmin.deviceSessions ||
    !Array.isArray(clientAdmin.deviceSessions)
  ) {
    return false;
  }

  const deviceSession = clientAdmin.deviceSessions.find(
    (session) => session.deviceId === deviceId && session.isActive
  );

  if (!deviceSession || !deviceSession.isRemembered) {
    return false;
  }

  // Check if remember period is still valid (30 days)
  if (
    deviceSession.rememberExpiresAt &&
    deviceSession.rememberExpiresAt > new Date()
  ) {
    return true;
  }

  return false;
}

// Get active device sessions
export function getActiveDeviceSessions(clientAdmin) {
  if (
    !clientAdmin.deviceSessions ||
    !Array.isArray(clientAdmin.deviceSessions)
  ) {
    return [];
  }

  return clientAdmin.deviceSessions.filter((session) => session.isActive);
}

// Deactivate device session
export function deactivateDeviceSession(user, deviceId) {
  if (!user.deviceSessions || !Array.isArray(user.deviceSessions)) {
    return false;
  }

  const sessionIndex = user.deviceSessions.findIndex(
    (session) => session.deviceId === deviceId
  );

  if (sessionIndex !== -1) {
    user.deviceSessions[sessionIndex].isActive = false;
    return true;
  }

  return false;
}

// Helper function to get real client IP in production environments
export async function getRealClientIP(req) {
  const detectedIP = getClientIP(req);

  // If we have a non-local IP, use it
  if (
    detectedIP !== "127.0.0.1" &&
    !detectedIP.startsWith("192.168.") &&
    !detectedIP.startsWith("10.") &&
    !detectedIP.startsWith("172.")
  ) {
    return detectedIP;
  }

  // For development/local environments, you might want to get the public IP
  try {
    const response = await axios.get("https://api.ipify.org?format=json", {
      timeout: 3000,
    });
    return response.data.ip;
  } catch (error) {
    console.error("Could not get public IP:", error.message);
    return detectedIP; // Return the original detected IP
  }
}
