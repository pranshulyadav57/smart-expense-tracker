const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
  validateExpense,
  validateBudget,
  validateIdParam
} = require("../middleware/validationMiddleware");
const { requireStudentRole } = require("../middleware/roleMiddleware");

const studentController = require("../controllers/studentController");
const aiController = require("../controllers/aiController");

// =========================
// EXPENSE ROUTES
// =========================

// ADD EXPENSE
router.post("/expenses", auth, requireStudentRole, validateExpense, studentController.addExpense);

// GET ALL EXPENSES
router.get("/expenses", auth, requireStudentRole, studentController.getExpenses);

// UPDATE EXPENSE
router.put("/expenses/:id", auth, requireStudentRole, validateIdParam, validateExpense, studentController.updateExpense);

// DELETE EXPENSE
router.delete("/expenses/:id", auth, requireStudentRole, validateIdParam, studentController.deleteExpense);

// GET SUMMARY/DASHBOARD
router.get("/summary", auth, requireStudentRole, studentController.getDashboardSummary);
// Alias for frontend compatibility
router.get("/dashboard", auth, requireStudentRole, studentController.getDashboardSummary);

// GET ANALYTICS
router.get("/analytics", auth, requireStudentRole, studentController.getAnalytics);

// GET ALERTS
router.get("/alerts", auth, requireStudentRole, studentController.getAlerts);
// MARK ALERT AS READ
router.post("/alerts/:id/read", auth, requireStudentRole, studentController.markAlertRead);

// MARK MULTIPLE/ALL ALERTS AS READ
router.post("/alerts/mark-all-read", auth, requireStudentRole, studentController.markAllRead);

// =========================
// BUDGET ROUTES
// =========================

// GET BUDGET
router.get("/budget", auth, requireStudentRole, studentController.getBudget);

// SET BUDGET
router.post("/budget", auth, requireStudentRole, validateBudget, studentController.setBudget);

// =========================
// AI INSIGHTS
// =========================

// GET AI INSIGHTS
router.get("/insights", auth, requireStudentRole, aiController.getStudentInsights);

module.exports = router;