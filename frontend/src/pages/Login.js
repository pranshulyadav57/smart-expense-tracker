import {
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  useNavigate,
  Link,
} from "react-router-dom";

import toast from "react-hot-toast";

import { useAuth } from "../hooks/useAuth";

import {
  getErrorMessage,
} from "../services/api";

import AuthLayout from "../components/AuthLayout";

export default function Login() {
  const navigate = useNavigate();

  const auth = useAuth();

  // =====================================================
  // STATE
  // =====================================================

  const [credentials, setCredentials] =
    useState({
      identifier: "",
      password: "",
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // =====================================================
  // REDIRECT IF ALREADY LOGGED IN
  // =====================================================

  useEffect(() => {
    if (
      auth.loading
    ) {
      return;
    }

    if (
      auth.isAuthenticated &&
      auth.user
    ) {
      const destination =
        auth.user.role === "business"
          ? "/business"
          : "/student";

      navigate(destination, {
        replace: true,
      });
    }
  }, [
    auth.loading,
    auth.isAuthenticated,
    auth.user,
    navigate,
  ]);

  // =====================================================
  // INPUT CHANGE
  // =====================================================

  const handleChange =
    useCallback(
      (e) => {
        const {
          name,
          value,
        } = e.target;

        setCredentials((prev) => ({
          ...prev,
          [name]: value,
        }));

        if (error) {
          setError("");
        }
      },
      [error]
    );

  // =====================================================
  // VALIDATION
  // =====================================================

  const validateForm =
    useCallback(() => {
      const {
        identifier,
        password,
      } = credentials;

      const trimmedIdentifier =
        identifier.trim();

      // Required validation

      if (!trimmedIdentifier) {
        return "Email or username is required.";
      }

      if (!password) {
        return "Password is required.";
      }

      // Password validation

      if (
        password.length < 4
      ) {
        return "Password must be at least 4 characters.";
      }

      // Email validation

      if (
        trimmedIdentifier.includes(
          "@"
        )
      ) {
        const emailRegex =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
          !emailRegex.test(
            trimmedIdentifier
          )
        ) {
          return "Invalid email format.";
        }
      } else {
        // Username validation

        if (
          trimmedIdentifier.length <
          3
        ) {
          return "Username must be at least 3 characters.";
        }

        if (
          !/^[a-zA-Z0-9_]+$/.test(
            trimmedIdentifier
          )
        ) {
          return "Username can only contain letters, numbers, and underscores.";
        }
      }

      return null;
    }, [credentials]);

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit =
    useCallback(
      async (e) => {
        e.preventDefault();

        setError("");

        const validationError =
          validateForm();

        if (
          validationError
        ) {
          setError(
            validationError
          );

          return;
        }

        setLoading(true);

        try {
          // IMPORTANT:
          // useAuth expects "email"
          // internally converts to identifier

          // Send trimmed identifier; if it's an email, normalize to lowercase
          const rawIdentifier = credentials.identifier.trim();
          const identifierToSend = rawIdentifier.includes('@') ? rawIdentifier.toLowerCase() : rawIdentifier;

          await auth.login({
            identifier: identifierToSend,
            password: credentials.password,
          });

          toast.success(
            "Login successful!"
          );

          // Redirect handled by useEffect
        } catch (err) {
          console.error(
            "LOGIN ERROR:",
            err
          );

          setError(
            getErrorMessage(err)
          );
        } finally {
          setLoading(false);
        }
      },
      [
        auth,
        credentials,
        validateForm,
      ]
    );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <AuthLayout title="Login to Your Account">
      <form
        className="auth-form"
        onSubmit={
          handleSubmit
        }
      >
        {error && (
          <div
            className="error-message"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* IDENTIFIER */}

        <div className="form-group">
          <label className="form-label">
            Email or Username
          </label>

          <input
            type="text"
            name="identifier"
            className="form-input"
            placeholder="Enter your email or username"
            value={
              credentials.identifier
            }
            onChange={
              handleChange
            }
            autoComplete="username"
            disabled={loading}
            required
          />
        </div>

        {/* PASSWORD */}

        <div className="form-group">
          <label className="form-label">
            Password
          </label>

          <input
            type="password"
            name="password"
            className="form-input"
            placeholder="Enter your password"
            value={
              credentials.password
            }
            onChange={
              handleChange
            }
            autoComplete="current-password"
            disabled={loading}
            required
          />
        </div>

        {/* FORGOT PASSWORD */}

        <div
          className="form-group"
          style={{
            textAlign:
              "right",
            marginBottom:
              "1rem",
          }}
        >
          <Link
            to="/forgot-password"
            className="auth-link"
          >
            Forgot Password?
          </Link>
        </div>

        {/* SUBMIT */}

        <button
          type="submit"
          className="submit-btn"
          disabled={
            loading ||
            !credentials.identifier.trim() ||
            !credentials.password
          }
        >
          {loading
            ? "Logging in..."
            : "Login"}
        </button>

        {/* FOOTER */}

        <p
          style={{
            textAlign:
              "center",
            marginTop:
              "1.5rem",
          }}
        >
          Don't have an account?{" "}

          <Link
            to="/register"
            className="auth-link"
          >
            Register
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}