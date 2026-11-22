import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();

  const getWorkspaceLink = () => {
    if (!isAuthenticated) return '/login';
    if (user?.role === 'admin') return '/dashboard';
    if (user?.role === 'reviewer') return '/reviews';
    return '/tasks';
  };

  return (
    <div className="landing-page">
      {/* 1. Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span>⚡ Lightweight, Fast & ML-Ready</span>
            </div>
            <h1 className="hero-title">
              Precision Data Annotation for Machine Learning Teams
            </h1>
            <p className="hero-subtitle">
              LabelForge streamlines the complete dataset curation lifecycle. Ingest raw text,
              distribute tasks in round-robin across annotators, enforce quality assurance reviews,
              and stream clean datasets into your training pipelines.
            </p>
            <div className="hero-actions">
              <Link to={getWorkspaceLink()} className="btn btn-primary btn-lg">
                {isAuthenticated ? 'Open Workspace →' : 'Launch Demo Workspace'}
              </Link>
              <a href="#workflow" className="btn btn-secondary btn-lg">
                Explore Workflow
              </a>
            </div>
            <div className="demo-credentials-hint">
              <span>Demo accounts available: <strong>admin@labelforge.com</strong>, <strong>annotator1@labelforge.com</strong>, <strong>reviewer1@labelforge.com</strong></span>
            </div>
          </div>

          <div className="hero-preview">
            <div className="preview-card">
              <div className="preview-card-header">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
                <span className="preview-title">LabelForge Annotation Workbench</span>
              </div>
              <div className="preview-card-body">
                <div className="preview-sample-box">
                  <p className="preview-text">
                    "The battery life is exceptional, lasting well over two full days of heavy usage."
                  </p>
                  <div className="preview-labels">
                    <span className="sample-label active-label" style={{ borderColor: '#10B981', color: '#10B981' }}>
                      <kbd>1</kbd> Positive
                    </span>
                    <span className="sample-label" style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                      <kbd>2</kbd> Negative
                    </span>
                    <span className="sample-label" style={{ borderColor: '#6B7280', color: '#6B7280' }}>
                      <kbd>3</kbd> Neutral
                    </span>
                  </div>
                </div>
                <div className="preview-footer-status">
                  <span className="badge badge-submitted">Status: Submitted</span>
                  <span className="shortcut-hint">Press <strong>Enter</strong> to Advance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key Features Section */}
      <section id="features" className="section features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Engineered for Quality & Speed</h2>
            <p className="section-subtitle">
              Built from scratch with modern clean architecture, strict database constraints, and zero heavy dependencies.
            </p>
          </div>

          <div className="features-grid">
            <div className="card feature-card">
              <div className="feature-icon" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>👥</div>
              <h3>Role-Based Workflows</h3>
              <p>
                Strict authorization boundaries for Admins, Annotators, and Reviewers. Annotators only see their own tasks, while reviewers ensure zero self-review bias.
              </p>
            </div>

            <div className="card feature-card">
              <div className="feature-icon" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>⌨️</div>
              <h3>Ergonomic Keyboard Labeling</h3>
              <p>
                Label text in milliseconds using numeric keys 1–9 and Enter. Seamless auto-advancement keeps annotators in the flow state without mouse fatigue.
              </p>
            </div>

            <div className="card feature-card">
              <div className="feature-icon" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>🛡️</div>
              <h3>Conflict-Free Review Queue</h3>
              <p>
                Dedicated QA queue with approval and mandatory rejection feedback. Annotators fix and resubmit rejected tasks with clear reviewer comments.
              </p>
            </div>

            <div className="card feature-card">
              <div className="feature-icon" style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>📊</div>
              <h3>Raw SQL Analytics</h3>
              <p>
                Real-time dashboard powered by parameterized raw SQL queries: progress breakdowns, per-annotator accuracy rates, class balance, and 14-day velocity.
              </p>
            </div>

            <div className="card feature-card">
              <div className="feature-icon" style={{ backgroundColor: 'var(--color-info-light)', color: 'var(--color-info)' }}>⚡</div>
              <h3>Batch Ingestion & Deduplication</h3>
              <p>
                Upload CSV or JSON files up to 5,000 rows. The ingestion engine automatically filters empty strings and duplicate text before spawning tasks.
              </p>
            </div>

            <div className="card feature-card">
              <div className="feature-icon" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>📦</div>
              <h3>ML-Ready Dataset Export</h3>
              <p>
                Stream approved data directly in CSV or JSON formats. Strict quality gates guarantee unverified or rejected rows never enter your training dataset.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section id="workflow" className="section workflow-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">The Complete Annotation SDLC</h2>
            <p className="section-subtitle">From raw uncurated text to high-accuracy supervised training datasets in 4 steps.</p>
          </div>

          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="step-number">1</div>
              <h4>Ingest & Deduplicate</h4>
              <p>Admins upload raw CSV/JSON files. Empty rows and duplicates are filtered out in linear time.</p>
            </div>

            <div className="workflow-step">
              <div className="step-number">2</div>
              <h4>Round-Robin Assignment</h4>
              <p>Unassigned tasks are distributed evenly across active annotators with deterministic load balancing.</p>
            </div>

            <div className="workflow-step">
              <div className="step-number">3</div>
              <h4>Label & Validate</h4>
              <p>Annotators apply labels via keyboard shortcuts; reviewers approve or reject with compulsory comments.</p>
            </div>

            <div className="workflow-step">
              <div className="step-number">4</div>
              <h4>Export Clean Datasets</h4>
              <p>Only verified APPROVED annotations are exported for fine-tuning or training LLMs and classifiers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="footer">
        <div className="container footer-container">
          <div className="footer-left">
            <span className="footer-brand">LabelForge</span>
            <p className="footer-desc">A Full-Stack Data Annotation Platform built with React, FastAPI, and SQL.</p>
          </div>
          <div className="footer-links">
            <Link to="/login">Sign In</Link>
            <Link to="/register">Register Contributor</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub Repository</a>
          </div>
        </div>
      </footer>

      <style>{`
        .hero-section {
          padding: var(--space-12) 0;
          background: linear-gradient(180deg, var(--color-bg) 0%, var(--color-surface) 100%);
          border-bottom: 1px solid var(--color-border);
          transition: background var(--transition-normal);
        }
        .hero-container {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: var(--space-10);
          align-items: center;
        }
        .hero-badge {
          display: inline-block;
          background-color: var(--color-primary-light);
          color: var(--color-primary);
          font-size: 0.8rem;
          font-weight: 700;
          padding: 0.35rem 0.85rem;
          border-radius: var(--radius-full);
          margin-bottom: var(--space-4);
          border: 1px solid var(--color-primary-border);
        }
        .hero-title {
          font-size: 2.75rem;
          line-height: 1.15;
          margin-bottom: var(--space-4);
          letter-spacing: -0.03em;
          color: var(--color-text-main);
        }
        .hero-subtitle {
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: var(--space-8);
          color: var(--color-text-muted);
        }
        .hero-actions {
          display: flex;
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }
        .demo-credentials-hint {
          font-size: 0.8rem;
          color: var(--color-text-light);
        }
        .preview-card {
          background-color: var(--color-surface);
          border-radius: var(--radius-xl);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
        }
        .preview-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: var(--space-3) var(--space-4);
          background-color: var(--color-surface-hover);
          border-bottom: 1px solid var(--color-border);
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .dot-red { background-color: #ef4444; }
        .dot-yellow { background-color: #f59e0b; }
        .dot-green { background-color: #10b981; }
        .preview-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-muted);
          margin-left: 0.5rem;
        }
        .preview-card-body {
          padding: var(--space-6);
          background-color: var(--color-surface);
        }
        .preview-sample-box {
          background-color: var(--color-surface-hover);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          margin-bottom: var(--space-4);
        }
        .preview-text {
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--color-text-main);
          margin-bottom: var(--space-6);
          line-height: 1.5;
        }
        .preview-labels {
          display: flex;
          gap: var(--space-3);
        }
        .sample-label {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: 0.4rem 0.8rem;
          border: 2px solid;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 700;
          background-color: var(--color-surface);
        }
        .sample-label kbd {
          background-color: var(--color-surface-hover);
          color: var(--color-text-main);
          padding: 0.1rem 0.35rem;
          border-radius: 3px;
          font-size: 0.75rem;
        }
        .active-label {
          background-color: var(--color-success-light);
        }
        .preview-footer-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
        .section {
          padding: var(--space-12) 0;
        }
        .section-header {
          text-align: center;
          max-width: 650px;
          margin: 0 auto var(--space-10) auto;
        }
        .section-title {
          font-size: 2rem;
          margin-bottom: var(--space-3);
          color: var(--color-text-main);
        }
        .section-subtitle {
          font-size: 1.05rem;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: var(--space-6);
        }
        .feature-card {
          padding: var(--space-6);
        }
        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          margin-bottom: var(--space-4);
        }
        .feature-card h3 {
          margin-bottom: var(--space-2);
          color: var(--color-text-main);
        }
        .workflow-steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-6);
        }
        .workflow-step {
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          position: relative;
        }
        .step-number {
          width: 32px;
          height: 32px;
          background-color: var(--color-primary);
          color: #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          margin-bottom: var(--space-4);
        }
        .workflow-step h4 {
          margin-bottom: var(--space-2);
          color: var(--color-text-main);
        }
        .footer {
          background-color: var(--color-surface);
          color: var(--color-text-muted);
          border-top: 1px solid var(--color-border);
          padding: var(--space-8) 0;
          margin-top: auto;
        }
        .footer-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .footer-brand {
          font-weight: 800;
          font-size: 1.2rem;
          color: var(--color-text-main);
        }
        .footer-desc {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin-top: 4px;
        }
        .footer-links {
          display: flex;
          gap: var(--space-6);
        }
        .footer-links a {
          color: var(--color-text-muted);
          font-size: 0.85rem;
        }
        .footer-links a:hover {
          color: var(--color-primary);
        }
        @media (max-width: 900px) {
          .hero-container {
            grid-template-columns: 1fr;
          }
          .hero-title { font-size: 2.2rem; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
