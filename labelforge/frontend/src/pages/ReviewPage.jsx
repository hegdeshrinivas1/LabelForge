import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const ReviewPage = () => {
  const [queue, setQueue] = useState([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [showQAGuidelines, setShowQAGuidelines] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const commentInputRef = useRef(null);

  // 1. Fetch submitted tasks queue
  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/reviews/queue?page=1&limit=50');
      setQueue(res.data.items);
      setTotalCount(res.data.total);
      setCurrentTaskIndex(0);
      setRejecting(false);
      setRejectComment('');
    } catch (err) {
      setToast({ message: 'Failed to load review queue.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const currentTask = queue[currentTaskIndex];

  // 2. Submit Review Decision (APPROVED or REJECTED)
  const handleReview = useCallback(async (decision) => {
    if (!currentTask) return;

    if (decision === 'REJECTED') {
      if (!rejectComment.trim()) {
        setToast({ message: 'A comment is required when rejecting an annotation.', type: 'error' });
        return;
      }
    }

    try {
      setSubmitting(true);
      await api.post(`/tasks/${currentTask.id}/review`, {
        decision,
        comment: decision === 'REJECTED' ? rejectComment.trim() : null
      });

      setToast({
        message: decision === 'APPROVED' ? 'Task Approved! Loading next...' : 'Task Rejected with feedback. Loading next...',
        type: decision === 'APPROVED' ? 'success' : 'info'
      });

      // Remove current task from local queue and advance
      const updatedQueue = queue.filter((_, idx) => idx !== currentTaskIndex);
      setQueue(updatedQueue);
      setTotalCount(prev => Math.max(0, prev - 1));
      setRejecting(false);
      setRejectComment('');

      if (updatedQueue.length === 0) {
        fetchQueue();
      }
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Review submission failed.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [currentTask, rejectComment, queue, currentTaskIndex, fetchQueue]);

  // 3. Reviewer Keyboard Shortcuts: 'A' to Approve, 'R' to Reject
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing inside comment textarea
      if (['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName)) {
        if (e.key === 'Escape' && rejecting) {
          setRejecting(false);
        }
        return;
      }

      if (e.key.toLowerCase() === 'a' && !rejecting) {
        e.preventDefault();
        handleReview('APPROVED');
      }

      if (e.key.toLowerCase() === 'r' && !rejecting) {
        e.preventDefault();
        setRejecting(true);
        setTimeout(() => commentInputRef.current?.focus(), 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReview, rejecting]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0' }}>
        <LoadingSpinner size="48px" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="main-content">
        <div className="container" style={{ maxWidth: '600px', textAlign: 'center', paddingTop: '4rem' }}>
          <div className="card" style={{ padding: '3.5rem 2rem' }}>
            <span style={{ fontSize: '3.5rem', marginBottom: '1rem', display: 'block' }}>✨</span>
            <h2>Review Queue Clear!</h2>
            <p style={{ margin: '1rem 0 2rem 0' }}>
              There are no tasks currently awaiting review. Great work maintaining dataset quality!
            </p>
            <button onClick={fetchQueue} className="btn btn-secondary">
              Refresh Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="container review-container">
        {/* Header Bar */}
        <div className="review-header">
          <div>
            <h1>Quality Assurance Queue</h1>
            <p>Verify that applied labels adhere to project classification guidelines.</p>
          </div>
          <div className="review-header-actions">
            <button 
              type="button" 
              onClick={() => setShowQAGuidelines(prev => !prev)}
              className="btn btn-secondary btn-sm"
            >
              <span>{showQAGuidelines ? '🎯 Hide QA Rubric' : '🎯 View QA Rubric'}</span>
            </button>
            <span className="badge badge-submitted">
              {totalCount} task{totalCount === 1 ? '' : 's'} waiting
            </span>
          </div>
        </div>

        {/* Detailed Reviewer QA Instructions & Rubric Drawer */}
        {showQAGuidelines && (
          <div className="card qa-guidelines-card">
            <div className="qa-guidelines-header">
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem' }}>🎯</span>
                <div>
                  <h4>QA Review Standards & Decision Rubric</h4>
                  <p className="qa-project-desc">
                    {currentTask.project_description || 'Benchmark customer sentiment classification: ensure ground truth quality for downstream model training.'}
                  </p>
                </div>
              </div>
              <button 
                className="instructions-close-btn"
                onClick={() => setShowQAGuidelines(false)}
                title="Collapse QA standards"
              >
                ✕
              </button>
            </div>

            <div className="qa-rubric-grid">
              <div className="rubric-box rubric-approve">
                <div className="rubric-title">
                  <span>✓</span>
                  <strong>When to Approve</strong>
                </div>
                <ul>
                  <li>Label accurately captures the primary sentiment intent of the text.</li>
                  <li>Nuanced constructive complaints are not mislabeled as praise.</li>
                  <li>Technical specs without sentiment are correctly tagged Neutral.</li>
                  <li className="shortcut-tip">Press <kbd>A</kbd> to approve immediately.</li>
                </ul>
              </div>

              <div className="rubric-box rubric-reject">
                <div className="rubric-title">
                  <span>✕</span>
                  <strong>When to Reject (Feedback Required)</strong>
                </div>
                <ul>
                  <li>Clear mismatch between text content and selected categorical label.</li>
                  <li><strong>Sarcasm Missed:</strong> Irony or sarcastic compliments labeled Positive.</li>
                  <li><strong>Constructive Feedback Mandatory:</strong> Specify the error and the correct label.</li>
                  <li className="shortcut-tip">Press <kbd>R</kbd> to reject and open feedback box.</li>
                </ul>
              </div>
            </div>

            <div className="conflict-rule-banner">
              <span>🛡️ <strong>Zero Self-Review Bias Policy:</strong> Reviewers cannot review tasks they annotated themselves. The platform automatically blocks self-approvals.</span>
            </div>
          </div>
        )}

        {/* Task Detail Card */}
        <div className="card review-card">
          <div className="review-card-meta">
            <div>
              <span className="project-title">{currentTask.project_name || 'Project'}</span>
              <span className="task-identifier">Task #{currentTask.id}</span>
            </div>
            <div className="annotator-badge">
              <span>Submitted: {new Date(currentTask.submitted_at || currentTask.updated_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Text Sample */}
          <div className="review-text-content">
            {currentTask.content}
          </div>

          {/* Applied Label Card */}
          <div className="applied-label-box">
            <span className="field-title">APPLIED ANNOTATION:</span>
            {currentTask.label ? (
              <div 
                className="label-pill-large"
                style={{ 
                  borderColor: currentTask.label.color,
                  backgroundColor: `${currentTask.label.color}20`,
                  color: currentTask.label.color
                }}
              >
                <span className="dot" style={{ backgroundColor: currentTask.label.color }}></span>
                <strong>{currentTask.label.name}</strong>
              </div>
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>No label</span>
            )}
          </div>

          {/* Rejection Comment Input Box (revealed when Reject is clicked) */}
          {rejecting && (
            <div className="reject-comment-section">
              <label className="form-label">
                Feedback Comment for Annotator <span style={{ color: 'var(--color-danger)' }}>* (Required)</span>
              </label>
              <textarea
                ref={commentInputRef}
                className="form-textarea"
                rows={3}
                placeholder="Explain why this label is incorrect (e.g. 'Context expresses dissatisfaction with overheating, label should be Negative.')"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                autoFocus
              />
              <div className="reject-actions">
                <button 
                  type="button" 
                  onClick={() => setRejecting(false)} 
                  className="btn btn-secondary btn-sm"
                >
                  Cancel (Esc)
                </button>
                <button 
                  type="button" 
                  onClick={() => handleReview('REJECTED')}
                  disabled={submitting || !rejectComment.trim()}
                  className="btn btn-danger btn-sm"
                >
                  Confirm Rejection & Send Feedback
                </button>
              </div>
            </div>
          )}

          {/* Review Decision Actions */}
          {!rejecting && (
            <div className="review-action-footer">
              <button
                type="button"
                onClick={() => {
                  setRejecting(true);
                  setTimeout(() => commentInputRef.current?.focus(), 50);
                }}
                disabled={submitting}
                className="btn btn-outline-danger btn-lg"
              >
                ✕ Reject (R)
              </button>

              <button
                type="button"
                onClick={() => handleReview('APPROVED')}
                disabled={submitting}
                className="btn btn-success btn-lg"
              >
                ✓ Approve Annotation (A)
              </button>
            </div>
          )}
        </div>
      </div>

      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'info' })} 
      />

      <style>{`
        .review-container {
          max-width: 900px;
        }
        .review-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }
        .review-header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .qa-guidelines-card {
          margin-bottom: var(--space-6);
          padding: var(--space-6);
          border-left: 4px solid var(--color-warning);
          background-color: var(--color-surface);
          border-radius: var(--radius-lg);
          animation: slideUp 200ms ease-out;
        }
        .qa-guidelines-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: var(--space-4);
        }
        .qa-project-desc {
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
        .qa-rubric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }
        .rubric-box {
          padding: var(--space-4);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          font-size: 0.82rem;
          background-color: var(--color-surface-hover);
        }
        .rubric-approve { border-top: 3px solid var(--color-success); }
        .rubric-reject  { border-top: 3px solid var(--color-danger); }
        .rubric-title {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: var(--space-2);
          font-size: 0.9rem;
        }
        .rubric-box ul {
          padding-left: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          color: var(--color-text-muted);
        }
        .shortcut-tip {
          list-style: none;
          margin-left: -1.15rem;
          margin-top: 0.5rem;
          color: var(--color-text-main);
          font-size: 0.8rem;
          font-weight: 600;
        }
        .conflict-rule-banner {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          padding-top: var(--space-3);
          border-top: 1px solid var(--color-border);
        }
        .review-card {
          padding: var(--space-8);
          border-radius: var(--radius-xl);
          background-color: var(--color-surface);
        }
        .review-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-6);
        }
        .project-title {
          font-weight: 700;
          color: var(--color-primary);
          font-size: 0.8rem;
          text-transform: uppercase;
          margin-right: var(--space-3);
        }
        .task-identifier {
          font-family: var(--font-mono);
          color: var(--color-text-light);
          font-size: 0.85rem;
        }
        .annotator-badge {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
        .review-text-content {
          font-size: 1.25rem;
          font-weight: 500;
          line-height: 1.6;
          color: var(--color-text-main);
          background-color: var(--color-surface-hover);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          margin-bottom: var(--space-6);
        }
        .applied-label-box {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }
        .field-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-light);
          letter-spacing: 0.05em;
        }
        .label-pill-large {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: 0.45rem 1rem;
          border: 2px solid;
          border-radius: var(--radius-full);
          font-size: 1rem;
          font-weight: 700;
        }
        .label-pill-large .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .reject-comment-section {
          background-color: var(--color-danger-light);
          border: 1px solid var(--color-danger-border);
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          margin-top: var(--space-4);
        }
        .reject-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
          margin-top: var(--space-3);
        }
        .review-action-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: var(--space-6);
          border-top: 1px solid var(--color-border);
        }
      `}</style>
    </div>
  );
};

export default ReviewPage;
