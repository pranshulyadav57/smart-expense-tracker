import { Link } from "react-router-dom";
import "../styles/auth.css";

export default function AuthLayout({ children, title }) {
  return (
    <div className="auth-page">
      <div className="auth-background"></div>
      <div className="auth-overlay"></div>
      
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-logo">Smart Expense Tracker</h1>
            <p className="auth-subtitle">{title}</p>
          </div>
          
          {children}
          
          <div className="auth-footer">
            {title.toLowerCase().includes("login") ? (
              <p>
                Don't have an account?{" "}
                <Link to="/register" className="auth-link">Register</Link>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <Link to="/login" className="auth-link">Login</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}