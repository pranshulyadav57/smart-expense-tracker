const jwt = require("jsonwebtoken");
const { AppError } = require("../middleware/errorMiddleware");

/* =========================================================
   JWT CONFIG
========================================================= */

const JWT_ISSUER =
  process.env.JWT_ISSUER || "hisabkitab-api";

const JWT_AUDIENCE =
  process.env.JWT_AUDIENCE || "hisabkitab-client";

const ACCESS_TOKEN_EXPIRY =
  process.env.JWT_EXPIRY || "7d";

const REFRESH_TOKEN_EXPIRY =
  process.env.REFRESH_TOKEN_EXPIRY || "30d";

/* =========================================================
   GET ACCESS SECRET
========================================================= */

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError(
      "JWT_SECRET is not configured",
      500
    );
  }

  return secret;
};

/* =========================================================
   GET REFRESH SECRET
========================================================= */

const getRefreshSecret = () => {
  const secret =
    process.env.REFRESH_TOKEN_SECRET;

  if (!secret) {
    throw new AppError(
      "REFRESH_TOKEN_SECRET is not configured",
      500
    );
  }

  return secret;
};

/* =========================================================
   BASE JWT OPTIONS
========================================================= */

const baseJwtOptions = {
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  algorithm: "HS256",
};

/* =========================================================
   ACCESS TOKEN
========================================================= */

const signAccessToken = (payload) => {

  if (
    !payload ||
    !payload.id ||
    !payload.email ||
    !payload.role
  ) {
    throw new AppError(
      "Invalid access token payload",
      400
    );
  }

  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      username: payload.username || null,
    },
    getJwtSecret(),
    {
      ...baseJwtOptions,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );
};

/* =========================================================
   REFRESH TOKEN
========================================================= */

const signRefreshToken = (payload) => {

  if (!payload || !payload.id) {
    throw new AppError(
      "Invalid refresh token payload",
      400
    );
  }

  return jwt.sign(
    {
      id: payload.id,
    },
    getRefreshSecret(),
    {
      ...baseJwtOptions,
      expiresIn: REFRESH_TOKEN_EXPIRY,
    }
  );
};

/* =========================================================
   VERIFY ACCESS TOKEN
========================================================= */

const verifyAccessToken = (token) => {

  if (!token || typeof token !== "string") {
    throw new AppError(
      "Access token missing",
      401
    );
  }

  return jwt.verify(
    token.trim(),
    getJwtSecret(),
    {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
};

/* =========================================================
   VERIFY REFRESH TOKEN
========================================================= */

const verifyRefreshToken = (token) => {

  if (!token || typeof token !== "string") {
    throw new AppError(
      "Refresh token missing",
      401
    );
  }

  return jwt.verify(
    token.trim(),
    getRefreshSecret(),
    {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};