// =========================
// DATABASE UTILITIES
// =========================

const db = require('../config/db');
const { standardizeResponse } = require('./responseHandler');

/**
 * Safe database query execution
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query result
 */
async function safeQuery(sql, params = []) {
  try {
    const [result] = await db.execute(sql, params);
    return result || [];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get paginated results
 * @param {string} sql - Base SQL query
 * @param {Array} params - Query parameters
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Paginated result
 */
async function getPaginated(sql, params = [], page = 1, limit = 10) {
  try {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * pageSize;

    // Build count SQL in a robust way.
    // If the query has GROUP BY, use COUNT(DISTINCT <group_column>) to compute totals.
    let total = 0;

    // Remove any trailing semicolons to avoid SQL errors
    const cleanedSql = sql.replace(/;\s*$/, "");

    // Try to detect GROUP BY and a grouping column
    const groupMatch = cleanedSql.match(/GROUP\s+BY\s+([^\n\r;]+)/i);
    let countSql;
    if (groupMatch) {
      // Attempt to extract the first column from GROUP BY clause
      const groupCols = groupMatch[1].split(',').map(s => s.trim());
      const groupCol = groupCols[0];

      // Remove ORDER BY clause if present for count query
      const withoutOrder = cleanedSql.replace(/ORDER\s+BY[\s\S]*$/i, '');

      // Replace the select clause with COUNT(DISTINCT <groupCol>)
      const fromIndex = withoutOrder.search(/\bFROM\b/i);
      if (fromIndex !== -1) {
        countSql = `SELECT COUNT(DISTINCT ${groupCol}) as total ${withoutOrder.slice(fromIndex)}`;
      } else {
        // fallback to wrapping
        countSql = `SELECT COUNT(*) as total FROM (${withoutOrder}) as count_table`;
      }
    } else {
      // No GROUP BY - we can safely replace the select list with COUNT(*)
      const withoutOrder = cleanedSql.replace(/ORDER\s+BY[\s\S]*$/i, '');
      const fromIndex = withoutOrder.search(/\bFROM\b/i);
      if (fromIndex !== -1) {
        countSql = `SELECT COUNT(*) as total ${withoutOrder.slice(fromIndex)}`;
      } else {
        countSql = `SELECT COUNT(*) as total FROM (${withoutOrder}) as count_table`;
      }
    }

    try {
      const [countRows] = await db.execute(countSql, params);
      // countRows may be an array of rows or a single row wrapper depending on driver
      if (Array.isArray(countRows)) {
        total = countRows[0]?.total || 0;
      } else if (countRows && typeof countRows === 'object') {
        total = countRows.total || 0;
      }
    } catch (err) {
      // Fallback: try wrapping original query (older behavior)
      const fallbackCountSql = `SELECT COUNT(*) as total FROM (${cleanedSql}) as count_table`;
      const [countRows] = await db.execute(fallbackCountSql, params);
      total = countRows[0]?.total || 0;
    }

    // Get paginated data. Inline numeric LIMIT/OFFSET to avoid driver binding issues.
    const dataSql = `${cleanedSql} LIMIT ${pageSize} OFFSET ${offset}`;
    const [data] = await db.execute(dataSql, params);

    return {
      data: data || [],
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    console.error('Pagination error:', error);
    throw error;
  }
}

module.exports = {
  safeQuery,
  getPaginated
};
