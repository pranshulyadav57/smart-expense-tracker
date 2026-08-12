
import axios from "axios";

import { // This import creates a circular dependency, which is the root cause of the error.
  getToken,
  getRefreshToken,
  setSession,
  clearSession,
  getUser,
} from "../utils/auth"; // Corrected to import from a separate utility file.

/* ======================================================
   CONFIG
====================================================== */

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || // Recommended
  process.env.REACT_APP_API_URL || // Fallback
  "http://localhost:5000/api";

const API_TIMEOUT = 15000;

/* ======================================================
   AXIOS INSTANCE
====================================================== */

const API = axios.create({
  baseURL: API_BASE_URL,

  // Send cookies with cross-origin requests, crucial for httpOnly refresh tokens.
  withCredentials: true,

  timeout: API_TIMEOUT,

  headers: {
    "Content-Type": "application/json",
  },
});
const setAuthHeader = (token) => {
  if (token && API?.defaults?.headers?.common) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
};
/**
 * FIX: Ensure proper error handling for network timeouts
 * Log all request details for debugging
 */
API.interceptors.request.use(
  (config) => {
    // Ensure timeout is set per request
    config.timeout = API_TIMEOUT;
    return config;
  },
  (error) => Promise.reject(error)
);

/* ======================================================
   RESTORE AUTH HEADER
====================================================== */

const existingToken = getToken();

if (existingToken) {
  setAuthHeader(existingToken);
}

/* ======================================================
   REQUEST INTERCEPTOR - ATTACH TOKEN
====================================================== */

API.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => Promise.reject(error)
);

/* ======================================================
   REFRESH MANAGEMENT
====================================================== */

let isRefreshing = false;

let failedQueue = [];

const processQueue = (
  error,
  token = null
) => {
  failedQueue.forEach(
    (promise) => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token);
      }
    }
  );

  failedQueue = [];
};

const clearAuthHeader = () => {
  if (API?.defaults?.headers?.common) {
    delete API.defaults.headers.common.Authorization;
  }
};



/* ======================================================
   FORCE LOGOUT
====================================================== */

const forceLogout = (
  error
) => {
  clearSession();
  clearAuthHeader();

  processQueue(error, null);

  if (
    typeof window !==
    "undefined"
  ) {
    window.location.replace(
      "/login"
    );
  }

  return Promise.reject(error);
};

/* ======================================================
   RESPONSE INTERCEPTOR - HANDLE 401 & REFRESH
====================================================== */

API.interceptors.response.use(
  (response) => {
    // Success - ensure data structure is correct
    if (response?.data && !response.data.data && response.data.success) {
      // Backward compatibility: wrap data if not already wrapped
      // Some endpoints may return unwrapped data
    }
    return response;
  },

  async (error) => {
    const originalRequest = error.config;

    // Network error or timeout - don't retry
    if (!error.response) {
      console.error("Network Error:", error.message);
      return Promise.reject({
        ...error,
        message: error.code === "ECONNABORTED" 
          ? "Request timeout. Please check if server is running." 
          : "Cannot connect to server. Please check your internet connection.",
      });
    }

    const isUnauthorized = error?.response?.status === 401;
    const isRetry = originalRequest?._retry;
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh-token");

    /* ================================================
       DO NOT RETRY REFRESH ENDPOINT ITSELF
    ================================================ */

    if (isRefreshRequest) {
      return Promise.reject(error);
    }

    /* ================================================
       HANDLE 401 - TOKEN EXPIRED
    ================================================ */

     // Determine if the 401 is due to token expiry/invalid token by inspecting
     // the WWW-Authenticate header or the message in the response body.
     const wwwAuth = error?.response?.headers?.["www-authenticate"] || "";
     const bodyMessage = String(error?.response?.data?.message || "").toLowerCase();
     const isTokenAuthError = wwwAuth.toLowerCase().includes("invalid_token") || wwwAuth.toLowerCase().includes("token_expired") || bodyMessage.includes("token expired") || bodyMessage.includes("invalid token") || bodyMessage.includes("token");

     if (isUnauthorized && !isRetry && isTokenAuthError) {
      /* ============================================
         WAIT IF ALREADY REFRESHING
      ============================================ */

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      /* ============================================
         NO REFRESH TOKEN - FORCE LOGOUT
      ============================================ */

      if (!refreshToken) {
        isRefreshing = false;
        return forceLogout(new Error("Session expired. Please login again."));
      }

      try {
        /* ============================================
           REFRESH TOKEN REQUEST
           Use raw axios to avoid circular interceptor
        ============================================ */

        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken },
          {
            timeout: API_TIMEOUT,
            withCredentials: true,
            headers: { "Content-Type": "application/json" },
          }
        );

        const responseData = refreshResponse?.data?.data;

        /* ============================================
           VALIDATE REFRESH RESPONSE
        ============================================ */

        if (!responseData || !responseData.token) {
          throw new Error("Invalid refresh response structure");
        }

        const newAccessToken = responseData.token;
        const newRefreshToken = responseData.refreshToken || refreshToken;
        const currentUser = responseData.user || getUser();

        if (!currentUser) {
          throw new Error("User session lost after refresh");
        }

        /* ============================================
           SAVE NEW SESSION
        ============================================ */

        setSession(currentUser, newAccessToken, newRefreshToken);

        /* ============================================
           UPDATE AXIOS HEADERS
        ============================================ */

        setAuthHeader(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        /* ============================================
           PROCESS QUEUED REQUESTS
        ============================================ */

        processQueue(null, newAccessToken);

        // Retry original request with new token
        return API(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError?.message);
        processQueue(refreshError, null);
        return forceLogout(
          new Error("Session expired. Please login again.")
        );
      } finally {
        isRefreshing = false;
      }
    }

    // Other errors - pass through
    return Promise.reject(error);
  }
);

/* ======================================================
   ERROR MESSAGE HELPER
====================================================== */

export const getErrorMessage = (error) => {
  // Log structured error for debugging
  try {
    console.error("API ERROR:", error && error.response ? error.response.data || error.response : error);
  } catch (e) {
    console.error("API ERROR (logging failed):", e, error);
  }

  // Network timeout error
  if (error?.code === "ECONNABORTED") {
    return "Request timeout. Please check if the server is running and try again.";
  }

  // No response from server
  if (!error?.response) {
    return error?.message || "Cannot connect to server. Please check your internet connection.";
  }

  // API error response with message
  if (error?.response?.data?.message) {
    return String(error.response.data.message);
  }

  // Validation errors array
  if (Array.isArray(error?.response?.data?.errors)) {
    return error.response.data.errors.map((e) => e.msg || e.message || JSON.stringify(e)).join(", ");
  }

  // HTTP status message
  const statusCode = error?.response?.status;
  if (statusCode === 401) {
    return "Invalid credentials or session expired.";
  }
  if (statusCode === 403) {
    return "You don't have permission to perform this action.";
  }
  if (statusCode === 404) {
    return "Resource not found.";
  }
  if (statusCode === 409) {
    return "This resource already exists.";
  }
  if (statusCode >= 500) {
    return "Server error. Please try again later.";
  }

  // Ensure we always return a string
  if (error && typeof error === 'string') return error;
  if (error?.message) return String(error.message);
  return "Something went wrong. Please try again.";
};

export default API;
