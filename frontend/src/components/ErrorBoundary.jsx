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
    backgroundColor: '#f5f5f5',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    padding: '40px',
    maxWidth: '500px',
    textAlign: 'center'
  },
  title: {
    color: '#d32f2f',
    marginBottom: '16px',
    fontSize: '24px'
  },
  message: {
    color: '#666',
    marginBottom: '24px',
    fontSize: '16px',
    lineHeight: '1.5'
  },
  details: {
    textAlign: 'left',
    marginBottom: '24px',
    backgroundColor: '#f9f9f9',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #e0e0e0'
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: '8px'
  },
  pre: {
    backgroundColor: '#f5f5f5',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '12px',
    color: '#333'
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
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#1976d2',
    color: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  secondaryButton: {
    backgroundColor: '#6c757d'
  },
  errorCount: {
    fontSize: '12px',
    color: '#999',
    marginTop: '16px'
  },
  warning: {
    color: '#d32f2f',
    fontWeight: 'bold'
  }
};

export default ErrorBoundary;
