const db = require('../config/db');
const logger = require('../utils/logger');

const logAlert = async (userId, type = 'info', message = '', meta = null) => {
  try {
    const parsedUserId = parseInt(userId, 10);
    const [result] = await db.execute(
      `INSERT INTO alerts (user_id, type, message, meta, is_read, created_at) VALUES (?, ?, ?, ?, FALSE, NOW())`,
      [parsedUserId, type, message, meta ? JSON.stringify(meta) : null]
    );
    return { id: result.insertId, user_id: parsedUserId, type, message, meta };
  } catch (err) {
    logger.error('Failed to log alert', { userId, type, message, error: err.message });
    return null;
  }
};

const fetchAlerts = async (userId, options = {}) => {
  // Ensure userId is an integer
  const parsedUserId = parseInt(userId, 10);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    throw new Error('Invalid userId provided to fetchAlerts');
  }

  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(options.limit, 10) || 20));
  const offset = Math.floor((page - 1) * limit); // Ensure offset is an integer
  const unreadOnly = options.unread === 'true' || options.unread === true;

  let sql = `SELECT id, type, message, meta, is_read, created_at FROM alerts WHERE user_id = ?`;
  const params = [parsedUserId];
  if (unreadOnly) {
    sql += ' AND is_read = FALSE';
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.execute(sql, params);

  const [countRows] = await db.execute(
    `SELECT COUNT(*) as total FROM alerts WHERE user_id = ?${unreadOnly ? ' AND is_read = FALSE' : ''}`,
    [parsedUserId]
  );
  const total = countRows[0]?.total || 0;

  return {
    alerts: rows || [],
    pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalAlerts: total }
  };
};

const markAsRead = async (userId, alertId) => {
  const parsedUserId = parseInt(userId, 10);
  const parsedAlertId = parseInt(alertId, 10);
  const [result] = await db.execute(`UPDATE alerts SET is_read = TRUE WHERE id = ? AND user_id = ?`, [parsedAlertId, parsedUserId]);
  return result.affectedRows > 0;
};

const markAllRead = async (userId, ids = []) => {
  const parsedUserId = parseInt(userId, 10);
  if (Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    const parsedIds = ids.map(id => parseInt(id, 10));
    const params = [...parsedIds, parsedUserId];
    const [result] = await db.execute(
      `UPDATE alerts SET is_read = TRUE WHERE id IN (${placeholders}) AND user_id = ?`,
      params
    );
    return result.affectedRows > 0;
  }

  // Mark all unread alerts for the user
  const [result] = await db.execute(`UPDATE alerts SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`, [parsedUserId]);
  return result.affectedRows > 0;
};

module.exports = { logAlert, fetchAlerts, markAsRead, markAllRead };
