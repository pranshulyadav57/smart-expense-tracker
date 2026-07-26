const { standardizeResponse } = require("../utils/responseHandler");
const logger = require("../utils/logger");

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  /* =========================================
     SERVER LOGGING
  ========================================= */

  logger.error({
    message: err.message,
    stack: err.stack,
    url: req?.originalUrl,
    method: req?.method,
    userId: req?.user?.id || null,
    ip: req.ip,
  });

  /* =========================================
     DEFAULT VALUES
  ========================================= */

  let statusCode = err.statusCode || 500;

  let message = err.message || "Internal Server Error";

  let errorType = "INTERNAL_ERROR";

  /* =========================================
     VALIDATION ERRORS
  ========================================= */

  if (err.name === "ValidationError") {
    statusCode = 400;

    message = "Validation failed";

    errorType = "VALIDATION_ERROR";
  }

  /* =========================================
     JWT ERRORS
  ========================================= */

  else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    statusCode = 401;

    message =
      err.name === "TokenExpiredError"
        ? "Token expired"
        : "Invalid token";

    errorType = "AUTHENTICATION_ERROR";
  }

  /* =========================================
     FORBIDDEN
  ========================================= */

  else if (err.name === "ForbiddenError") {
    statusCode = 403;

    message = "Access forbidden";

    errorType = "AUTHORIZATION_ERROR";
  }

  /* =========================================
     MYSQL DUPLICATE
  ========================================= */

  else if (err.code === "ER_DUP_ENTRY") {
    statusCode = 409;

    errorType = "DUPLICATE_ERROR";

    if (err.sqlMessage?.includes("users.email")) {
      message =
        "This email address is already registered.";
    } else if (
      err.sqlMessage?.includes("users.username")
    ) {
      message =
        "This username is already taken.";
    } else {
      message =
        "A record with this information already exists.";
    }
  }

  /* =========================================
     FOREIGN KEY ERRORS
  ========================================= */

  else if (
    err.code === "ER_NO_REFERENCED_ROW" ||
    err.code === "ER_ROW_IS_REFERENCED"
  ) {
    statusCode = 400;

    message = "Invalid reference";

    errorType = "REFERENCE_ERROR";
  }

  /* =========================================
     GENERIC MYSQL ERRORS
  ========================================= */

  else if (
    err.code &&
    err.code.startsWith("ER_")
  ) {
    statusCode = 400;

    errorType = "DATABASE_ERROR";

    message =
      process.env.NODE_ENV === "production"
        ? "Database operation failed"
        : err.sqlMessage ||
          err.message ||
          "Database error";
  }

  /* =========================================
     DEBUG DATA
  ========================================= */

  const isProduction =
    process.env.NODE_ENV === "production";

  const errorData = isProduction
    ? null
    : {
        errorType,
        originalMessage: err.message,
        stack: err.stack,
        code: err.code || null,
        sqlMessage: err.sqlMessage || null,
      };

  /* =========================================
     RESPONSE
  ========================================= */

  return res.status(statusCode).json(
    standardizeResponse(
      false,
      errorData,
      message
    )
  );
};

module.exports = {
  errorHandler,
  AppError,
};

