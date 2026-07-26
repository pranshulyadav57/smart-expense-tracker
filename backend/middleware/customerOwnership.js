const db = require('../config/db');
const { AppError } = require('./errorMiddleware');
const logger = require('../utils/logger');

module.exports = async function checkCustomerOwnership(req, res, next) {
  try {
    const customerId = req.params.id;
    if (!customerId) return next();

    const [rows] = await db.execute('SELECT user_id FROM customers WHERE id = ? AND is_active = TRUE', [customerId]);
    if (!rows || rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    const ownerId = rows[0].user_id;
    if (String(ownerId) !== String(req.user?.id)) {
      logger.warn('Customer ownership validation failed', { userId: req.user?.id, customerId });
      throw new AppError('Unauthorized to access this customer', 403);
    }

    return next();
  } catch (err) {
    next(err);
  }
};
