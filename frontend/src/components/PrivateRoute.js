import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { clearSession } from "../utils/auth";
import { LoadingSpinner } from "./StateComponents";

/**
 * =========================================================
 * PRIVATE ROUTE
 * Protects authenticated routes + role-based routes
 * =========================================================
 */

export default function PrivateRoute({ role }) {
  const auth = useAuth();

  const location = useLocation();

  /* =========================================================
     WAIT FOR AUTH RESTORE
  ========================================================= */

  if (auth.loading) {
    return (
      <LoadingSpinner message="Verifying session..." />
    );
  }

  /* =========================================================
     AUTH VALIDATION
  ========================================================= */

  const isAuthenticated =
    auth.isAuthenticated &&
    auth.user;

  /* =========================================================
     INVALID SESSION CLEANUP
  ========================================================= */

  if (!isAuthenticated) {
    clearSession();

    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  /* =========================================================
     ROLE VALIDATION
  ========================================================= */

  const userRole =
    String(auth.user?.role || "")
      .toLowerCase()
      .trim();

  const requiredRole =
    String(role || "")
      .toLowerCase()
      .trim();

  if (
    requiredRole &&
    userRole &&
    userRole !== requiredRole
  ) {
    /*
      Redirect user to THEIR valid dashboard
      instead of restricting access
    */

    const safeRoute =
      userRole === "business"
        ? "/business"
        : "/student";

    return (
      <Navigate
        to={safeRoute}
        replace
      />
    );
  }

  /* =========================================================
     ACCESS GRANTED
  ========================================================= */

  return <Outlet />;
}