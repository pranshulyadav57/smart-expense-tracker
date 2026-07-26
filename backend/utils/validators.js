// =========================
// VALIDATION UTILITIES
// =========================

/**
 * Check if field is required and not empty
 */
const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate username (3+ chars, alphanumeric + underscore)
 */
const isValidUsername = (username) => {
  if (!username || username.length < 3) return false;
  return /^[a-zA-Z0-9_]+$/.test(username);
};

/**
 * Validate password (minimum 8 chars, uppercase, lowercase, number)
 */
const isValidPassword = (password) => {
  if (!password) return false;
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
};

/**
 * Validate role
 */
const isValidRole = (role) => {
  return ["business", "student"].includes(role);
};

/**
 * Validate phone format (basic)
 */
const isValidPhone = (phone) => {
  if (!phone) return false;
  // Remove common phone formatting characters
  const cleaned = phone.replace(/[\s\-\+\(\)\.]/g, "");
  // Check if it's 10+ digits
  return /^\d{10,}$/.test(cleaned);
};

/**
 * Validate amount (positive number)
 */
const isValidAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

/**
 * Validate positive number
 */
const isPositiveNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
};

/**
 * Validate transaction type
 */
const isValidTransactionType = (type) => {
  return ["credit", "debit"].includes(type);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
const isValidDate = (dateString) => {
  if (!dateString) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Sanitize input string
 */
const sanitize = (input) => {
  if (!input) return null;
  return String(input)
    .trim()
    .replace(/[<>]/g, "")
    .substring(0, 500);
};

/**
 * Validate pagination parameters
 */
const validatePagination = (page, limit) => {
  const p = parseInt(page) || 1;
  const l = parseInt(limit) || 20;
  
  return {
    page: Math.max(1, p),
    limit: Math.min(Math.max(1, l), 100) // Cap at 100 items per page
  };
};

module.exports = {
  isRequired,
  isValidEmail,
  isValidUsername,
  isValidPassword,
  isValidRole,
  isValidPhone,
  isValidAmount,
  isPositiveNumber,
  isValidTransactionType,
  isValidDate,
  sanitize,
  validatePagination
};
