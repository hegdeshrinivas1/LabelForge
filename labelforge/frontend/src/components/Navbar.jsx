import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, isAnnotator, isReviewer, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Dark / Black Theme Switcher State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('labelforge_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('labelforge_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-wrapper">
      <div className="container navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo" aria-label="LabelForge Home">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="brand-name">LabelForge</span>
        </Link>

        {/* Dynamic Navigation Links based on Auth & Role */}
        <nav className="nav-links">
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <>
                  <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
                    Dashboard
                  </Link>
                  <Link to="/projects" className={`nav-link ${isActive('/projects') ? 'active' : ''}`}>
                    Projects
                  </Link>
                </>
              )}

              {isAnnotator && (
                <>
                  <Link to="/tasks" className={`nav-link ${isActive('/tasks') ? 'active' : ''}`}>
                    My Tasks
                  </Link>
                  <Link to="/labeling" className={`nav-link ${isActive('/labeling') ? 'active' : ''}`}>
                    Label Workbench
                  </Link>
                </>
              )}

              {isReviewer && (
                <Link to="/reviews" className={`nav-link ${isActive('/reviews') ? 'active' : ''}`}>
                  Review Queue
                </Link>
              )}
            </>
          ) : (
            <>
              <a href="#features" className="nav-link">Features</a>
              <a href="#workflow" className="nav-link">Workflow</a>
            </>
          )}
        </nav>

        {/* Auth Actions & Dark Theme Toggle */}
        <div className="nav-actions">
          {/* Theme Toggle Button */}
          <button 
            type="button" 
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'light' ? 'Dark / Black' : 'Light'} theme`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <>
                <span className="theme-icon">🌙</span>
                <span className="theme-text">Dark</span>
              </>
            ) : (
              <>
                <span className="theme-icon">☀️</span>
                <span className="theme-text">Light</span>
              </>
            )}
          </button>

          {isAuthenticated ? (
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">{user?.name}</span>
                <span className={`badge badge-role-${user?.role}`}>{user?.role}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm" aria-label="Sign out">
                Sign out
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-secondary btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .navbar-wrapper {
          background-color: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          z-index: 500;
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
        }
        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          text-decoration: none;
        }
        .brand-icon {
          width: 32px;
          height: 32px;
          background-color: var(--color-primary);
          color: white;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-icon svg {
          width: 20px;
          height: 20px;
        }
        .brand-name {
          font-weight: 800;
          font-size: 1.25rem;
          color: var(--color-text-main);
          letter-spacing: -0.02em;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: var(--space-6);
        }
        .nav-link {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-text-muted);
          transition: color var(--transition-fast);
          padding: 0.4rem 0.2rem;
          border-bottom: 2px solid transparent;
        }
        .nav-link:hover, .nav-link.active {
          color: var(--color-primary);
        }
        .nav-link.active {
          border-bottom-color: var(--color-primary);
          font-weight: 600;
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .theme-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: var(--color-surface-hover);
          color: var(--color-text-main);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .theme-toggle-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
        .theme-icon {
          font-size: 0.9rem;
        }
        .user-profile {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }
        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-main);
        }
        .auth-buttons {
          display: flex;
          gap: var(--space-2);
        }
        @media (max-width: 640px) {
          .nav-links { display: none; }
          .user-info { display: none; }
          .theme-text { display: none; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
