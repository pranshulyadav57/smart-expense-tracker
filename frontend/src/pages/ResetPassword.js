import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API, { getErrorMessage } from "../services/api";
import AuthLayout from "../components/AuthLayout";
import { showSuccess, showError } from "../utils/Toast";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(null);

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const resetToken = searchParams.get("token");
    if (!resetToken) {
      showError("No reset token found. Please request a new reset link.");
      navigate("/forgot-password", { replace: true });
    } else {
      setToken(resetToken);
    }
  }, [searchParams, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.password || !form.confirmPassword) {
      setError("Both password fields are required.");
      return;
    }
    if (form.password.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await API.auth.resetPassword({
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      showSuccess(response.data.message);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      showError(errorMsg);
      if (errorMsg.toLowerCase().includes("expired")) {
        setTimeout(() => navigate("/forgot-password", { replace: true }), 2500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset Your Password">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">New Password</label>
          <input
            type="password"
            name="password"
            className="form-input"
            placeholder="Enter your new password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            disabled={loading || !token}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input
            type="password"
            name="confirmPassword"
            className="form-input"
            placeholder="Confirm your new password"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            disabled={loading || !token}
            required
          />
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={loading || !token || !form.password || !form.confirmPassword}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </AuthLayout>
  );
}