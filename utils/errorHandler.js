const errorHandler = (err, req, res, next) => {
  // 1. Default Values
  const statusCode = err.statusCode || 500; // Fallback to 500 (Server Error)
  const statusText = err.message || "Internal Server Error";

  // Always return JSON
  res.setHeader("Content-Type", "application/json");
  console.log("Error:", err);
  res.status(statusCode).json({
    success: false,
    message: statusText, // Frontend uses this field
  });
};

export default errorHandler;
