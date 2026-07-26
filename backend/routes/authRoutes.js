const express = require("express");

const router = express.Router();

/* =========================================================
   MIDDLEWARE
========================================================= */

const auth = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const {
  authLimiter,
} = require("../middleware/securityMiddleware");

const {
  validateRegistration,
  validateLogin,
} = require("../middleware/validationMiddleware");

/* =========================================================
   CONTROLLER
========================================================= */

const authController = require("../controllers/authController");

/* =========================================================
   AUTH ROUTES
========================================================= */

/**
 * REGISTER
 */
router.post(
  "/register",
  authLimiter,
  validateRegistration,
  authController.register
);

/**
 * LOGIN
 */
router.post(
  "/login",
  authLimiter,
  validateLogin,
  authController.login
);

/**
 * REFRESH TOKEN
 */
router.post(
  "/refresh-token",
  authLimiter,
  authController.refreshToken
);

/**
 * LOGOUT
 */
router.post(
  "/logout",
  auth,
  authController.logout
);

/* =========================================================
   PASSWORD ROUTES
========================================================= */

/**
 * FORGOT PASSWORD
 */
router.post(
  "/forgot-password",
  authLimiter,
  authController.forgotPassword
);

/**
 * RESET PASSWORD
 */
router.post(
  "/reset-password",
  authLimiter,
  authController.resetPassword
);

/**
 * CHANGE PASSWORD
 */
router.post(
  "/change-password",
  auth,
  authLimiter,
  authController.changePassword
);

/* =========================================================
   PROFILE ROUTES
========================================================= */

/**
 * GET PROFILE
 */
router.get(
  "/profile",
  auth,
  authController.profile
);

/**
 * UPDATE PROFILE
 */
router.put(
  "/profile",
  auth,
  authController.updateProfile
);

/**
 * UPLOAD AVATAR
 */
router.put(
  "/avatar",
  auth,
  upload.single("avatar"),
  authController.uploadAvatar
);

module.exports = router;