import { UAParser } from "ua-parser-js";

export function getCurrentDeviceName(userAgent) {
  const parser = new UAParser(userAgent);
  const deviceInfo = parser.getResult();

  const osName = deviceInfo.os.name || "Unknown OS";
  const browserName = deviceInfo.browser.name || "Unknown Browser";
  const deviceModel = deviceInfo.device.model || "";
  const deviceType = deviceInfo.device.type || "";
  const deviceVendor = deviceInfo.device.vendor || "";

  // Friendly device name logic
  return deviceModel
    ? `${deviceVendor} ${deviceModel} (${osName})`
    : `${osName} - ${browserName}`;
}
