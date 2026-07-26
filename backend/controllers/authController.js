const bcrypt = require("bcryptjs");

const {
  findUserByIdentifier,
  findUserById,
  getProfileData,
  generateTokens,
  verifyRefreshTokenPayload,
  revokeRefreshToken,
  buildUserResponse,
  createPasswordResetToken,
  verifyPasswordResetToken,
  resetUserPassword,
  deletePasswordResetToken,
  registerUser,
  updateUserProfile,
  changeUserPassword,
  updateUserAvatar,
  upgradePlaintextPassword,
} = require("../services/authService");

const { standardizeResponse } = require("../utils/responseHandler");
const { AppError } = require("../middleware/errorMiddleware");

const logger = require("../utils/logger");

/* =========================================================
   REGISTER USER
========================================================= */

exports.register = async (req, res, next) => {
  try {
    // Validation is handled by `validateRegistration` middleware.
    // Duplicate user checks and user creation are handled by the `registerUser` service.
    const user = await registerUser(req.body);

    if (!user) {
      throw new AppError("User registration failed", 500);
    }

    /* ---------- TOKENS ---------- */

    const {
      token,
      refreshToken,
    } = await generateTokens(user);

    // The `registerUser` service returns the fully formed user object.

    return res.status(201).json(
      standardizeResponse(
        true,
        {
          token,
          refreshToken,
          role: user.role,
          user,
        },
        "Registration successful"
      )
    );
  } catch (error) {
    logger.error("REGISTER ERROR", {
      error: error.message,
      stack: error.stack,
    });

    next(error);
  }
};

/* =========================================================
   LOGIN USER
========================================================= */

exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    // Validation is handled by `validateLogin` middleware.

    /* ---------- FIND USER ---------- */

    const user =
      await findUserByIdentifier(identifier);

    let isPasswordValid = false;

    if (user) {
      isPasswordValid = await bcrypt.compare(password, user.password);

      // If bcrypt compare failed, attempt to transparently upgrade legacy plaintext passwords
      if (!isPasswordValid) {
        try {
          const upgraded = await upgradePlaintextPassword(user, password);
          if (upgraded) {
            // After upgrading, treat the password as valid
            isPasswordValid = true;
            logger.info('Upgraded legacy plaintext password to bcrypt', { userId: user.id });
          }
        } catch (e) {
          // Non-fatal: log and continue to handle as invalid credentials
          logger.warn('Password upgrade attempt failed', { error: e.message, userId: user.id });
        }
      }
    }

    if (!user || !isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    /* ---------- CHECK ACTIVE ---------- */

    if (!user.is_active) {
      throw new AppError("Account is inactive", 403);
    }

    /* ---------- NORMALIZE ROLE ---------- */

    user.role = String(
      user.role || ""
    ).toLowerCase();

    /* ---------- TOKENS ---------- */

    const {
      token,
      refreshToken,
    } = await generateTokens(user);

    /* ---------- PROFILE ---------- */

    const profileData =
      await getProfileData(user);

    const responseUser =
      buildUserResponse(user, profileData);

    return res.status(200).json(
      standardizeResponse(
        true,
        {
          token,
          refreshToken,
          role: responseUser.role,
          user: responseUser,
        },
        "Login successful"
      )
    );
  } catch (error) {
    logger.error("LOGIN ERROR", {
      identifier: req.body.identifier,
      error: error.message,
      stack: error.stack,
    });

    next(error);
  }
};

/* =========================================================
   REFRESH TOKEN
========================================================= */

exports.refreshToken = async (
  req,
  res,
  next
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError("Refresh token required", 400);
    }

    const user =
      await verifyRefreshTokenPayload(
        refreshToken
      );

    if (!user) {
      throw new AppError("Invalid refresh token", 401);
    }

    // Revoke the old refresh token to prevent reuse
    try {
      await revokeRefreshToken(refreshToken);
    } catch (e) {
      logger.warn('Failed to revoke old refresh token', { error: e.message });
    }

    const {
      token,
      refreshToken: newRefreshToken,
    } = await generateTokens(user);

    const profileData =
      await getProfileData(user);

    const responseUser =
      buildUserResponse(user, profileData);

    return res.status(200).json(
      standardizeResponse(
        true,
        {
          token,
          refreshToken: newRefreshToken,
          user: responseUser,
        },
        "Token refreshed successfully"
      )
    );
  } catch (error) {
    logger.error("REFRESH TOKEN ERROR", {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

/* =========================================================
   LOGOUT
========================================================= */

exports.logout = async (
  req,
  res,
  next
) => {
  try {
    // If a refresh token was provided in body, revoke it. Otherwise attempt to revoke from headers/body
    const tokenToRevoke = req.body?.refreshToken || req.headers["x-refresh-token"] || null;
    if (tokenToRevoke) {
      try {
        await revokeRefreshToken(tokenToRevoke);
      } catch (e) {
        logger.warn('Failed to revoke refresh token during logout', { error: e.message });
      }
    }

    return res.status(200).json(
      standardizeResponse(
        true,
        null,
        "Logout successful"
      )
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PROFILE
========================================================= */

exports.profile = async (
  req,
  res,
  next
) => {
  try {
    const user =
      await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json(
        standardizeResponse(
          false,
          null,
          "User not found"
        )
      );
    }

    const profileData =
      await getProfileData(user);

    const responseUser =
      buildUserResponse(user, profileData);

    return res.status(200).json(
      standardizeResponse(
        true,
        {
          user: responseUser,
        },
        "Profile fetched successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   FORGOT PASSWORD
========================================================= */

exports.forgotPassword = async (
  req,
  res,
  next
) => {
  try {
    const email = (
      req.body.email || ""
    ).trim();

    if (!email) {
      return res.status(400).json(
        standardizeResponse(
          false,
          null,
          "Email is required"
        )
      );
    }

    const user =
      await findUserByIdentifier(email);

    if (user) {
      await createPasswordResetToken(
        user.id
      );
    }

    return res.status(200).json(
      standardizeResponse(
        true,
        null,
        "If account exists, reset link sent"
      )
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   RESET PASSWORD
========================================================= */

exports.resetPassword = async (
  req,
  res,
  next
) => {
  try {
    const {
      token,
      password,
      confirmPassword,
    } = req.body;

    if (
      !token ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json(
        standardizeResponse(
          false,
          null,
          "All fields are required"
        )
      );
    }

    if (password !== confirmPassword) {
      return res.status(400).json(
        standardizeResponse(
          false,
          null,
          "Passwords do not match"
        )
      );
    }

    const resetData =
      await verifyPasswordResetToken(token);

    await resetUserPassword(
      resetData.user_id,
      password
    );

    await deletePasswordResetToken(
      token
    );

    return res.status(200).json(
      standardizeResponse(
        true,
        null,
        "Password reset successful"
      )
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   UPDATE PROFILE
========================================================= */

exports.updateProfile = async (
  req,
  res,
  next
) => {
  try {
    const updatedUser =
      await updateUserProfile(
        req.user.id,
        req.user.role,
        req.body
      );

    return res.status(200).json(
      standardizeResponse(
        true,
        {
          user: updatedUser,
        },
        "Profile updated successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   CHANGE PASSWORD
========================================================= */

exports.changePassword = async (
  req,
  res,
  next
) => {
  try {
    const {
      oldPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (
      !oldPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json(
        standardizeResponse(
          false,
         null,
          "All password fields required"
        )
      );
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json(
        standardizeResponse(
          false,
          null,
          "Passwords do not match"
        )
      );
    }

    await changeUserPassword(
      req.user.id,
      oldPassword,
      newPassword
    );

    return res.status(200).json(
      standardizeResponse(
        true,
        null,
        "Password changed successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   UPLOAD AVATAR
========================================================= */

exports.uploadAvatar = async (
  req,
  res,
  next
) => {
  try {
    if (!req.file) {
      return res.status(400).json(
        standardizeResponse(
          false,
          null,
          "No file uploaded"
        )
      );
    }

    const avatarUrl =
      `/public/uploads/avatars/${req.file.filename}`;

    const updatedUser =
      await updateUserAvatar(
        req.user.id,
        avatarUrl
      );

    return res.status(200).json(
      standardizeResponse(
        true,
        {
          user: updatedUser,
        },
        "Avatar uploaded successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};