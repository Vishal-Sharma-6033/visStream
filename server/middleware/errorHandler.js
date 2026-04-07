const logger = require("../utils/logger");

function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    logger.error(err.message || "Unexpected server error", err);
  }

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    details: err.details || undefined
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
