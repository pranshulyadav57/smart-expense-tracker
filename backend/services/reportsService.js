const { safeQuery, getPaginated } = require("../utils/dbHelpers");
const { AppError } = require("../middleware/errorMiddleware");
const notificationService = require('./notificationService');

const getCustomerStatement = async (userId, customerId, queryOptions) => {
  const { start_date, end_date } = queryOptions;

  const customerResult = await safeQuery(
    `SELECT id, name, phone, current_balance, total_credit, total_debit, created_at
     FROM customers WHERE id = ? AND user_id = ? AND is_active = TRUE`,
    [customerId, userId]
  );

  if (customerResult.length === 0) throw new AppError("Customer not found", 404);

  let sql = `SELECT id, type, amount, note, payment_method, created_at FROM transactions WHERE customer_id = ?`;
  const params = [customerId];
  if (start_date) { sql += " AND DATE(created_at) >= ?"; params.push(start_date); }
  if (end_date) { sql += " AND DATE(created_at) <= ?"; params.push(end_date); }
  sql += " ORDER BY created_at DESC";

  const transactions = await safeQuery(sql, params);
  return { customer: customerResult[0], transactions };
};

const getTransactionReport = async (userId, queryOptions) => {
  const { start_date, end_date, customer_id, type } = queryOptions;
  let sql = `
    SELECT t.id, t.type, t.amount, t.note, t.payment_method, t.created_at,
           c.name as customer_name, c.phone as customer_phone
    FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE c.user_id = ? AND c.is_active = TRUE
  `;
  const params = [userId];
  if (start_date) { sql += " AND DATE(t.created_at) >= ?"; params.push(start_date); }
  if (end_date) { sql += " AND DATE(t.created_at) <= ?"; params.push(end_date); }
  if (customer_id) { sql += " AND t.customer_id = ?"; params.push(customer_id); }
  if (type) { sql += " AND t.type = ?"; params.push(type); }
  sql += " ORDER BY t.created_at DESC";

  return await safeQuery(sql, params);
};

const createReminder = async (userId, customerId, message, type) => {
  const customerResult = await safeQuery(
    `SELECT id, name, phone, current_balance FROM customers WHERE id = ? AND user_id = ? AND is_active = TRUE`,
    [customerId, userId]
  );
  if (customerResult.length === 0) throw new AppError("Customer not found", 404);
  const customer = customerResult[0];
  if (customer.current_balance <= 0) throw new AppError("Customer has no pending balance", 400);
  // Ensure message exists; generate default if not provided
  const finalType = type || 'payment_due';
  const generatedMessage = generateReminderMessage(customer, finalType);
  let finalMessage = (typeof message === 'string' && message.trim().length > 0) ? message.trim() : generatedMessage;
  if (finalMessage.length > 1000) finalMessage = finalMessage.slice(0, 1000);

  const result = await safeQuery(
    `INSERT INTO reminders (customer_id, user_id, type, message, sent_at, status) VALUES (?, ?, ?, ?, NOW(), 'sent')`,
    [customerId, userId, finalType, finalMessage]
  );

  // Attempt to send notification asynchronously; do not fail reminder creation on send errors
  notificationService.sendNotification({ to: customer.phone, message: finalMessage })
    .catch(err => {
      const logger = require('../utils/logger');
      logger.warn('Reminder created but notification sending failed', { err: err.message });
    });

  return { reminder_id: result.insertId, customer_name: customer.name, phone: customer.phone, current_balance: customer.current_balance, message: finalMessage };
};

function generateReminderMessage(customer, type) {
  const templates = {
    payment_due: `Dear ${customer.name}, you have a pending balance of ₹${customer.current_balance}. Please clear your payment at your earliest convenience.`,
    payment_request: `Hi ${customer.name}, kindly make the payment of ₹${customer.current_balance} that is due.`,
    custom: `Hello ${customer.name}, this is a reminder about your account balance.`
  };

  return templates[type] || templates.payment_due;
}

const getReminderHistory = async (userId, queryOptions) => {
  const { customer_id, page = 1, limit = 20 } = queryOptions;
  let sql = `
    SELECT r.id, r.type, r.message, r.sent_at, r.status, c.name as customer_name, c.phone as customer_phone
    FROM reminders r JOIN customers c ON r.customer_id = c.id
    WHERE r.user_id = ? AND c.is_active = TRUE
  `;
  const params = [userId];
  if (customer_id) { sql += " AND r.customer_id = ?"; params.push(customer_id); }
  sql += " ORDER BY r.sent_at DESC";

  return await getPaginated(sql, params, page, limit);
};

const createBackup = async (userId, backupType) => {
  const customers = await safeQuery("SELECT * FROM customers WHERE user_id = ? AND is_active = TRUE", [userId]);
  const transactions = await safeQuery(
    `SELECT t.* FROM transactions t JOIN customers c ON t.customer_id = c.id WHERE c.user_id = ?`, [userId]
  );
  const exportData = { exported_at: new Date().toISOString(), user_id: userId, backup_type: backupType, data: { customers, transactions } };
  const dataString = JSON.stringify(exportData);

  const result = await safeQuery(`INSERT INTO backup_logs (user_id, backup_type, file_size, status) VALUES (?, ?, ?, 'success')`, [userId, backupType, dataString.length]);
  return { backup_id: result.insertId, exported_data: exportData, file_size: dataString.length };
};

const getBackupHistory = async (userId, queryOptions) => {
  const { page = 1, limit = 10 } = queryOptions;
  return await getPaginated(`SELECT id, backup_type, file_size, status, created_at FROM backup_logs WHERE user_id = ? ORDER BY created_at DESC`, [userId], page, limit);
};

module.exports = { getCustomerStatement, getTransactionReport, createReminder, getReminderHistory, createBackup, getBackupHistory };