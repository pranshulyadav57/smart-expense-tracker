import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from "react";

import API from "../services/api";
import { setSession, clearSession, getUser, getToken } from "../utils/auth";

const AuthContext = createContext(null);

/* =========================================================
   AUTH PROVIDER
========================================================= */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());
  const [loading, setLoading] = useState(true);

  /* =========================================================
     INITIAL SESSION RESTORE
  ========================================================= */

  const logout = useCallback(() => {
    (async () => {
      try {
        const { getRefreshToken } = await import('../utils/auth');
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            await API.post('/auth/logout', { refreshToken });
          } catch (e) {
            // ignore network errors during logout
            console.warn('Logout API call failed', e?.message || e);
          }
        }
      } catch (e) {
        console.warn('Logout helper failed', e?.message || e);
      }

      clearSession();

      if (API?.defaults?.headers?.common) {
        delete API.defaults.headers.common.Authorization;
      }

      setUser(null);
      setLoading(false);
    })();
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const response = await API.get("/auth/profile");

      console.log("PROFILE RESPONSE:", response?.data);

      if (!response?.data?.success || !response?.data?.data) {
        throw new Error("Invalid profile response");
      }

      let freshUser = response.data.data.user;

      if (!freshUser) {
        throw new Error("User data missing from profile response");
      }

      /* ---------- NORMALIZE ROLE ---------- */
      if (freshUser.role) {
        freshUser.role = String(freshUser.role)
          .toLowerCase()
          .trim();
      }

      if (!["student", "business"].includes(freshUser.role)) {
        throw new Error("Invalid user role");
      }

      setSession(freshUser); // Update user in localStorage, keeps tokens
      setUser(freshUser);

      const currentToken = getToken();
      if (currentToken) {
        API.defaults.headers.common.Authorization = `Bearer ${currentToken}`;
      }

      return freshUser;
    } catch (error) {
      console.error("Session verification failed, logging out.", error);
      logout();
      throw error;
    }
  }, [logout]);

  useEffect(() => {
    const restoreAndVerifySession = async () => {
      setLoading(true);
      try {
        const token = getToken();

        if (!token) {
          clearSession();
          if (API?.defaults?.headers?.common) {
            delete API.defaults.headers.common.Authorization;
          }
          setUser(null);
          return;
        }

        API.defaults.headers.common.Authorization = `Bearer ${token}`;
        await fetchUser();
      } catch (error) {
        // Errors are handled inside fetchUser (which calls logout)
      } finally {
        setLoading(false);
      }
    };
    restoreAndVerifySession();
  }, [fetchUser]);

  /* =========================================================
     LOGIN
  ========================================================= */

  const login = useCallback(async (credentials) => {
    try {
      const identifier = (
        credentials?.identifier ||
        credentials?.email ||
        ""
      ).trim();

      const password = credentials?.password || "";

      /* ---------- VALIDATION ---------- */

      if (!identifier || !password) {
        throw new Error("Email/username and password are required");
      }

      /* ---------- PAYLOAD ---------- */

      const payload = {
        identifier,
        password,
      };

      console.log("LOGIN PAYLOAD:", payload);

      /* ---------- API CALL ---------- */

      const response = await API.post("/auth/login", payload);

      console.log("LOGIN RESPONSE:", response?.data);

      /* ---------- RESPONSE VALIDATION ---------- */

      if (!response?.data) {
        throw new Error("No response from server");
      }

      const { data: responseData, success } = response.data;

      if (!success || !responseData) {
        throw new Error(response.data?.message || "Login failed");
      }

      /* ---------- EXTRACT DATA ---------- */

      const loggedInUser = responseData.user;
      const accessToken = responseData.token || responseData.accessToken;
      const refreshToken = responseData.refreshToken;

      /* ---------- VALIDATION ---------- */

      if (!loggedInUser) {
        throw new Error("User data missing in response");
      }

      if (!accessToken) {
        throw new Error("Authentication token missing in response");
      }

      /* ---------- NORMALIZE ROLE ---------- */

      if (loggedInUser.role) {
        loggedInUser.role = String(loggedInUser.role)
          .toLowerCase()
          .trim();
      }

      if (!["student", "business"].includes(loggedInUser.role)) {
        throw new Error("Invalid user role in response");
      }

      /* ---------- STORE SESSION ---------- */

      setSession(
        loggedInUser,
        accessToken,
        refreshToken
      );

      if (accessToken && API?.defaults?.headers?.common) {
        API.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      }

      setUser(loggedInUser);

      console.log("LOGIN SUCCESS:", loggedInUser);

      return loggedInUser;
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error?.response?.data || error.message
      );

      throw error;
    }
  }, []);

  /* =========================================================
     REGISTER
  ========================================================= */

  const register = useCallback(async (userData) => {
    try {
      /* =====================================================
         IMPORTANT FIX:
         NEVER REBUILD PARTIAL PAYLOAD
         SEND COMPLETE SANITIZED PAYLOAD
      ===================================================== */

      const payload = {
        ...userData,

        username:
          (userData?.username || userData?.name || "").trim(),

        name:
          (userData?.name || "").trim() ||
          (userData?.username || "").trim(),

        email: (userData?.email || "").trim(),

        password: userData?.password || "",

        role: userData?.role || "student",
      };

      /* ---------- BUSINESS FIELDS ---------- */

      if (payload.role === "business") {
        payload.business_name = (
          payload.business_name || ""
        ).trim();

        payload.phone = (
          payload.phone || ""
        ).trim();
      }

      /* ---------- STUDENT FIELDS ---------- */

      if (payload.role === "student") {
        payload.monthly_budget = Number(
          payload.monthly_budget || 0
        );
      }

      /* ---------- REMOVE FRONTEND-ONLY FIELD ---------- */

      delete payload.confirmPassword;

      console.log("REGISTER PAYLOAD:", payload);

      /* ---------- API ---------- */

      const response = await API.post(
        "/auth/register",
        payload
      );

      const responseData = response?.data?.data;

      if (!responseData) {
        throw new Error(
          "Invalid registration response."
        );
      }

      const newUser = responseData.user;
      const accessToken =
        responseData.token || responseData.accessToken;
      const refreshToken = responseData.refreshToken;

      if (!newUser || !accessToken) {
        throw new Error(
          "Registration response missing user/token."
        );
      }

      /* ---------- NORMALIZE ROLE ---------- */
      if (newUser.role) {
        newUser.role = String(newUser.role)
          .toLowerCase()
          .trim();
      }

      /* ---------- STORE SESSION ---------- */

      setSession(
        newUser,
        accessToken,
        refreshToken
      );

      if (accessToken && API?.defaults?.headers?.common) {
        API.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      }

      setUser(newUser);

      return newUser;
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error?.response?.data || error.message
      );

      throw error;
    }
  }, []);

  /* =========================================================
     LOGOUT
  ========================================================= */

  /* =========================================================
     CONTEXT VALUE
  ========================================================= */

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    token: getToken() || null,
    login,
    register,
    logout,
    fetchUser,
    // HACK: Alias to fix components expecting `fetchPageData` from this hook.
    // This should be refactored to use `fetchUser` or a more appropriate
    // data-fetching hook at the component level.
    fetchPageData: fetchUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   CUSTOM HOOK
========================================================= */

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return context;
};