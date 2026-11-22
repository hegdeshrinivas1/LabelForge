import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '480px', textAlign: 'center', padding: '3.5rem 2rem' }}>
        <span style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>🔍</span>
        <h2>404 - Page Not Found</h2>
        <p style={{ margin: '1rem 0 2rem 0' }}>
          The page you requested does not exist or may have been moved.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Safety (Home)
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
