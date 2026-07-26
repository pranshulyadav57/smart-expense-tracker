import { showError } from './Toast';

/**
 * Make API call with retry logic
 * @param {Function} apiCall - Async function that makes the API call
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delayMs - Delay between retries in milliseconds
 * @returns {Promise} API response
 */
export const apiCallWithRetry = async (apiCall, maxRetries = 3, delayMs = 1000) => {
  let lastError = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      if (process.env.NODE_ENV !== 'production') {
        console.error(`API call attempt ${i + 1} failed:`, error);
      }

      // Don't retry on client errors (4xx) except 408 (timeout) or 429 (rate limit)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        if (![408, 429].includes(error.response?.status)) {
          throw error;
        }
      }

      // Don't retry on the last attempt
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw lastError;
};

/**
 * Safe wrapper for API calls
 * @param {Promise} promise - API promise
 * @param {Object} options - Options {onError, onSuccess}
 * @returns {Promise} Resolved value or null
 */
export const safeApiCall = async (promise, { onError = null, onSuccess = null } = {}) => {
  try {
    const result = await promise;
    if (onSuccess) onSuccess(result);
    return result;
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || "An error occurred";
    if (onError) onError(message);
    else showError(message);
    return null;
  }
};

/**
 * Sanitize and safely access nested object properties
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-separated path (e.g., "user.profile.name")
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} Value at path or default
 */
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Check if API response is valid
 * @param {Object} response - API response
 * @returns {boolean} True if response is valid
 */
export const isValidApiResponse = (response) => {
  return (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    'message' in response
  );
};

/**
 * Extract error message from API error
 * @param {Error} error - Error object
 * @returns {string} Error message
 */
export const getErrorMessage = (error) => {
  if (!error) return "An error occurred";
  if (typeof error === 'string') return error;

  // Handle axios error
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.statusText) return error.response.statusText;
  if (error.message) return error.message;

  return "An error occurred";
};
