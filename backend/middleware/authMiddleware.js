const { verifyAccessToken } = require("../services/tokenService");
const logger = require("../utils/logger");
const { AppError } = require("./errorMiddleware");

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

module.exports = (req, res, next) => {
  try {
    /* =====================================================
       ENV VALIDATION
    ===================================================== */

    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET missing from environment");

      throw new AppError(
        "Server configuration error",
        500
      );
    }

    /* =====================================================
       AUTH HEADER
    ===================================================== */

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(
        "Authorization token missing",
        401
      );
    }

    /* =====================================================
       HEADER FORMAT
    ===================================================== */

    const parts = authHeader.trim().split(" ");

    if (parts.length !== 2) {
      throw new AppError(
        "Invalid authorization format",
        401
      );
    }

    const [scheme, rawToken] = parts;

    if (scheme !== "Bearer") {
      throw new AppError(
        "Invalid authorization type",
        401
      );
    }

    const token = String(rawToken || "").trim();

    if (!token) {
      throw new AppError(
        "Authorization token missing",
        401
      );
    }

    /* =====================================================
       VERIFY JWT
    ===================================================== */

    let decoded;

    try {
      decoded = verifyAccessToken(token);
    } catch (jwtError) {

      logger.warn("JWT verification failed", {
        error: jwtError.message,
      });

      /* ===============================================
         TOKEN EXPIRED
      =============================================== */

      if (jwtError.name === "TokenExpiredError") {
        // Inform clients that the token is expired using WWW-Authenticate
        try {
          res.setHeader(
            "WWW-Authenticate",
            'Bearer error="invalid_token", error_description="The access token expired"'
          );
        } catch (e) {
          // ignore header set errors in non-HTTP contexts
        }
        throw new AppError(
          "Token expired",
          401
        );
      }

      /* ===============================================
         INVALID TOKEN
      =============================================== */

      if (
        jwtError.name === "JsonWebTokenError" ||
        jwtError.name === "NotBeforeError"
      ) {
        try {
          res.setHeader(
            "WWW-Authenticate",
            'Bearer error="invalid_token", error_description="Invalid access token"'
          );
        } catch (e) {
          // ignore
        }
        throw new AppError(
          "Invalid token",
          401
        );
      }

      throw jwtError;
    }

    /* =====================================================
       PAYLOAD VALIDATION
    ===================================================== */

    if (
      !decoded ||
      !decoded.id ||
      !decoded.role
    ) {
      throw new AppError(
        "Invalid token payload",
        401
      );
    }

    const normalizedRole = String(
      decoded.role
    ).toLowerCase();

    if (
      !["student", "business"].includes(
        normalizedRole
      )
    ) {
      throw new AppError(
        "Invalid user role",
        403
      );
    }

    /* =====================================================
       ATTACH USER
    ===================================================== */

    req.user = {
      id: decoded.id,
      role: normalizedRole,
      username: decoded.username || null,
      email: decoded.email || null,
    };

    /* =====================================================
       DEBUG LOG
    ===================================================== */

    logger.info("Authenticated request", {
      userId: decoded.id,
      role: normalizedRole,
      method: req.method,
      path: req.originalUrl,
    });

    next();

  } catch (error) {

    logger.warn("Authentication failed", {
      error: error.message,
      path: req.originalUrl,
      ip: req.ip,
    });

    next(error);
  }
};