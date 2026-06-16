import React from 'react';

/**
 * Error Boundary Component
 * Catches errors in child components and displays a user-friendly error UI
 * Prevents entire app from crashing due to component errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Optional: Send error to logging service (Sentry, DataDog, etc)
    // logErrorToService(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>⚠️ Something went wrong</h1>
            <p style={styles.message}>
              We encountered an unexpected error. Please try again or contact support if the problem persists.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details (Development Only)</summary>
                <pre style={styles.pre}>
                  <code>{this.state.error?.toString()}</code>
                  {this.state.errorInfo && (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <div style={styles.buttonContainer}>
              <button
                onClick={this.resetError}
                style={styles.button}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                Go to Home
              </button>
            </div>

            <p style={styles.errorCount}>
              Error Count: {this.state.errorCount}
              {this.state.errorCount > 3 && (
                <span style={styles.warning}>
                  {' '}(Multiple errors detected - please refresh the page)
                </span>
              )}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0a0a0f',
    padding: '20px',
    fontFamily: 'Inter, -apple-system, sans-serif'
  },
  card: {
    backgroundColor: '#111118',
    borderRadius: '8px',
    border: '1px solid #2a2a3a',
    padding: '40px',
    maxWidth: '500px',
    textAlign: 'center'
  },
  title: {
    color: '#ef4444',
    marginBottom: '16px',
    fontSize: '24px',
    fontWeight: '600'
  },
  message: {
    color: '#8888aa',
    marginBottom: '24px',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  details: {
    textAlign: 'left',
    marginBottom: '24px',
    backgroundColor: '#1a1a24',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #2a2a3a'
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: '8px'
  },
  pre: {
    backgroundColor: '#111118',
    padding: '12px',
    borderRadius: '6px',
    overflow: 'auto',
    fontSize: '12px',
    color: '#f0f0f8'
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '16px'
  },
  button: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#6366f1',
    color: 'white',
    cursor: 'pointer',
    transition: 'filter 150ms ease'
  },
  secondaryButton: {
    backgroundColor: '#1a1a24',
    border: '1px solid #2a2a3a',
    color: '#f0f0f8'
  },
  errorCount: {
    fontSize: '12px',
    color: '#55556a',
    marginTop: '16px'
  },
  warning: {
    color: '#ef4444',
    fontWeight: '600'
  }
};

export default ErrorBoundary;
