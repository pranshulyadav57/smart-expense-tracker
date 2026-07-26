import { Routes, Route, Navigate } from "react-router-dom";

/* =========================
   AUTH
========================= */

import PrivateRoute from "./components/PrivateRoute";
import { ThemeProvider } from "./contexts/ThemeContext";

/* =========================
   PUBLIC PAGES
========================= */

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

/* =========================
   STUDENT PAGES
========================= */

import StudentDashboard from "./pages/student/Dashboard";

/* =========================
   BUSINESS PAGES
========================= */

import BusinessDashboard from "./pages/business/Dashboard";
import CustomerProfile from "./pages/business/CustomerProfile";
import BusinessReports from "./pages/business/Reports";

/* =========================
   APP ROUTES
========================= */

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
      {/* =====================================================
          PUBLIC ROUTES
      ===================================================== */}

      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      {/* =====================================================
          STUDENT ROUTES
      ===================================================== */}

      <Route element={<PrivateRoute role="student" />}>
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/dashboard" element={<Navigate to="/student" replace />} />
      </Route>

      {/* =====================================================
          BUSINESS ROUTES
      ===================================================== */}

      <Route element={<PrivateRoute role="business" />}>
        <Route path="/business" element={<BusinessDashboard />} />
        <Route path="/business/dashboard" element={<Navigate to="/business" replace />} />
        <Route path="/business/reports" element={<BusinessReports />} />
        <Route path="/business/customer/:id" element={<CustomerProfile />} />
      </Route>

      {/* =====================================================
          FALLBACK ROUTE
      ===================================================== */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
      </Routes>
    </ThemeProvider>
  );
}