const { safeQuery } = require("../utils/dbHelpers");
const { generateStudentInsights, generateBusinessInsights } = require("../utils/aiInsights");

const getStudentInsights = async (userId) => {
  // Fetch up to 6 months of data to allow accurate forecasting without overloading memory
  const expenses = await safeQuery(
    `SELECT amount, category, DATE(created_at) as date FROM expenses WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 180 DAY) ORDER BY created_at DESC LIMIT 500`,
    [userId]
  );
  const today = new Date();
  const budgetRows = await safeQuery(
    `SELECT monthly_limit FROM budgets WHERE user_id = ? AND month = ? AND year = ?`,
    [userId, today.getMonth() + 1, today.getFullYear()]
  );
  return await generateStudentInsights({ expenses, budgetLimit: budgetRows[0]?.monthly_limit || 0 });
};

const getBusinessInsights = async (userId) => {
  // Filter to only actively pending or engaged customers to reduce payload size
  const customers = await safeQuery(
    `SELECT id, name, current_balance, total_credit, total_debit, is_active, last_activity FROM customers WHERE user_id = ? AND (is_active = TRUE OR current_balance > 0) ORDER BY last_activity DESC LIMIT 200`,
    [userId]
  );
  const transactions = await safeQuery(
    `SELECT t.id, t.customer_id, t.type, t.amount, t.payment_method, DATE(t.created_at) as date, c.name as customer_name
     FROM transactions t JOIN customers c ON t.customer_id = c.id WHERE c.user_id = ? AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) ORDER BY t.created_at DESC LIMIT 200`,
    [userId]
  );
  const statsRows = await safeQuery(
    `SELECT COUNT(*) AS total_customers, COALESCE(SUM(current_balance),0) AS total_outstanding,
     COALESCE(AVG(current_balance),0) AS average_balance, COALESCE(SUM(total_credit),0) AS total_credit,
     COALESCE(SUM(total_debit),0) AS total_debit FROM customers WHERE user_id = ?`,
    [userId]
  );
  return await generateBusinessInsights({ customers, transactions, stats: statsRows[0] || {} });
};

module.exports = { getStudentInsights, getBusinessInsights };