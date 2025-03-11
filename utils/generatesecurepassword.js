import crypto from "crypto";
const generateSecurePassword = (admin) => {
  // Create base from admin info
  const baseString = [
    admin.name.slice(0, 2),
    admin.email.split("@")[0],
    admin.role.charAt(0),
  ]
    .join("")
    .replace(/\s+/g, "");

  // Generate random special characters
  const specialChars = "!@#$%^&*_-+=?";
  const randomChar = specialChars[crypto.randomInt(specialChars.length)];

  // Generate password components
  const number = crypto.randomInt(9).toString();
  const upper = baseString.toUpperCase()[crypto.randomInt(baseString.length)];
  const lower = baseString.toLowerCase()[crypto.randomInt(baseString.length)];

  // Combine and shuffle
  const password = [upper, lower, number, randomChar]
    .sort(() => crypto.randomInt(2) - 1)
    .join("");

  return password.padEnd(
    6 + crypto.randomInt(3),
    specialChars[crypto.randomInt(specialChars.length)]
  );
};

export default generateSecurePassword;
