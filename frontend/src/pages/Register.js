import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const auth = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    business_name: "",
    phone: "",
    monthly_budget: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     REDIRECT IF ALREADY AUTHENTICATED
  ========================================================= */

  useEffect(() => {
    if (auth.loading) return;

    if (auth.isAuthenticated && auth.user) {
      const destination =
        auth.user.role === "business"
          ? "/business"
          : "/student";

      navigate(destination, { replace: true });
    }
  }, [
    auth.loading,
    auth.isAuthenticated,
    auth.user,
    navigate,
  ]);

  /* =========================================================
     HANDLE INPUT CHANGE
  ========================================================= */

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear error while typing
      if (error) {
        setError("");
      }
    },
    [error]
  );

  /* =========================================================
     FORM VALIDATION
  ========================================================= */

  const validateForm = useCallback(() => {
    const username = form.username?.trim();
    const email = form.email?.trim();

    // Required validation
    if (!username) {
      return "Username is required";
    }

    if (!email) {
      return "Email is required";
    }

    if (!form.password) {
      return "Password is required";
    }

    if (!form.confirmPassword) {
      return "Please confirm your password";
    }

    // Username validation
    if (username.length < 3) {
      return "Username must be at least 3 characters";
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "Username can only contain letters, numbers, and underscores";
    }

    // Email validation
    if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
        email
      )
    ) {
      return "Please enter a valid email address";
    }

    // Password validation
    if (form.password.length < 4) {
      return "Password must be at least 4 characters";
    }

    if (form.password !== form.confirmPassword) {
      return "Passwords do not match";
    }

    /* =========================================================
       BUSINESS VALIDATION
    ========================================================= */

    if (form.role === "business") {
      if (!form.business_name?.trim()) {
        return "Business name is required";
      }

      if (!form.phone?.trim()) {
        return "Phone number is required";
      }

      if (
        !/^[0-9()+\s-]{7,}$/.test(
          form.phone.replace(/\s/g, "")
        )
      ) {
        return "Please enter a valid phone number";
      }
    }

    /* =========================================================
       STUDENT VALIDATION
    ========================================================= */

    if (form.role === "student") {
      if (!form.monthly_budget) {
        return "Monthly budget is required";
      }

      if (Number(form.monthly_budget) <= 0) {
        return "Monthly budget must be greater than 0";
      }
    }

    return null;
  }, [form]);

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      setError("");

      const validationMessage = validateForm();

      if (validationMessage) {
        setError(validationMessage);
        return;
      }

      setLoading(true);

      try {
        /* =====================================================
           CLEAN BACKEND-COMPATIBLE PAYLOAD
        ===================================================== */

        const payload = {
          name: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        };

        // BUSINESS PAYLOAD
        if (form.role === "business") {
          payload.business_name =
            form.business_name.trim();

          payload.phone =
            form.phone.trim();
        }

        // STUDENT PAYLOAD
        if (form.role === "student") {
          payload.monthly_budget = Number(
            form.monthly_budget
          );
        }

        console.log(
          "REGISTER PAYLOAD:",
          payload
        );

        await auth.register(payload);

        toast.success(
          "Account created successfully!"
        );

        // Redirect handled automatically by useEffect

      } catch (err) {
        console.error(
          "REGISTER ERROR:",
          err
        );

        setError(getErrorMessage(err));

      } finally {
        setLoading(false);
      }
    },
    [auth, form, validateForm]
  );

  /* =========================================================
     UI
  ========================================================= */

  return (
    <AuthLayout title="Create Your Account">
      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        {error && (
          <div
            className="error-message"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* USERNAME */}

        <div className="form-group">
          <label className="form-label">
            Username *
          </label>

          <input
            type="text"
            name="username"
            className="form-input"
            placeholder="Choose a username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
            disabled={loading}
            required
          />
        </div>

        {/* EMAIL */}

        <div className="form-group">
          <label className="form-label">
            Email *
          </label>

          <input
            type="email"
            name="email"
            className="form-input"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            disabled={loading}
            required
          />
        </div>

        {/* PASSWORD */}

        <div className="form-group">
          <label className="form-label">
            Password *
          </label>

          <input
            type="password"
            name="password"
            className="form-input"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            disabled={loading}
            required
          />
        </div>

        {/* CONFIRM PASSWORD */}

        <div className="form-group">
          <label className="form-label">
            Confirm Password *
          </label>

          <input
            type="password"
            name="confirmPassword"
            className="form-input"
            placeholder="Confirm your password"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            disabled={loading}
            required
          />
        </div>

        {/* ROLE */}

        <div className="form-group">
          <label className="form-label">
            Account Type *
          </label>

          <select
            name="role"
            className="form-input"
            value={form.role}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="student">
              Student
            </option>

            <option value="business">
              Business
            </option>
          </select>
        </div>

        {/* BUSINESS FIELDS */}

        {form.role === "business" && (
          <>
            <div className="form-group">
              <label className="form-label">
                Business Name *
              </label>

              <input
                type="text"
                name="business_name"
                className="form-input"
                placeholder="Enter business name"
                value={form.business_name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Phone *
              </label>

              <input
                type="tel"
                name="phone"
                className="form-input"
                placeholder="Enter phone number"
                value={form.phone}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
          </>
        )}

        {/* STUDENT FIELDS */}

        {form.role === "student" && (
          <div className="form-group">
            <label className="form-label">
              Monthly Budget (₹) *
            </label>

            <input
              type="number"
              name="monthly_budget"
              className="form-input"
              placeholder="Enter monthly budget"
              value={form.monthly_budget}
              onChange={handleChange}
              min="1"
              disabled={loading}
              required
            />
          </div>
        )}

        {/* SUBMIT */}

        <button
          type="submit"
          className="submit-btn"
          disabled={
            loading ||
            !form.username.trim() ||
            !form.email.trim() ||
            !form.password
          }
        >
          {loading
            ? "Creating Account..."
            : "Register"}
        </button>

        {/* FOOTER */}

        <p
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
          }}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            className="auth-link"
          >
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}