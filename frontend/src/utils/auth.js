/**
 * Stores user session data in localStorage.
 * @param {object} user - The user object.
 * @param {string} accessToken - The JWT access token.
 * @param {string} refreshToken - The JWT refresh token.
 */
export const setSession = (user, accessToken, refreshToken) => {
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
  if (accessToken) {
    localStorage.setItem("accessToken", accessToken);
  }
  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }
};

/**
 * Clears all session data from localStorage.
 */
export const clearSession = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

/**
 * Retrieves the access token from localStorage.
 * @returns {string|null} The access token or null if not found.
 */
export const getToken = () => {
  return localStorage.getItem("accessToken");
};

/**
 * Retrieves the refresh token from localStorage.
 * @returns {string|null} The refresh token or null if not found.
 */
export const getRefreshToken = () => {
  return localStorage.getItem("refreshToken");
};

/**
 * Retrieves and parses the user object from localStorage.
 * Normalizes role to lowercase for consistent comparisons.
 * @returns {object|null} The user object or null if not found or parsing fails.
 */
export const getUser = () => {
  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    const user = JSON.parse(storedUser);
    
    /* ---------- NORMALIZE ROLE ---------- */
    if (user.role) {
      user.role = String(user.role)
        .toLowerCase()
        .trim();
    }
    
    return user;
  } catch (error) {
    console.error("Failed to parse stored user:", error);
    clearSession();
    return null;
  }
};