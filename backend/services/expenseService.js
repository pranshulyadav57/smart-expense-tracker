const db = require("../config/db");
const { AppError } = require("../middleware/errorMiddleware");
const logger = require("../utils/logger");
const { sendNotification } = require("./notificationService");

const createExpense = async (userId, expenseData) => {
    const { amount, category, note } = expenseData;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new AppError("Amount must be a positive number", 400);
    }
    if (!category || typeof category !== 'string' || category.trim().length === 0) {
        throw new AppError("Category is required", 400);
    }

    const numAmount = parseFloat(amount);
    const [result] = await db.execute(
        `INSERT INTO expenses (user_id, amount, category, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [userId, numAmount, category.trim(), note?.trim() || null]
    );

    // After creating expense, check monthly budget and notify if thresholds crossed
    (async () => {
        try {
            const today = new Date();
            const month = today.getMonth() + 1;
            const year = today.getFullYear();

            const [monthSumRows] = await db.execute(
                `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
                [userId, month, year]
            );
            const monthSpent = parseFloat(monthSumRows[0]?.total || 0);

            const [budgetRows] = await db.execute(
                `SELECT monthly_limit FROM budgets WHERE user_id = ? AND month = ? AND year = ?`,
                [userId, month, year]
            );
            const profileRows = await db.execute(`SELECT monthly_budget FROM student_profiles WHERE user_id = ?`, [userId]);
            const budgetLimit = parseFloat(budgetRows[0]?.monthly_limit ?? profileRows[0]?.monthly_budget ?? 0);

            if (budgetLimit > 0) {
                const pct = (monthSpent / budgetLimit) * 100;
                if (pct >= 100) {
                    await sendNotification({ to: userId, message: `Budget exceeded: you've spent ₹${monthSpent.toFixed(2)} of ₹${budgetLimit.toFixed(2)}.` });
                } else if (pct >= 80) {
                    await sendNotification({ to: userId, message: `Approaching budget limit: ${Math.round(pct)}% used (${monthSpent.toFixed(2)} of ${budgetLimit.toFixed(2)}).` });
                }
            }
        } catch (err) {
            logger.warn('Budget notification failed', { userId, error: err?.message || err });
        }
    })();

    return { id: result.insertId, amount: numAmount, category: category.trim() };
};

const fetchExpenses = async (userId, queryOptions = {}) => {
    // Accept both snake_case and camelCase query keys
    const {
        page = 1,
        limit = 20,
        category,
        start_date,
        end_date,
        search,
        sortBy,
        sortOrder,
    } = queryOptions;

    // Backwards compat: support camelCase keys from controller
    const startDate = start_date || queryOptions.startDate || queryOptions.start_date;
    const endDate = end_date || queryOptions.endDate || queryOptions.end_date;
    const cat = category || queryOptions.category;
    const qSearch = search || queryOptions.q || queryOptions.search;
    const sBy = sortBy || queryOptions.sortBy;
    const sOrder = (sortOrder || queryOptions.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let sql = `SELECT id, amount, category, note, created_at, updated_at FROM expenses WHERE user_id = ?`;
    const params = [userId];
    const conditions = [];

    if (cat) {
        conditions.push("category = ?");
        params.push(String(cat));
    }
    if (startDate) {
        conditions.push("DATE(created_at) >= ?");
        params.push(String(startDate));
    }
    if (endDate) {
        conditions.push("DATE(created_at) <= ?");
        params.push(String(endDate));
    }
    if (qSearch) {
        // search in category and note
        conditions.push("(category LIKE ? OR note LIKE ?)");
        const like = `%${String(qSearch).replace(/%/g, '')}%`;
        params.push(like, like);
    }

    if (conditions.length > 0) {
        sql += " AND " + conditions.join(" AND ");
    }

    // Count query
    let countSql = "SELECT COUNT(*) as total FROM expenses WHERE user_id = ?";
    const countParams = [userId];
    if (conditions.length > 0) {
        countSql += " AND " + conditions.join(" AND ");
        countParams.push(...params.slice(1));
    }

    logger.info("Expense count SQL", { sql: countSql, params: countParams });
    const [countResult] = await db.execute(countSql, countParams);
    const total = countResult[0]?.total || 0;

    // Determine allowed sort columns to prevent injection
    const allowedSort = ['created_at', 'amount', 'category'];
    const orderBy = allowedSort.includes(sBy) ? sBy : 'created_at';

    // Main query with pagination
    sql += ` ORDER BY ${orderBy} ${sOrder}`;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT ${limitNum} OFFSET ${offset}`;

    logger.info("Expense fetch SQL", { sql, params });

    const [expenses] = await db.execute(sql, params);

    // Category breakdown for UI
    let breakdown = [];
    try {
        let brSql = `SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE user_id = ?`;
        const brParams = [userId];
        if (conditions.length > 0) {
            brSql += " AND " + conditions.join(" AND ");
            brParams.push(...params.slice(1));
        }
        brSql += ` GROUP BY category ORDER BY total DESC LIMIT 10`;
        const [brRows] = await db.execute(brSql, brParams);
        breakdown = brRows || [];
    } catch (err) {
        logger.warn('Failed to compute breakdown', { error: err?.message || err });
    }

    const totalPages = Math.ceil(total / limitNum);

    return {
        expenses: expenses || [],
        breakdown,
        pagination: {
            currentPage: pageNum,
            totalPages,
            totalExpenses: total,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
        }
    };
};

const updateExpenseDetails = async (userId, expenseId, expenseData) => {
    const { amount, category, note } = expenseData;

    if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
        throw new AppError("Amount must be a positive number", 400);
    }
    if (category && (typeof category !== 'string' || category.trim().length === 0)) {
        throw new AppError("Category must be a non-empty string", 400);
    }

    const [existingExpense] = await db.execute(
        "SELECT * FROM expenses WHERE id = ? AND user_id = ?",
        [expenseId, userId]
    );
    if (existingExpense.length === 0) {
        throw new AppError("Expense not found", 404);
    }

    const updateAmount = amount ? parseFloat(amount) : existingExpense[0].amount;
    const updateCategory = category ? category.trim() : existingExpense[0].category;
    const updateNote = note !== undefined ? (note?.trim() || null) : existingExpense[0].note;

    const [result] = await db.execute(
        `UPDATE expenses SET amount = ?, category = ?, note = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
        [updateAmount, updateCategory, updateNote, expenseId, userId]
    );

    // Notify about budget thresholds after update
    (async () => {
        try {
            const today = new Date();
            const month = today.getMonth() + 1;
            const year = today.getFullYear();
            const [monthSumRows] = await db.execute(
                `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
                [userId, month, year]
            );
            const monthSpent = parseFloat(monthSumRows[0]?.total || 0);
            const [budgetRows] = await db.execute(
                `SELECT monthly_limit FROM budgets WHERE user_id = ? AND month = ? AND year = ?`,
                [userId, month, year]
            );
            const profileRows = await db.execute(`SELECT monthly_budget FROM student_profiles WHERE user_id = ?`, [userId]);
            const budgetLimit = parseFloat(budgetRows[0]?.monthly_limit ?? profileRows[0]?.monthly_budget ?? 0);
            if (budgetLimit > 0) {
                const pct = (monthSpent / budgetLimit) * 100;
                if (pct >= 100) {
                    await sendNotification({ to: userId, message: `Budget exceeded: you've spent ₹${monthSpent.toFixed(2)} of ₹${budgetLimit.toFixed(2)}.` });
                } else if (pct >= 80) {
                    await sendNotification({ to: userId, message: `Approaching budget limit: ${Math.round(pct)}% used (${monthSpent.toFixed(2)} of ${budgetLimit.toFixed(2)}).` });
                }
            }
        } catch (err) {
            logger.warn('Budget notification failed (update)', { userId, error: err?.message || err });
        }
    })();

    return result.affectedRows > 0;
};

const removeExpense = async (userId, expenseId) => {
    const [existingExpense] = await db.execute(
        "SELECT id FROM expenses WHERE id = ? AND user_id = ?",
        [expenseId, userId]
    );
    if (existingExpense.length === 0) {
        throw new AppError("Expense not found or you do not have permission to delete it", 404);
    }

    const [result] = await db.execute(
        "DELETE FROM expenses WHERE id = ? AND user_id = ?",
        [expenseId, userId]
    );

    // Notify user that an expense was removed and provide updated monthly spend
    (async () => {
        try {
            const today = new Date();
            const month = today.getMonth() + 1;
            const year = today.getFullYear();
            const [monthSumRows] = await db.execute(
                `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
                [userId, month, year]
            );
            const monthSpent = parseFloat(monthSumRows[0]?.total || 0);
            await sendNotification({ to: userId, message: `Expense deleted. Current month spend updated: ₹${monthSpent.toFixed(2)}.` });
        } catch (err) {
            logger.warn('Budget notification failed (delete)', { userId, error: err?.message || err });
        }
    })();

    return result.affectedRows > 0;
};

const fetchDashboardSummary = async (userId) => {
    const [todayExpenses] = await db.execute(
        `SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
        [userId]
    );
    const [monthExpenses] = await db.execute(
        `SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`,
        [userId]
    );

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const [budgetData] = await db.execute(
        `SELECT monthly_limit FROM budgets WHERE user_id = ? AND month = ? AND year = ?`,
        [userId, currentMonth, currentYear]
    );
    const [profileData] = await db.execute(
        `SELECT monthly_budget FROM student_profiles WHERE user_id = ?`,
        [userId]
    );

    const budget = budgetData[0]?.monthly_limit || profileData[0]?.monthly_budget || 0;
    const todaySpent = todayExpenses[0]?.total || 0;
    const monthSpent = monthExpenses[0]?.total || 0;
    const remaining = budget - monthSpent;
    const percentUsed = budget > 0 ? Math.round((monthSpent / budget) * 100) : 0;

    return {
        todaySpent: parseFloat(todaySpent),
        monthSpent: parseFloat(monthSpent),
        budget: parseFloat(budget),
        remaining: parseFloat(remaining),
        percentUsed
    };
};

const fetchAnalytics = async (userId) => {
    const [categoryWise] = await db.execute(
        `SELECT e.category, SUM(e.amount) as total, COUNT(*) as count FROM expenses e WHERE e.user_id = ? AND e.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY e.category ORDER BY total DESC`,
        [userId]
    );
    const [dailyTrend] = await db.execute(
        `SELECT DATE(e.created_at) as date, SUM(e.amount) as total FROM expenses e WHERE e.user_id = ? AND e.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(e.created_at) ORDER BY date ASC`,
        [userId]
    );

    return {
        categoryWise: categoryWise || [],
        dailyTrend: dailyTrend || []
    };
};

const fetchBudget = async (userId) => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const [budget] = await db.execute(
      `SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?`,
      [userId, month, year]
    );

    if (budget.length > 0) {
      return budget[0];
    }

    // Return default budget from profile
    const [profile] = await db.execute(
      `SELECT monthly_budget FROM student_profiles WHERE user_id = ?`,
      [userId]
    );

    return {
      monthly_limit: profile[0]?.monthly_budget || 0
    };
};

const saveBudget = async (userId, budgetData) => {
    const { monthly_limit, month, year } = budgetData;

    if (!monthly_limit || isNaN(parseFloat(monthly_limit)) || parseFloat(monthly_limit) <= 0) {
      throw new AppError("Monthly limit must be a positive number", 400);
    }

    const today = new Date();
    const targetMonth = month ? parseInt(month) : today.getMonth() + 1;
    const targetYear = year ? parseInt(year) : today.getFullYear();

    // Using INSERT ... ON DUPLICATE KEY UPDATE is more atomic and efficient
    const [result] = await db.execute(
      `INSERT INTO budgets (user_id, monthly_limit, month, year, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE monthly_limit = VALUES(monthly_limit), updated_at = NOW()`,
      [userId, parseFloat(monthly_limit), targetMonth, targetYear]
    );

    return result.affectedRows > 0 || result.insertId > 0;
};

module.exports = {
    createExpense,
    fetchExpenses,
    updateExpenseDetails,
    removeExpense,
    fetchDashboardSummary,
    fetchAnalytics,
    fetchBudget,
    saveBudget,
};