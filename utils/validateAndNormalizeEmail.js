export const validateAndNormalizeEmail = (email) => {
  if (!email) throw new Error("Email is required");
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    const error = new Error("Invalid email format");
    error.statusCode = 400;
    throw error;
  }
  return trimmed;
};
