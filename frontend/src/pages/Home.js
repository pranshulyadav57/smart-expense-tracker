import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import "../styles/home.css";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
    <div className={`home-page theme-${theme}`}>
      <header className="home-header">
        <div className="brand">
          <div className="brand-mark">SE</div>
          <div className="brand-name">Smart Expense</div>
        </div>
        <nav className="home-nav">
          <button className="nav-btn" onClick={() => navigate('/login')}>Login</button>
          <button className="nav-btn outline" onClick={() => navigate('/register')}>Register</button>
          <ThemeToggle />
        </nav>
      </header>

      <main className="home-hero">
        <section className="hero-left">
          <h1 className="hero-title">
            Manage Your Money Smartly
          </h1>
          <p className="hero-sub">
            Track expenses, set budgets, and take control of your finances. Built for students and small businesses.
          </p>

          <div className="hero-ctas">
            <button className="cta-primary" onClick={() => navigate('/register')}>
              Get Started
            </button>
            <button className="cta-secondary" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>© {new Date().getFullYear()} Smart Expense Tracker. All rights reserved.</p>
      </footer>
    </div>
  );
}