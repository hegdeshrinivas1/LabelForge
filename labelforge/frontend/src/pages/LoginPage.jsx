import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectByRole = (role) => {
    const from = location.state?.from?.pathname;
    if (from && from !== '/login') {
      navigate(from, { replace: true });
      return;
    }
    if (role === 'admin') navigate('/dashboard', { replace: true });
    else if (role === 'reviewer') navigate('/reviews', { replace: true });
    else navigate('/tasks', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      redirectByRole(user.role);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);

    try {
      const user = await login(demoEmail, demoPassword);
      redirectByRole(user.role);
    } catch (err) {
      setError(err.response?.data?.detail || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card-container">
        <div className="auth-header">
          <Link to="/" className="auth-brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span>LabelForge</span>
          </Link>
          <h2>Sign in to your account</h2>
          <p>Access your annotation projects and review queue</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card auth-card">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              className="form-input"
              placeholder="you@labelforge.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>

          {/* Quick Demo Autofill Section */}
          <div className="demo-shortcuts">
            <div className="divider"><span>OR ONE-CLICK DEMO LOGIN</span></div>
            <div className="demo-btn-group">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleDemoLogin('admin@labelforge.com', 'admin123')}
              >
                👑 Demo as Admin
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleDemoLogin('annotator1@labelforge.com', 'annotator123')}
              >
                ✏️ Demo as Annotator
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleDemoLogin('reviewer1@labelforge.com', 'reviewer123')}
              >
                🔍 Demo as Reviewer
              </button>
            </div>
          </div>
        </form>

        <p className="auth-footer-text">
          Don't have an account? <Link to="/register">Register as Contributor</Link>
        </p>
      </div>

      <style>{`
        .auth-page {
          min-height: calc(100vh - 64px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-8) var(--space-4);
          background-color: var(--color-bg);
          transition: background-color var(--transition-normal);
        }
        .auth-card-container {
          width: 100%;
          max-width: 440px;
        }
        .auth-header {
          text-align: center;
          margin-bottom: var(--space-6);
        }
        .auth-brand {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 800;
          font-size: 1.3rem;
          color: var(--color-text-main);
          margin-bottom: var(--space-4);
        }
        .auth-header h2 {
          font-size: 1.5rem;
          margin-bottom: var(--space-1);
        }
        .auth-card {
          padding: var(--space-8);
        }
        .demo-shortcuts {
          margin-top: var(--space-6);
        }
        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin-bottom: var(--space-4);
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--color-border);
        }
        .divider span {
          padding: 0 var(--space-3);
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-text-light);
          letter-spacing: 0.05em;
        }
        .demo-btn-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .demo-btn-group button {
          justify-content: flex-start;
        }
        .auth-footer-text {
          text-align: center;
          margin-top: var(--space-6);
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
