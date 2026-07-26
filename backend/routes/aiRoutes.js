const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  requireStudentRole,
  requireBusinessRole
} = require("../middleware/roleMiddleware");
const aiController = require("../controllers/aiController");

router.get("/student", auth, requireStudentRole, aiController.getStudentInsights);
router.get("/business", auth, requireBusinessRole, aiController.getBusinessInsights);

module.exports = router;
