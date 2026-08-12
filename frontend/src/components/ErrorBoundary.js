import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', margin: '1rem 0', border: '1px dashed #ef4444', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.04)' }}>
          <h4 style={{ color: '#ef4444' }}>⚠️ Something went wrong.</h4>
          <p style={{ color: '#666' }}>This part of the application has encountered an error.</p>

          {/* Show a readable error payload when available */}
          <details style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
            <summary style={{ cursor: 'pointer', color: '#334155' }}>View error details</summary>
            <pre style={{ fontSize: 12, marginTop: 8 }}>
{this.state.error ? (typeof this.state.error === 'string' ? this.state.error : JSON.stringify(this.state.error, Object.getOwnPropertyNames(this.state.error), 2)) : 'No error object available.'}
            </pre>
          </details>

          <div style={{ marginTop: 12 }}>
            <button onClick={() => this.setState({ hasError: false, error: null })} style={{ marginRight: 8 }}>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;