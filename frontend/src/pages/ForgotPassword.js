import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import AuthLayout from "../components/AuthLayout";
import { showSuccess, showError } from "../utils/Toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await API.auth.forgotPassword({ email });
      showSuccess(response.data.message);
      setMessage(response.data.message);
    } catch (err) {
      // Even on error, we show the generic message to prevent enumeration
      const genericMessage = "If an account with that email exists, a password reset link has been sent.";
      setMessage(genericMessage);
      showSuccess(genericMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot Your Password?">
      <p className="auth-subtitle">
        No problem. Enter your email address below and we'll send you a link to reset it.
      </p>
      <form className="auth-form" onSubmit={handleSubmit}>
        {message && (
          <div className="success-message" role="alert">
            {message}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            name="email"
            className="form-input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading || !!message}
            required
          />
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={loading || !!message || !email.trim()}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <div className="auth-footer">
          <p>
            Remembered your password?{" "}
            <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}