const db = require("../config/db");
const { AppError } = require("../middleware/errorMiddleware");
const { getPaginated } = require("../utils/dbHelpers");

const createCustomer = async (userId, customerData) => {
    const { name, phone, note, avatar } = customerData;
    if (!name?.trim()) {
        throw new AppError("Customer name is required", 400);
    }

    const insertSql = `
      INSERT INTO customers (user_id, name, phone, note, avatar, current_balance, total_credit, total_debit, last_activity, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, 0, 0, NOW(), TRUE, NOW(), NOW())
    `;
    const [result] = await db.execute(insertSql, [userId, name.trim(), phone?.trim() || null, note?.trim() || null, avatar || null]);

    const selectSql = `
      SELECT id, name, phone, note, avatar, current_balance, total_credit, total_debit, last_activity, is_active, created_at
      FROM customers
      WHERE id = ?
    `;
    const [customers] = await db.execute(selectSql, [result.insertId]);
    if (customers.length === 0) {
        throw new AppError("Failed to create and retrieve customer", 500);
    }
    return customers[0];
};

const fetchCustomers = async (userId, queryOptions) => {
    const { search, filter, page = 1, limit = 50 } = queryOptions;

    let sql = `
      SELECT
        c.id, c.name, c.phone, c.note, c.avatar, c.current_balance,
        c.total_credit, c.total_debit, c.last_activity, c.created_at,
        COUNT(t.id) as transaction_count,
        MAX(t.created_at) as last_transaction_date,
        MAX(t.note) as latest_transaction_note
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      WHERE c.user_id = ? AND c.is_active = TRUE
    `;

    const params = [userId];
    const conditions = [];

    if (search?.trim()) {
        conditions.push("(c.name LIKE ? OR c.phone LIKE ? OR c.note LIKE ?)");
        const searchTerm = `%${search.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filter) {
        switch (filter) {
            case "pending": conditions.push("c.current_balance > 0"); break;
            case "cleared": conditions.push("c.current_balance = 0"); break;
            case "today": conditions.push("DATE(c.last_activity) = CURDATE()"); break;
            case "week": conditions.push("c.last_activity >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"); break;
            case "month": conditions.push("c.last_activity >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"); break;
        }
    }

    if (conditions.length > 0) {
        sql += " AND " + conditions.join(" AND ");
    }

    sql += `
      GROUP BY c.id
      ORDER BY c.last_activity DESC, c.created_at DESC
    `;

    const paginatedResult = await getPaginated(sql, params, page, limit);

    return {
        customers: paginatedResult.data,
        pagination: {
            currentPage: paginatedResult.page,
            totalPages: paginatedResult.totalPages,
            totalCustomers: paginatedResult.total,
            hasNext: paginatedResult.page < paginatedResult.totalPages,
            hasPrev: paginatedResult.page > 1
        }
    };
};

const fetchCustomerById = async (userId, customerId) => {
    const sql = `
      SELECT
        c.*,
        COUNT(t.id) as transaction_count,
        MAX(t.created_at) as last_transaction_date
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      WHERE c.id = ? AND c.user_id = ? AND c.is_active = TRUE
      GROUP BY c.id
    `;
    const [result] = await db.execute(sql, [customerId, userId]);
    return result[0] || null;
};

const updateCustomerDetails = async (userId, customerId, customerData) => {
    const { name, phone, note, avatar } = customerData;
    if (!name?.trim()) {
        throw new AppError("Customer name is required", 400);
    }

    const sql = `
      UPDATE customers
      SET name = ?, phone = ?, note = ?, avatar = ?, updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await db.execute(sql, [name.trim(), phone?.trim() || null, note?.trim() || null, avatar || null, customerId, userId]);

    return result.affectedRows > 0;
};

const softDeleteCustomer = async (userId, customerId) => {
    const [checkResult] = await db.execute(
        "SELECT COUNT(*) as count FROM transactions t JOIN customers c ON t.customer_id = c.id WHERE t.customer_id = ? AND c.user_id = ?",
        [customerId, userId]
    );

    if (checkResult[0].count > 0) {
        throw new AppError("Cannot delete customer with existing transactions. Deactivate instead.", 400);
    }

    const [result] = await db.execute("UPDATE customers SET is_active = FALSE, updated_at = NOW() WHERE id = ? AND user_id = ?", [customerId, userId]);

    return result.affectedRows > 0;
};

const updateCustomerAvatar = async (userId, customerId, avatarUrl) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute('SELECT avatar FROM customers WHERE id = ? AND user_id = ?', [customerId, userId]);
    if (rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    const oldAvatar = rows[0].avatar;

    await connection.execute('UPDATE customers SET avatar = ?, updated_at = NOW() WHERE id = ? AND user_id = ?', [avatarUrl, customerId, userId]);

    await connection.commit();

    // delete old file if exists
    if (oldAvatar) {
      const path = require('path');
      const fs = require('fs');
      const filename = path.basename(oldAvatar);
      const oldAvatarPath = path.join(__dirname, '..', 'public', 'uploads', 'avatars', filename);
      if (fs.existsSync(oldAvatarPath)) {
        try { fs.unlinkSync(oldAvatarPath); } catch (err) { /* non-fatal */ }
      }
    }

    // return fresh customer
    const [resultRows] = await db.execute('SELECT id, name, phone, note, avatar, current_balance, total_credit, total_debit, last_activity, created_at FROM customers WHERE id = ? AND user_id = ?', [customerId, userId]);
    return resultRows[0] || null;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const deleteCustomerAvatar = async (userId, customerId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute('SELECT avatar FROM customers WHERE id = ? AND user_id = ?', [customerId, userId]);
    if (rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    const oldAvatar = rows[0].avatar;

    await connection.execute('UPDATE customers SET avatar = NULL, updated_at = NOW() WHERE id = ? AND user_id = ?', [customerId, userId]);

    await connection.commit();

    if (oldAvatar) {
      const path = require('path');
      const fs = require('fs');
      const filename = path.basename(oldAvatar);
      const oldAvatarPath = path.join(__dirname, '..', 'public', 'uploads', 'avatars', filename);
      if (fs.existsSync(oldAvatarPath)) {
        try { fs.unlinkSync(oldAvatarPath); } catch (err) { /* non-fatal */ }
      }
    }

    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const fetchCustomerStats = async (userId) => {
    const sql = `
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN current_balance > 0 THEN 1 END) as customers_with_pending,
        COUNT(CASE WHEN current_balance = 0 THEN 1 END) as customers_cleared,
        COUNT(CASE WHEN last_activity >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as active_last_month,
        SUM(current_balance) as total_pending_amount,
        AVG(current_balance) as avg_balance
      FROM customers
      WHERE user_id = ? AND is_active = TRUE
    `;
    const [result] = await db.execute(sql, [userId]);
    const stats = result[0] || {};
    return {
        total_customers: stats.total_customers || 0,
        customers_with_pending: stats.customers_with_pending || 0,
        customers_cleared: stats.customers_cleared || 0,
        active_last_month: stats.active_last_month || 0,
        total_pending_amount: stats.total_pending_amount || 0,
        avg_balance: stats.avg_balance || 0
    };
};

module.exports = {
    createCustomer,
    fetchCustomers,
    fetchCustomerById,
    updateCustomerDetails,
    softDeleteCustomer,
    fetchCustomerStats
    , updateCustomerAvatar
  , deleteCustomerAvatar
};
