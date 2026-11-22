import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const LabelingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedTaskId = searchParams.get('task_id');

  const [currentTask, setCurrentTask] = useState(null);
  const [selectedLabelId, setSelectedLabelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [allDone, setAllDone] = useState(false);

  // Collapsible instructions drawer (default open for guidance)
  const [showInstructions, setShowInstructions] = useState(true);

  // Store task and labels in refs for vanilla JS event listener access
  const taskRef = useRef(null);
  const selectedLabelIdRef = useRef(null);
  const availableLabelsRef = useRef([]);

  // Keep refs synchronized with state
  useEffect(() => {
    taskRef.current = currentTask;
  }, [currentTask]);

  useEffect(() => {
    selectedLabelIdRef.current = selectedLabelId;
  }, [selectedLabelId]);

  // 1. Load active task: either from query param or find next available pending/in-progress task
  const loadTask = useCallback(async (taskId) => {
    try {
      setLoading(true);
      setAllDone(false);

      let targetId = taskId;
      if (!targetId) {
        // Query next pending or in_progress task from user's queue
        const queueRes = await api.get('/tasks/my?status=PENDING&limit=1');
        if (queueRes.data.items.length > 0) {
          targetId = queueRes.data.items[0].id;
        } else {
          // Fallback to in-progress or rejected
          const reworkRes = await api.get('/tasks/my?status=REJECTED&limit=1');
          if (reworkRes.data.items.length > 0) {
            targetId = reworkRes.data.items[0].id;
          } else {
            const inProgRes = await api.get('/tasks/my?status=IN_PROGRESS&limit=1');
            if (inProgRes.data.items.length > 0) {
              targetId = inProgRes.data.items[0].id;
            } else {
              setAllDone(true);
              setLoading(false);
              return;
            }
          }
        }
      }

      const res = await api.get(`/tasks/${targetId}`);
      const taskData = res.data;
      setCurrentTask(taskData);
      availableLabelsRef.current = taskData.available_labels || [];

      // Pre-select current label if already annotated
      if (taskData.annotation) {
        setSelectedLabelId(taskData.annotation.label_id);
      } else {
        setSelectedLabelId(null);
      }

      setSearchParams({ task_id: targetId }, { replace: true });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to load task.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    loadTask(requestedTaskId);
  }, [requestedTaskId, loadTask]);

  // 2. Submit annotation
  const handleSubmitAnnotation = useCallback(async () => {
    const task = taskRef.current;
    const labelId = selectedLabelIdRef.current;

    if (!task) return;
    if (!labelId) {
      setToast({ message: 'Please select a label (press keys 1–9 or click below).', type: 'warning' });
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/tasks/${task.id}/annotate`, { label_id: labelId });
      setToast({ message: 'Annotation submitted! Advancing to next task...', type: 'success' });

      // Automatically advance to the next task in the queue
      loadTask(null);
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to submit annotation.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [loadTask]);

  // 3. Vanilla JS Keyboard Shortcut Event Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keystrokes when typing inside inputs or textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      // Keys 1 through 9
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 9) {
        const labels = availableLabelsRef.current;
        const targetLabel = labels[keyNum - 1];
        if (targetLabel) {
          e.preventDefault();
          setSelectedLabelId(targetLabel.id);
        }
      }

      // Enter key to submit
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitAnnotation();
      }

      // 'S' key to skip
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        loadTask(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmitAnnotation, loadTask]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0' }}>
        <LoadingSpinner size="48px" />
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="main-content">
        <div className="container" style={{ maxWidth: '640px', textAlign: 'center', paddingTop: '3rem' }}>
          <div className="card" style={{ padding: '3.5rem 2rem' }}>
            <span style={{ fontSize: '3.5rem', marginBottom: '1rem', display: 'block' }}>🎉</span>
            <h2>Queue Complete!</h2>
            <p style={{ margin: '1rem 0 2rem 0' }}>
              You have completed all pending tasks assigned to you. Reviewers will verify your annotations.
            </p>
            <Link to="/tasks" className="btn btn-primary">
              Return to My Tasks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isRejected = currentTask?.status === 'REJECTED';
  const reviewerComment = currentTask?.latest_review?.comment;

  return (
    <div className="main-content workbench-layout">
      <div className="container workbench-container">
        {/* Top Navigation & Controls */}
        <div className="workbench-topbar">
          <Link to="/tasks" className="btn btn-secondary btn-sm">
            ← Back to Tasks
          </Link>

          <div className="workbench-meta">
            <span className="task-id-badge">
              {currentTask?.project_name ? `${currentTask.project_name} • ` : ''}Task #{currentTask?.id}
            </span>
            <span className={`badge badge-${currentTask?.status.toLowerCase()}`}>
              {currentTask?.status.replace('_', ' ')}
            </span>
          </div>

          <div className="workbench-controls-right">
            <button 
              type="button" 
              onClick={() => setShowInstructions(prev => !prev)}
              className="btn btn-secondary btn-sm instructions-toggle-btn"
            >
              <span>{showInstructions ? '📖 Hide Instructions' : '📋 View Instructions'}</span>
            </button>
            <div className="workbench-shortcuts-pill">
              <span>Keys <kbd>1</kbd>–<kbd>9</kbd> select • <kbd>Enter</kbd> submits</span>
            </div>
          </div>
        </div>

        {/* Detailed Annotator Task Instructions & Guidelines Drawer */}
        {showInstructions && (
          <div className="card instructions-card">
            <div className="instructions-header">
              <div className="instructions-title-box">
                <span className="guide-icon">📋</span>
                <div>
                  <h4>Task Guidelines & Classification Criteria</h4>
                  <p className="project-guide-desc">
                    {currentTask?.project_description || 'Categorize customer feedback into Positive, Negative, or Neutral sentiment according to the project quality benchmark.'}
                  </p>
                </div>
              </div>
              <button 
                className="instructions-close-btn"
                onClick={() => setShowInstructions(false)}
                title="Collapse instructions"
              >
                ✕
              </button>
            </div>

            <div className="guidelines-columns">
              <div className="guideline-col col-positive">
                <div className="guide-col-header">
                  <span className="dot" style={{ backgroundColor: '#10B981' }}></span>
                  <strong>Positive Criteria</strong>
                </div>
                <ul>
                  <li>Customer expresses satisfaction, delight, or praises quality.</li>
                  <li>Highlights speed, exceptional battery, durability, or great support.</li>
                  <li>Recommends product to colleagues or awards high ratings.</li>
                  <li className="example-text"><em>"Battery life is exceptional, lasting well over two full days."</em></li>
                </ul>
              </div>

              <div className="guideline-col col-negative">
                <div className="guide-col-header">
                  <span className="dot" style={{ backgroundColor: '#EF4444' }}></span>
                  <strong>Negative Criteria</strong>
                </div>
                <ul>
                  <li>Customer reports hardware defect, overheating, crashes, or damage.</li>
                  <li>Complains of slow shipping, unhelpful support, or unreasonable fees.</li>
                  <li><strong>Watch for Sarcasm:</strong> "Great job breaking my workflow" is <strong>Negative</strong>.</li>
                  <li className="example-text"><em>"The device overheats within twenty minutes of basic video streaming."</em></li>
                </ul>
              </div>

              <div className="guideline-col col-neutral">
                <div className="guide-col-header">
                  <span className="dot" style={{ backgroundColor: '#6B7280' }}></span>
                  <strong>Neutral Criteria</strong>
                </div>
                <ul>
                  <li>Factual, objective product specifications or dimensions.</li>
                  <li>Standard unboxing or arrival observations with neither praise nor complaint.</li>
                  <li>Inquiries, setup notes, or utilitarian descriptions.</li>
                  <li className="example-text"><em>"Device weighs roughly 1.5 kilograms, on par with similar notebooks."</em></li>
                </ul>
              </div>
            </div>

            <div className="instructions-footer-shortcuts">
              <span>⌨️ <strong>Quick Shortcuts:</strong> Keys <code>1</code>–<code>9</code> select label • <code>Enter</code> submits & auto-advances • <code>S</code> skips task</span>
            </div>
          </div>
        )}

        {/* Rejection Alert Banner if previously rejected */}
        {isRejected && reviewerComment && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <strong>Reviewer Correction Feedback:</strong>
              <p style={{ color: 'inherit', marginTop: '0.25rem' }}>{reviewerComment}</p>
            </div>
          </div>
        )}

        {/* Main Text Content Card */}
        <div className="card text-workbench-card">
          <div className="text-card-header">
            <span className="text-field-label">RAW TEXT CONTENT TO LABEL</span>
          </div>
          <div className="text-content-display">
            {currentTask?.item.content}
          </div>
        </div>

        {/* Label Selection Palette */}
        <div className="labels-palette-section">
          <span className="palette-label">SELECT CATEGORICAL LABEL</span>
          <div className="labels-buttons-grid">
            {currentTask?.available_labels.map((lbl, idx) => {
              const isSelected = selectedLabelId === lbl.id;
              const shortcutNumber = idx + 1;

              return (
                <button
                  key={lbl.id}
                  type="button"
                  onClick={() => setSelectedLabelId(lbl.id)}
                  className={`label-pick-btn ${isSelected ? 'selected' : ''}`}
                  style={{
                    borderColor: isSelected ? lbl.color : 'var(--color-border)',
                    backgroundColor: isSelected ? `${lbl.color}20` : 'var(--color-surface)',
                    color: isSelected ? lbl.color : 'var(--color-text-main)',
                  }}
                  aria-pressed={isSelected}
                >
                  <span className="label-key-badge">{shortcutNumber}</span>
                  <span className="label-color-swatch" style={{ backgroundColor: lbl.color }}></span>
                  <span className="label-text-name">{lbl.name}</span>
                  {isSelected && <span className="checkmark">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit & Navigation Footer */}
        <div className="workbench-footer">
          <button 
            type="button" 
            onClick={() => loadTask(null)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Skip for Now (S)
          </button>

          <button
            type="button"
            onClick={handleSubmitAnnotation}
            disabled={submitting || !selectedLabelId}
            className="btn btn-primary btn-lg"
            style={{ minWidth: '220px' }}
          >
            {submitting ? 'Submitting...' : 'Submit & Next (Enter) →'}
          </button>
        </div>
      </div>

      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'info' })} 
      />

      <style>{`
        .workbench-layout {
          min-height: calc(100vh - 64px);
          background-color: var(--color-bg);
          transition: background-color var(--transition-normal);
        }
        .workbench-container {
          max-width: 900px;
        }
        .workbench-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-4);
          flex-wrap: wrap;
          gap: var(--space-3);
        }
        .workbench-meta {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .task-id-badge {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--color-text-muted);
          font-weight: 600;
        }
        .workbench-controls-right {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .instructions-toggle-btn {
          font-size: 0.8rem;
          padding: 0.35rem 0.75rem;
        }
        .workbench-shortcuts-pill {
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          padding: 0.3rem 0.85rem;
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .instructions-card {
          margin-bottom: var(--space-6);
          padding: var(--space-6);
          border-left: 4px solid var(--color-primary);
          background-color: var(--color-surface);
          border-radius: var(--radius-lg);
          animation: slideUp 200ms ease-out;
        }
        .instructions-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: var(--space-4);
        }
        .instructions-title-box {
          display: flex;
          gap: var(--space-3);
        }
        .guide-icon {
          font-size: 1.5rem;
        }
        .instructions-title-box h4 {
          font-size: 1.05rem;
          margin-bottom: 2px;
        }
        .project-guide-desc {
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }
        .instructions-close-btn {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          font-size: 1rem;
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
        }
        .instructions-close-btn:hover {
          background-color: var(--color-surface-hover);
          color: var(--color-text-main);
        }
        .guidelines-columns {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }
        .guideline-col {
          padding: var(--space-4);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          font-size: 0.82rem;
          background-color: var(--color-surface-hover);
        }
        .col-positive { border-top: 3px solid #10b981; }
        .col-negative { border-top: 3px solid #ef4444; }
        .col-neutral  { border-top: 3px solid #6b7280; }
        .guide-col-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: var(--space-2);
          font-size: 0.85rem;
        }
        .guideline-col ul {
          padding-left: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          color: var(--color-text-muted);
        }
        .example-text {
          font-style: italic;
          color: var(--color-text-main);
          margin-top: 0.35rem;
          display: block;
        }
        .instructions-footer-shortcuts {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          padding-top: var(--space-3);
          border-top: 1px solid var(--color-border);
        }
        .text-workbench-card {
          margin-bottom: var(--space-6);
          padding: var(--space-8);
          border-radius: var(--radius-xl);
          background-color: var(--color-surface);
        }
        .text-card-header {
          margin-bottom: var(--space-4);
        }
        .text-field-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-light);
          letter-spacing: 0.06em;
        }
        .text-content-display {
          font-size: 1.25rem;
          font-weight: 500;
          line-height: 1.6;
          color: var(--color-text-main);
          min-height: 100px;
        }
        .labels-palette-section {
          margin-bottom: var(--space-8);
        }
        .palette-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-light);
          letter-spacing: 0.06em;
          margin-bottom: var(--space-3);
        }
        .labels-buttons-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
        }
        .label-pick-btn {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          border-radius: var(--radius-lg);
          border: 2px solid;
          cursor: pointer;
          font-family: inherit;
          font-size: 1rem;
          font-weight: 600;
          transition: all var(--transition-fast);
          user-select: none;
        }
        .label-pick-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }
        .label-key-badge {
          background-color: var(--color-border);
          color: var(--color-text-main);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }
        .label-color-swatch {
          width: 14px;
          height: 14px;
          border-radius: 50%;
        }
        .label-text-name {
          flex: 1;
          text-align: left;
        }
        .checkmark {
          font-weight: bold;
          font-size: 1.1rem;
        }
        .workbench-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: var(--space-4);
          border-top: 1px solid var(--color-border);
        }
        @media (max-width: 768px) {
          .guidelines-columns {
            grid-template-columns: 1fr;
          }
          .workbench-topbar {
            flex-direction: column;
            align-items: flex-start;
          }
          .workbench-controls-right {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};

export default LabelingPage;
