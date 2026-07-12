import React from 'react';

const Spinner = ({ size = 'medium', text = 'Loading…', fullScreen = false }) => {
  const sizePx = { small: 24, medium: 40, large: 60 };
  const borderPx = { small: 3, medium: 4, large: 5 };
  const px = sizePx[size];
  const bpx = borderPx[size];

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    ...(fullScreen && {
      position: 'fixed',
      top: 0, left: 0,
      width: '100%', height: '100%',
      backgroundColor: 'rgba(245, 245, 245, 0.7)',
      backdropFilter: 'blur(4px)',
      zIndex: 9998
    })
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes el-spin {
          to { transform: rotate(360deg); }
        }
        .el-spinner-ring {
          width: ${px}px;
          height: ${px}px;
          border-radius: 50%;
          border: ${bpx}px solid var(--color-hairline-strong);
          border-top-color: var(--color-ink);
          animation: el-spin 0.8s linear infinite;
        }
      `}</style>
      <div className="el-spinner-ring" />
      {text && (
        <p style={{
          margin: 0,
          fontFamily: 'var(--font-body)',
          fontSize: size === 'small' ? '12px' : '14px',
          color: 'var(--color-muted)',
          letterSpacing: '0.15px'
        }}>
          {text}
        </p>
      )}
    </div>
  );
};

export default Spinner;
