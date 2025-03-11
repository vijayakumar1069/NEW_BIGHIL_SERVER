import jwt from "jsonwebtoken";

export const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Add company verification for your use case
    if (!decoded.id) {
      throw new Error("Invalid company credentials");
    }

    socket.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (error) {
    next(new Error("Authentication failed: " + error.message));
  }
};
