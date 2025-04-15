// middlewaree/errorHandler.js

const errorHandler = (err, req, res, next) => {
  // 1. Default Values
  const statusCode = err.statusCode || 500; // Fallback to 500 (Server Error)
  const statusText = err.message || "Internal Server Error";

  // Always return JSON
  res.setHeader("Content-Type", "application/json");

  // Log debug information
  console.error(`[${req.method}] ${req.path} >>`, {
    statusCode,
    statusText,
    errorStack: process.env.NODE_DEV === "development" ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    message: statusText, // Frontend uses this field
  });
};

export default errorHandler;
