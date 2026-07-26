const { safeQuery, getPaginated } = require("../utils/dbHelpers");
const { AppError } = require("../middleware/errorMiddleware");
const db = require("../config/db");

const addTransaction = async (userId, transactionData) => {
  const { customer_id, type, amount, note, payment_method = 'cash' } = transactionData;
  const numAmount = parseFloat(amount);

  const customerResult = await safeQuery(
    "SELECT id FROM customers WHERE id = ? AND user_id = ? AND is_active = TRUE",
    [customer_id, userId]
  );

  if (customerResult.length === 0) {
    throw new AppError("Customer not found", 404);
  }

  // Try using the stored procedure first for atomicity
  try {
    await safeQuery(
      "CALL add_transaction_with_balance(?, ?, ?, ?, ?, ?)",
      [customer_id, userId, type, numAmount, note?.trim() || null, payment_method]
    );
  } catch (err) {
    // If stored procedure is missing on the target DB, fallback to a transactional implementation
    const shouldFallback = err && (err.code === 'ER_SP_DOES_NOT_EXIST' || /PROCEDURE|doesn't exist|not found/i.test(err.message));
    if (!shouldFallback) throw err;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute('SELECT current_balance FROM customers WHERE id = ? AND user_id = ? FOR UPDATE', [customer_id, userId]);
      if (rows.length === 0) {
        throw new AppError('Customer not found', 404);
      }

      let running_bal = parseFloat(rows[0].current_balance || 0);
      if (type === 'credit') running_bal = running_bal + numAmount;
      else running_bal = running_bal - numAmount;

      await conn.execute(
        `INSERT INTO transactions (customer_id, user_id, type, amount, note, payment_method, running_balance) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [customer_id, userId, type, numAmount, note?.trim() || null, payment_method, running_bal]
      );

      if (type === 'credit') {
        await conn.execute('UPDATE customers SET current_balance = ?, total_credit = COALESCE(total_credit,0) + ?, last_activity = NOW() WHERE id = ? AND user_id = ?', [running_bal, numAmount, customer_id, userId]);
      } else {
        await conn.execute('UPDATE customers SET current_balance = ?, total_debit = COALESCE(total_debit,0) + ?, last_activity = NOW() WHERE id = ? AND user_id = ?', [running_bal, numAmount, customer_id, userId]);
      }

      await conn.commit();

      const [transactionResult] = await conn.execute(
        `SELECT t.*, c.name as customer_name, c.current_balance as customer_balance
         FROM transactions t
         JOIN customers c ON t.customer_id = c.id
         WHERE t.customer_id = ? AND t.user_id = ?
         ORDER BY t.created_at DESC LIMIT 1`,
        [customer_id, userId]
      );

      return transactionResult[0];
    } catch (innerErr) {
      await conn.rollback();
      throw innerErr;
    } finally {
      conn.release();
    }
  }

  const transactionResult = await safeQuery(
    `SELECT t.*, c.name as customer_name, c.current_balance as customer_balance
     FROM transactions t
     JOIN customers c ON t.customer_id = c.id
     WHERE t.customer_id = ? AND t.user_id = ?
     ORDER BY t.created_at DESC LIMIT 1`,
    [customer_id, userId]
  );

  return transactionResult[0];
};

const getTransactionsByCustomer = async (userId, customerId, queryOptions) => {
  const { page = 1, limit = 20, type, start_date, end_date } = queryOptions;

  let sql = `
    SELECT
      t.id, t.type, t.amount, t.note, t.payment_method, t.running_balance, t.created_at, t.updated_at,
      c.name as customer_name
    FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE t.customer_id = ? AND c.user_id = ? AND c.is_active = TRUE
  `;
  const params = [customerId, userId];

  if (type && ["credit", "debit"].includes(type)) {
    sql += " AND t.type = ?";
    params.push(type);
  }
  if (start_date) {
    sql += " AND DATE(t.created_at) >= ?";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND DATE(t.created_at) <= ?";
    params.push(end_date);
  }
  sql += " ORDER BY t.created_at DESC";

  const paginatedResult = await getPaginated(sql, params, page, limit);
  return {
    transactions: paginatedResult.data,
    pagination: {
      currentPage: paginatedResult.page,
      totalPages: paginatedResult.totalPages,
      totalTransactions: paginatedResult.total,
      hasNext: paginatedResult.page < paginatedResult.totalPages,
      hasPrev: paginatedResult.page > 1
    }
  };
};

const getLedger = async (userId, customerId) => {
  const result = await safeQuery(`
    SELECT
      t.id, t.type, t.amount, t.note, t.payment_method, t.running_balance, t.created_at,
      c.name as customer_name, c.current_balance as current_customer_balance
    FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE t.customer_id = ? AND c.user_id = ? AND c.is_active = TRUE
    ORDER BY t.created_at DESC
  `, [customerId, userId]);

  return {
    customer_id: customerId,
    customer_name: result[0]?.customer_name || null,
    current_balance: result[0]?.current_customer_balance || 0,
    transactions: result || []
  };
};

const getBalance = async (userId, customerId) => {
  const result = await safeQuery(`
    SELECT
      c.name, c.current_balance, c.total_credit, c.total_debit, c.last_activity,
      COUNT(t.id) as transaction_count
    FROM customers c
    LEFT JOIN transactions t ON c.id = t.customer_id
    WHERE c.id = ? AND c.user_id = ? AND c.is_active = TRUE
    GROUP BY c.id
  `, [customerId, userId]);

  if (result.length === 0) {
    throw new AppError("Customer not found", 404);
  }

  const data = result[0];
  return {
    customer_id: customerId,
    customer_name: data.name,
    current_balance: parseFloat(data.current_balance || 0),
    total_credit: parseFloat(data.total_credit || 0),
    total_debit: parseFloat(data.total_debit || 0),
    last_activity: data.last_activity,
    transaction_count: data.transaction_count || 0,
    status: data.current_balance > 0 ? 'pending' : 'cleared'
  };
};

const updateTransaction = async (userId, transactionId, data) => {
  const { type, amount, note, payment_method } = data;
  const checkResult = await safeQuery(`
    SELECT t.id FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE t.id = ? AND c.user_id = ?
  `, [transactionId, userId]);

  if (checkResult.length === 0) throw new AppError("Transaction not found", 404);

  // Modifying the transaction safely triggers `after_transaction_update`
  await safeQuery(
    `UPDATE transactions SET type = ?, amount = ?, note = ?, payment_method = ?, updated_at = NOW() WHERE id = ?`,
    [type, parseFloat(amount), note?.trim() || null, payment_method || 'cash', transactionId]
  );
};

const deleteTransaction = async (userId, transactionId) => {
  const checkResult = await safeQuery(`
    SELECT t.id FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE t.id = ? AND c.user_id = ?
  `, [transactionId, userId]);

  if (checkResult.length === 0) throw new AppError("Transaction not found", 404);
  // Deleting the transaction safely triggers `after_transaction_delete`
  await safeQuery("DELETE FROM transactions WHERE id = ?", [transactionId]);
};

const getDashboardSummary = async (userId) => {
  // Get customer stats
  const customerStats = await safeQuery(`
    SELECT
      COUNT(*) as total_customers,
      COUNT(CASE WHEN current_balance > 0 THEN 1 END) as customers_with_pending,
      SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END) as total_pending_amount
    FROM customers
    WHERE user_id = ? AND is_active = TRUE
  `, [userId]);

  // Get transaction stats
  const transactionStats = await safeQuery(`
    SELECT
      COUNT(*) as total_transactions,
      COUNT(CASE WHEN DATE(t.created_at) = CURDATE() THEN 1 END) as today_transactions,
      SUM(t.amount) as total_transaction_amount,
      SUM(CASE WHEN DATE(t.created_at) = CURDATE() THEN t.amount ELSE 0 END) as today_amount
    FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE c.user_id = ?
  `, [userId]);

  // Get monthly profit (assuming credit = income, debit = expense)
  const monthlyStats = await safeQuery(`
    SELECT
      SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END) -
      SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE 0 END) as monthly_profit,
      SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END) as monthly_income,
      SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE 0 END) as monthly_expense
    FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE c.user_id = ? AND MONTH(t.created_at) = MONTH(CURDATE()) AND YEAR(t.created_at) = YEAR(CURDATE())
  `, [userId]);

  const totalOutstanding = parseFloat(customerStats[0]?.total_pending_amount || 0);
  const totalTransactions = transactionStats[0]?.total_transactions || 0;
  const activeTransactions = transactionStats[0]?.today_transactions || 0;
  const monthlyRevenue = parseFloat(monthlyStats[0]?.monthly_income || 0);
  const monthlyProfit = parseFloat(monthlyStats[0]?.monthly_profit || 0);
  const monthlyExpense = parseFloat(monthlyStats[0]?.monthly_expense || 0);

  return {
    total_customers: customerStats[0]?.total_customers || 0,
    total_outstanding: totalOutstanding,
    total_transactions: totalTransactions,
    active_transactions: activeTransactions,
    monthly_revenue: monthlyRevenue,
    monthly_profit: monthlyProfit,
    monthly_expense: monthlyExpense,
    customers: {
      total: customerStats[0]?.total_customers || 0,
      with_pending: customerStats[0]?.customers_with_pending || 0,
      total_pending_amount: totalOutstanding
    },
    transactions: {
      total: totalTransactions,
      today: activeTransactions,
      total_amount: parseFloat(transactionStats[0]?.total_transaction_amount || 0),
      today_amount: parseFloat(transactionStats[0]?.today_amount || 0)
    },
    monthly: {
      profit: monthlyProfit,
      income: monthlyRevenue,
      expense: monthlyExpense
    }
  };
};

const getTransactionReport = async (userId, queryOptions) => {
  const { start_date, end_date, customer_id, type } = queryOptions;

  let sql = `
    SELECT
      t.id, t.type, t.amount, t.note, t.payment_method, t.created_at,
      c.name as customer_name, c.phone as customer_phone
    FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE c.user_id = ? AND c.is_active = TRUE
  `;
  const params = [userId];
  const conditions = [];

  if (start_date) { conditions.push("DATE(t.created_at) >= ?"); params.push(start_date); }
  if (end_date) { conditions.push("DATE(t.created_at) <= ?"); params.push(end_date); }
  if (customer_id) { conditions.push("t.customer_id = ?"); params.push(customer_id); }
  if (type && ["credit", "debit"].includes(type)) { conditions.push("t.type = ?"); params.push(type); }
  if (conditions.length > 0) { sql += " AND " + conditions.join(" AND "); }
  
  sql += " ORDER BY t.created_at DESC";

  const result = await safeQuery(sql, params);

  const summary = {
    total_transactions: result.length,
    total_credit: result.filter(t => t.type === 'credit').reduce((sum, t) => sum + parseFloat(t.amount), 0),
    total_debit: result.filter(t => t.type === 'debit').reduce((sum, t) => sum + parseFloat(t.amount), 0),
    net_amount: 0
  };
  summary.net_amount = summary.total_credit - summary.total_debit;

  return { transactions: result || [], summary, filters: { start_date, end_date, customer_id, type } };
};

module.exports = { addTransaction, getTransactionsByCustomer, getLedger, getBalance, updateTransaction, deleteTransaction, getDashboardSummary, getTransactionReport };