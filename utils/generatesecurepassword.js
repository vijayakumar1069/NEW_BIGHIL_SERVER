import crypto from "crypto";

const generateSecurePassword = ({ name, email, role }) => {
  const baseString = [
    name?.slice(0, 2) || "",
    email?.split("@")[0] || "",
    role?.charAt(0) || "",
  ]
    .join("")
    .replace(/\s+/g, "");

  const specialChars = "!@#$%^&*_-+=?";
  const randomChar = specialChars[crypto.randomInt(specialChars.length)];
  const number = crypto.randomInt(9).toString();

  const upper = baseString.toUpperCase()[crypto.randomInt(baseString.length)] || "A";
  const lower = baseString.toLowerCase()[crypto.randomInt(baseString.length)] || "a";

  const password = [upper, lower, number, randomChar]
    .sort(() => crypto.randomInt(2) - 1)
    .join("");

  return password.padEnd(
    6 + crypto.randomInt(3),
    specialChars[crypto.randomInt(specialChars.length)]
  );
};

export default generateSecurePassword;
