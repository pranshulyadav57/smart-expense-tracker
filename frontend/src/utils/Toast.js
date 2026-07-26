import toast from 'react-hot-toast';

/**
 * Show success toast notification
 * @param {string} message - Success message
 * @param {Object} options - Toast options
 */
export const showSuccess = (message = "Success", options = {}) => {
  return toast.success(message, {
    position: 'top-right',
    duration: 3000,
    style: {
      background: '#10b981',
      color: '#fff',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px'
    },
    ...options
  });
};

/**
 * Show error toast notification
 * @param {string} message - Error message
 * @param {Object} options - Toast options
 */
export const showError = (message = "Something went wrong", options = {}) => {
  return toast.error(message, {
    position: 'top-right',
    duration: 4000,
    style: {
      background: '#ef4444',
      color: '#fff',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px'
    },
    ...options
  });
};

/**
 * Show info toast notification
 * @param {string} message - Info message
 * @param {Object} options - Toast options
 */
export const showInfo = (message = "Information", options = {}) => {
  return toast(message, {
    position: 'top-right',
    duration: 3000,
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px'
    },
    ...options
  });
};

/**
 * Show loading toast (no auto-close)
 * @param {string} message - Loading message
 * @returns {string} Toast ID for later dismissal
 */
export const showLoading = (message = "Loading...") => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      background: '#6b7280',
      color: '#fff',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px'
    }
  });
};

/**
 * Dismiss a specific toast
 * @param {string} toastId - Toast ID to dismiss
 */
export const dismissToast = (toastId) => {
  if (toastId) {
    toast.dismiss(toastId);
  }
};

/**
 * Replace a loading toast with success
 * @param {string} toastId - Toast ID to replace
 * @param {string} message - Success message
 */
export const replaceLoadingWithSuccess = (toastId, message = "Success") => {
  toast.success(message, {
    id: toastId,
    position: 'top-right',
    duration: 3000,
    style: {
      background: '#10b981',
      color: '#fff',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px'
    }
  });
};

/**
 * Replace a loading toast with error
 * @param {string} toastId - Toast ID to replace
 * @param {string} message - Error message
 */
export const replaceLoadingWithError = (toastId, message = "Error occurred") => {
  toast.error(message, {
    id: toastId,
    position: 'top-right',
    duration: 4000,
    style: {
      background: '#ef4444',
      color: '#fff',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px'
    }
  });
};

// Default export for backward compatibility
const toastUtils = {
  showSuccess,
  showError,
  showInfo,
  showLoading,
  dismissToast,
  replaceLoadingWithSuccess,
  replaceLoadingWithError
};

export default toastUtils;
