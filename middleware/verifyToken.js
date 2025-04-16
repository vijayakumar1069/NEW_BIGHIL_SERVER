import jwt from "jsonwebtoken";

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    const error = new Error("Token not found");
    error.status = 401;
    throw error;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

// checking for roles middleware

export const hasRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      const error = new Error("Unauthorized");
      error.status = 401;
      next(error);
    }

    if (!roles.includes(req.user.role)) {
      const error = new Error("Insufficient permissions");
      error.status = 403;
      next(error);
    }

    next();
  };
