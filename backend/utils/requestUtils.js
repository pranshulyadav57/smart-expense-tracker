/**
 * Utility helpers for sanitizing request query parameters
 * and building safe filter objects for database queries.
 */
const { AppError } = require('../middleware/errorMiddleware');

/**
 * sanitizeFilters(query, allowedKeys)
 * - query: the req.query object
 * - allowedKeys: array of keys that are allowed to be returned
 * Returns a plain object with only allowed keys and simple normalization
 */
const sanitizeFilters = (query = {}, allowedKeys = []) => {
  const filters = {};

  for (const key of allowedKeys) {
    if (!(key in query)) continue;

    let value = query[key];

    // If multiple values provided (array), pick the first
    if (Array.isArray(value)) value = value[0];

    if (value === undefined || value === null || String(value).trim() === '') continue;

    // Basic normalization for known keys
    if (/date/i.test(key)) {
      // allow ISO date strings only
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        throw new AppError(`Invalid date for filter ${key}`, 400);
      }
      filters[key] = d.toISOString();
      continue;
    }

    if (key === 'type') {
      const v = String(value).toLowerCase();
      if (!['credit', 'debit', 'all'].includes(v)) {
        // allow 'all' to be interpreted by service layer
        throw new AppError('Invalid transaction type filter', 400);
      }
      filters[key] = v;
      continue;
    }

    // default: trim strings and pass through numbers
    if (!Number.isNaN(Number(value)) && value !== '' && String(value).trim() === String(Number(value))) {
      filters[key] = Number(value);
    } else {
      filters[key] = String(value).trim();
    }
  }

  return filters;
};

module.exports = {
  sanitizeFilters,
};
