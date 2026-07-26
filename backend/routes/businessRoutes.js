const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
  validateCustomer,
  validateTransaction,
  validateIdParam
} = require("../middleware/validationMiddleware");
const { requireBusinessRole } = require("../middleware/roleMiddleware");

const customerController = require("../controllers/customerController");
const transactionController = require("../controllers/transactionController");
const reportsController = require("../controllers/reportsController");
const aiController = require("../controllers/aiController");
const upload = require("../middleware/uploadMiddleware");
const checkCustomerOwnership = require('../middleware/customerOwnership');

// =========================
// CUSTOMER ROUTES (Enhanced)
// =========================
router.post("/customers", auth, requireBusinessRole, validateCustomer, customerController.addCustomer);
router.get("/customers", auth, requireBusinessRole, customerController.getCustomers);
router.get("/customers/stats", auth, requireBusinessRole, customerController.getCustomerStats);
router.get("/customers/:id", auth, requireBusinessRole, validateIdParam, customerController.getCustomerById);
router.put("/customers/:id", auth, requireBusinessRole, validateIdParam, validateCustomer, customerController.updateCustomer);
router.delete("/customers/:id", auth, requireBusinessRole, validateIdParam, customerController.deleteCustomer);
router.post('/customers/:id/avatar', auth, requireBusinessRole, validateIdParam, checkCustomerOwnership, upload.single('avatar'), customerController.uploadAvatar);
router.delete('/customers/:id/avatar', auth, requireBusinessRole, validateIdParam, checkCustomerOwnership, customerController.deleteAvatar);

// =========================
// TRANSACTION ROUTES (Enhanced)
// =========================
router.post("/transactions", auth, requireBusinessRole, validateTransaction, transactionController.addTransaction);
router.get("/transactions/:customerId", auth, requireBusinessRole, validateIdParam, transactionController.getTransactionsByCustomer);
router.put("/transactions/:id", auth, requireBusinessRole, validateIdParam, validateTransaction, transactionController.updateTransaction);
router.delete("/transactions/:id", auth, requireBusinessRole, validateIdParam, transactionController.deleteTransaction);

// =========================
// LEDGER + BALANCE ROUTES
// =========================
router.get("/customers/:id/ledger", auth, requireBusinessRole, validateIdParam, transactionController.getLedger);
router.get("/balance/:id", auth, requireBusinessRole, validateIdParam, transactionController.getBalance);

// =========================
// DASHBOARD & REPORTS (New)
// =========================
router.get("/stats", auth, requireBusinessRole, transactionController.getDashboardSummary);
router.get("/dashboard/summary", auth, requireBusinessRole, transactionController.getDashboardSummary);
router.get("/insights", auth, requireBusinessRole, aiController.getBusinessInsights);
router.get("/reports/transactions", auth, requireBusinessRole, transactionController.getTransactionReport);

// =========================
// PDF GENERATION & REMINDERS (New)
// =========================
router.get("/reports/customer-statement", auth, requireBusinessRole, reportsController.generateCustomerStatement);
router.get("/reports/transaction-report", auth, requireBusinessRole, reportsController.generateTransactionReport);
router.post("/reminders/send", auth, requireBusinessRole, reportsController.sendPaymentReminder);
router.get("/reminders/history", auth, requireBusinessRole, reportsController.getReminderHistory);

// =========================
// BACKUP SYSTEM (New)
// =========================
router.post("/backup/create", auth, requireBusinessRole, reportsController.createBackup);
router.get("/backup/history", auth, requireBusinessRole, reportsController.getBackupHistory);

module.exports = router;