const { standardizeResponse } = require("../utils/responseHandler");
const transactionService = require("../services/transactionService");
const { validatePagination } = require("../utils/validators");
const logger = require("../utils/logger");
const { sanitizeFilters } = require("../utils/requestUtils"); // Assuming a new utility file

// =========================
// ADD TRANSACTION
// =========================
exports.addTransaction = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const transaction = await transactionService.addTransaction(userId, req.body);
    return res.status(201).json(standardizeResponse(true, transaction, "Transaction added successfully"));
  } catch (err) {
    logger.error('Add transaction failed', { userId: req.user?.id, customerId: req.body.customer_id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// GET TRANSACTIONS BY CUSTOMER (Enhanced)
// =========================
exports.getTransactionsByCustomer = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { customerId } = req.params;
    const { page, limit, type, startDate, endDate } = req.query;

    // Sanitize filters using a reusable utility
    const filters = sanitizeFilters(req.query, ['type', 'startDate', 'endDate']);
    const pagination = validatePagination(page, limit);
    const queryOptions = { ...filters, ...pagination };
    const data = await transactionService.getTransactionsByCustomer(userId, customerId, queryOptions);
    return res.json(standardizeResponse(true, data));
  } catch (err) {
    logger.error('Get transactions by customer failed', { userId: req.user?.id, customerId: req.params.customerId, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// GET LEDGER (Full History with Balance Tracking)
// =========================
exports.getLedger = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { id } = req.params;
    const ledger = await transactionService.getLedger(userId, id);
    return res.json(standardizeResponse(true, ledger));
  } catch (err) {
    logger.error('Get ledger failed', { userId: req.user?.id, customerId: req.params.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// GET BALANCE (Enhanced)
// =========================
exports.getBalance = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { id } = req.params;
    const balance = await transactionService.getBalance(userId, id);
    return res.json(standardizeResponse(true, balance));
  } catch (err) {
    logger.error('Get balance failed', { userId: req.user?.id, customerId: req.params.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// UPDATE TRANSACTION (Enhanced)
// =========================
exports.updateTransaction = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { id } = req.params;
    await transactionService.updateTransaction(userId, id, req.body);
    return res.json(standardizeResponse(true, null, "Transaction updated successfully"));
  } catch (err) {
    logger.error('Update transaction failed', { userId: req.user?.id, transactionId: req.params.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// DELETE TRANSACTION (Enhanced)
// =========================
exports.deleteTransaction = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { id } = req.params;
    await transactionService.deleteTransaction(userId, id);
    return res.json(standardizeResponse(true, null, "Transaction deleted successfully"));
  } catch (err) {
    logger.error('Delete transaction failed', { userId: req.user?.id, transactionId: req.params.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// GET DASHBOARD SUMMARY (New)
// =========================
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const data = await transactionService.getDashboardSummary(userId);

    return res.json(standardizeResponse(true, data));
  } catch (err) {
    logger.error('Get dashboard summary failed', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// GET TRANSACTION REPORT (For PDF/Export)
// =========================
exports.getTransactionReport = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { page, limit, customer_id, type, start_date, end_date } = req.query;

    // Build a sanitized filters object to prevent query corruption.
    const filters = {};
    const potentialFilters = { customer_id, type, start_date, end_date };
    for (const [key, value] of Object.entries(potentialFilters)) {
      const singleValue = Array.isArray(value) ? value[0] : value;
      if (singleValue) filters[key] = singleValue;
    }

    const pagination = validatePagination(page, limit);
    const queryOptions = { ...filters, ...pagination };
    const data = await transactionService.getTransactionReport(userId, queryOptions);
    return res.json(standardizeResponse(true, data));
  } catch (err) {
    logger.error('Get transaction report failed', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};