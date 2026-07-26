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
        <div style={{ padding: '20px', margin: '1rem 0', border: '1px dashed #ef4444', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
          <h4 style={{ color: '#ef4444' }}>⚠️ Something went wrong here.</h4>
          <p style={{ color: '#666' }}>This part of the application has encountered an error.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;