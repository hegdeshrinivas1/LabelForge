import React from 'react';

const LoadingSpinner = ({ size = '36px', color = 'var(--color-primary)' }) => {
  return (
    <div 
      className="loading-spinner"
      style={{
        width: size,
        height: size,
        border: `3px solid var(--color-border)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
        display: 'inline-block'
      }}
      role="status"
      aria-label="Loading"
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
