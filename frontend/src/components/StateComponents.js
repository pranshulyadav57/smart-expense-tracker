import React, { memo } from "react";

/* =========================================================
   SHARED STYLES
========================================================= */

const centerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const spinnerContainerStyle = {
  ...centerStyle,
  padding: "40px 20px",
  minHeight: "300px",
};

const spinnerStyle = {
  width: "40px",
  height: "40px",
  border: "4px solid #f3f4f6",
  borderTop: "4px solid #3b82f6",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  marginBottom: "16px",
};

const loadingTextStyle = {
  color: "#6b7280",
  fontSize: "16px",
};

const emptyStateStyle = {
  ...centerStyle,
  padding: "60px 20px",
  minHeight: "400px",
  background: "#f9fafb",
  borderRadius: "8px",
  textAlign: "center",
};

const errorStateStyle = {
  ...centerStyle,
  padding: "40px 20px",
  background: "#fee2e2",
  borderRadius: "8px",
  border: "1px solid #fecaca",
  minHeight: "300px",
};

const retryButtonStyle = {
  padding: "8px 16px",
  background: "#dc2626",
  color: "#ffffff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
};

/* =========================================================
   LOADING SPINNER
========================================================= */

export const LoadingSpinner = memo(function LoadingSpinner({
  message = "Loading...",
}) {
  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      <div
        style={spinnerContainerStyle}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div style={spinnerStyle} />

        <p style={loadingTextStyle}>
          {message}
        </p>
      </div>
    </>
  );
});

/* =========================================================
   EMPTY STATE
========================================================= */

export const EmptyState = memo(function EmptyState({
  icon = "📭",
  title = "No data",
  message = "Nothing to display",
}) {
  return (
    <div style={emptyStateStyle}>
      <div
        style={{
          fontSize: "64px",
          marginBottom: "16px",
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          color: "#1f2937",
          fontSize: "20px",
          marginBottom: "8px",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        {message}
      </p>
    </div>
  );
});

/* =========================================================
   ERROR STATE
========================================================= */

export const ErrorState = memo(function ErrorState({
  message = "An error occurred",
  onRetry = null,
}) {
  return (
    <div
      style={errorStateStyle}
      role="alert"
      aria-live="assertive"
    >
      <div
        style={{
          fontSize: "48px",
          marginBottom: "16px",
        }}
      >
        ⚠️
      </div>

      <p
        style={{
          color: "#991b1b",
          fontSize: "14px",
          marginBottom: "20px",
        }}
      >
        {message}
      </p>

      {typeof onRetry === "function" && (
        <button
          type="button"
          onClick={onRetry}
          style={retryButtonStyle}
        >
          Try Again
        </button>
      )}
    </div>
  );
});