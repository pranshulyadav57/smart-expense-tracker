const { standardizeResponse } = require("../utils/responseHandler");
const expenseService = require("../services/expenseService");
const logger = require("../utils/logger");
const { validatePagination } = require("../utils/validators");

// =========================
// ADD EXPENSE
// =========================
exports.addExpense = async (req, res, next) => {
  try {
    const newExpense = await expenseService.createExpense(req.user.id, req.body);
    return res.status(201).json(standardizeResponse(true, newExpense, "Expense added successfully"));
  } catch (err) {
    logger.error('Add expense failed for student', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// GET EXPENSES
// =========================
exports.getExpenses = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      category,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = req.query;

    // Build a sanitized filters object. This is a security best practice to prevent
    // unexpected query parameters (like arrays or empty strings) from reaching the
    // service layer and corrupting the database query.
    const filters = {};
    const potentialFilters = { category, startDate, endDate, sortBy, sortOrder };
    for (const [key, value] of Object.entries(potentialFilters)) {
      // Ensure we only use the first value if a parameter is sent as an array
      const singleValue = Array.isArray(value) ? value[0] : value;
      // Add to filters only if it's a truthy value (not null, undefined, or empty string)
      if (singleValue) filters[key] = singleValue;
    }
    const pagination = validatePagination(page, limit);
    const queryOptions = { ...filters, ...pagination };

    const data = await expenseService.fetchExpenses(req.user.id, queryOptions);
    return res.json(standardizeResponse(true, data, "Expenses retrieved successfully"));
  } catch (err) {
    logger.error('Get expenses failed for student', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// UPDATE EXPENSE
// =========================
exports.updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await expenseService.updateExpenseDetails(req.user.id, id, req.body);
    if (!success) {
      return res.status(404).json(standardizeResponse(false, null, "Expense not found"));
    }
    return res.json(standardizeResponse(true, null, "Expense updated successfully"));
  } catch (err) {
    logger.error('Update expense failed for student', { userId: req.user?.id, expenseId: req.params.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// DELETE EXPENSE
// =========================
exports.deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await expenseService.removeExpense(req.user.id, id);
    if (!success) {
      return res.status(404).json(standardizeResponse(false, null, "Expense not found"));
    }
    return res.json(standardizeResponse(true, null, "Expense deleted successfully"));
  } catch (err) {
    logger.error('Delete expense failed for student', { userId: req.user?.id, expenseId: req.params.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// GET DASHBOARD SUMMARY
// =========================
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const summary = await expenseService.fetchDashboardSummary(req.user.id);
    return res.json(standardizeResponse(true, summary));
  } catch (err) {
    logger.error('Get dashboard summary failed for student', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// GET ANALYTICS
// =========================
exports.getAnalytics = async (req, res, next) => {
  try {
    const analytics = await expenseService.fetchAnalytics(req.user.id);
    return res.json(standardizeResponse(true, analytics));
  } catch (err) {
    logger.error('Get analytics failed for student', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// GET BUDGET
// =========================
exports.getBudget = async (req, res, next) => {
  try {
    const budget = await expenseService.fetchBudget(req.user.id);
    return res.json(standardizeResponse(true, budget));
  } catch (err) {
    logger.error('Get budget failed for student', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// SET BUDGET
// =========================
exports.setBudget = async (req, res, next) => {
  try {
    await expenseService.saveBudget(req.user.id, req.body);
    return res.json(standardizeResponse(true, null, "Budget set successfully"));
  } catch (err) {
    logger.error('Set budget failed for student', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// GET ALERTS
// =========================
exports.getAlerts = async (req, res, next) => {
  try {
    const { page, limit, unread } = req.query;
    const alertsService = require('../services/alertsService');
    const data = await alertsService.fetchAlerts(req.user.id, { page, limit, unread });
    return res.json(standardizeResponse(true, data, 'Alerts retrieved successfully'));
  } catch (err) {
    logger.error('Get alerts failed for student', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// MARK ALERT AS READ
// =========================
exports.markAlertRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alertsService = require('../services/alertsService');
    const success = await alertsService.markAsRead(req.user.id, id);
    if (!success) return res.status(404).json(standardizeResponse(false, null, 'Alert not found'));
    return res.json(standardizeResponse(true, null, 'Alert marked as read'));
  } catch (err) {
    logger.error('Mark alert read failed', { userId: req.user?.id, alertId: req.params.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// MARK MULTIPLE ALERTS AS READ
// =========================
exports.markAllRead = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const alertsService = require('../services/alertsService');
    const success = await alertsService.markAllRead(req.user.id, ids);
    if (!success) return res.status(404).json(standardizeResponse(false, null, 'No alerts updated'));
    return res.json(standardizeResponse(true, null, 'Alerts marked as read'));
  } catch (err) {
    logger.error('Mark all alerts read failed', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};