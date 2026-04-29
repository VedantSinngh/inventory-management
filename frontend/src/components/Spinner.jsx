import React from 'react';

/**
 * Loading Spinner Component
 * Shows loading state with optional text
 */
const Spinner = ({ 
  size = 'medium', 
  text = 'Loading...', 
  fullScreen = false 
}) => {
  const sizeMap = {
    small: { spinner: '24px', dot: '6px' },
    medium: { spinner: '40px', dot: '8px' },
    large: { spinner: '60px', dot: '12px' }
  };

  const config = sizeMap[size];

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    ...(fullScreen && {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 9998
    })
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner-ring {
          border: ${config.dot} solid rgba(0, 0, 0, 0.1);
          border-top: ${config.dot} solid #1976d2;
          border-radius: 50%;
          width: ${config.spinner};
          height: ${config.spinner};
          animation: spin 1s linear infinite;
        }
      `}</style>
      <div className="spinner-ring" />
      {text && (
        <p style={{
          margin: 0,
          fontSize: size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px',
          color: fullScreen ? 'white' : '#666'
        }}>
          {text}
        </p>
      )}
    </div>
  );
};

export default Spinner;
