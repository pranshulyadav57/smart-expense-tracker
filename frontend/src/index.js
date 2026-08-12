import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from './contexts/ThemeContext';
// Add global error handlers so we can capture unhandled errors and rejections
if (typeof window !== 'undefined') {
  window.addEventListener('error', (ev) => {
    // prevent default browser logging duplication
    try {
      // attach to DOM for debugging if available
      console.error('Global error captured:', ev.error || ev.message || ev);
    } catch (e) {
      console.error('Error logging global error', e);
    }
  });

  window.addEventListener('unhandledrejection', (ev) => {
    try {
      console.error('Unhandled promise rejection:', ev.reason);
    } catch (e) {
      console.error('Error logging unhandledrejection', e);
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);