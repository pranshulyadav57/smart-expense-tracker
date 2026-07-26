// =========================
// STANDARDIZED RESPONSE HANDLER
// =========================

/**
 * Standardized success response
 * @param {boolean} success - Success status
 * @param {*} data - Response data
 * @param {string} message - Response message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Standardized response object
 */
const standardizeResponse = (success = true, data = null, message = "Success", statusCode = 200) => {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString()
  };
};

/**
 * Success response wrapper
 */
const success = (res, data = null, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json(standardizeResponse(true, data, message, statusCode));
};

/**
 * Error response wrapper
 */
const error = (res, message = "Something went wrong", statusCode = 500, data = null) => {
  return res.status(statusCode).json(standardizeResponse(false, data, message, statusCode));
};

/**
 * Paginated response
 */
const paginated = (res, data, pagination, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Created resource response (201)
 */
const created = (res, data = null, message = "Resource created successfully") => {
  return res.status(201).json(standardizeResponse(true, data, message, 201));
};

/**
 * Bad request response (400)
 */
const badRequest = (res, message = "Bad request", data = null) => {
  return res.status(400).json(standardizeResponse(false, data, message, 400));
};

/**
 * Unauthorized response (401)
 */
const unauthorized = (res, message = "Unauthorized", data = null) => {
  return res.status(401).json(standardizeResponse(false, data, message, 401));
};

/**
 * Forbidden response (403)
 */
const forbidden = (res, message = "Forbidden", data = null) => {
  return res.status(403).json(standardizeResponse(false, data, message, 403));
};

/**
 * Not found response (404)
 */
const notFound = (res, message = "Resource not found", data = null) => {
  return res.status(404).json(standardizeResponse(false, data, message, 404));
};

/**
 * Conflict response (409)
 */
const conflict = (res, message = "Conflict", data = null) => {
  return res.status(409).json(standardizeResponse(false, data, message, 409));
};

module.exports = {
  standardizeResponse,
  success,
  error,
  paginated,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict
};
