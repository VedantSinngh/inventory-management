import React from 'react';
import { useToast } from '../context/ToastContext';

/**
 * Toast Display Component
 * Renders all active toast notifications with auto-dismiss
 */
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  const getToastStyles = (type) => {
    const baseStyles = {
      padding: '16px',
      marginBottom: '12px',
      borderRadius: '4px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      minWidth: '300px',
      maxWidth: '500px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '14px',
      fontWeight: '500',
      animation: 'slideIn 0.3s ease-in-out'
    };

    const typeStyles = {
      success: {
        backgroundColor: '#4caf50',
        color: 'white',
        borderLeft: '4px solid #388e3c'
      },
      error: {
        backgroundColor: '#f44336',
        color: 'white',
        borderLeft: '4px solid #c62828'
      },
      info: {
        backgroundColor: '#2196f3',
        color: 'white',
        borderLeft: '4px solid #1565c0'
      },
      warning: {
        backgroundColor: '#ff9800',
        color: 'white',
        borderLeft: '4px solid #e65100'
      }
    };

    return { ...baseStyles, ...typeStyles[type] };
  };

  const getIcon = (type) => {
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };
    return icons[type] || 'ℹ';
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `}</style>
      {toasts.map((toast) => (
        <div key={toast.id} style={getToastStyles(toast.type)}>
          <div style={styles.content}>
            <span style={styles.icon}>{getIcon(toast.type)}</span>
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            style={styles.closeButton}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    pointerEvents: 'auto'
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  icon: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '18px',
    marginLeft: '12px',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

export default ToastContainer;
