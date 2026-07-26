// =========================
// GLOBAL CONSTANTS
// =========================

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  SERVER_ERROR: 500
};

// Error Codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST'
};

// Error Messages
const ERROR_MESSAGES = {
  REQUIRED_FIELDS: 'All required fields are mandatory',
  INVALID_EMAIL: 'Please provide a valid email address',
  INVALID_USERNAME: 'Username must be at least 3 characters and may only contain letters, numbers, and underscores',
  INVALID_PASSWORD: 'Password must be at least 4 characters long',
  INVALID_ROLE: 'Invalid role specified',
  DUPLICATE_EMAIL: 'Email already registered',
  DUPLICATE_USERNAME: 'Username already taken',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid email or password',
  NO_TOKEN: 'No token provided',
  INVALID_TOKEN: 'Invalid or expired token',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  RESOURCE_NOT_FOUND: 'Resource not found',
  DUPLICATE_ENTRY: 'This resource already exists',
  INVALID_REFERENCE: 'The referenced resource does not exist',
  SERVER_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database operation failed'
};

// User Roles
const ROLES = {
  BUSINESS: 'business',
  STUDENT: 'student'
};

// Transaction Types
const TRANSACTION_TYPES = {
  CREDIT: 'credit',
  DEBIT: 'debit'
};

// Payment Methods
const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  UPI: 'upi',
  CHEQUE: 'cheque',
  OTHER: 'other'
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// Time Constants
const TIME = {
  TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY: '30d'
};

module.exports = {
  HTTP_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES,
  ROLES,
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  PAGINATION,
  TIME
};
