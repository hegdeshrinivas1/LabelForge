import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const MyTasksPage = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const fetchTasks = async (filterStatus = statusFilter, targetPage = page) => {
    try {
      setLoading(true);
      let url = `/tasks/my?page=${targetPage}&limit=15`;
      if (filterStatus) {
        url += `&status=${filterStatus}`;
      }
      const res = await api.get(url);
      setTasks(res.data.items);
      setTotalPages(res.data.total_pages);
      setTotalCount(res.data.total);
    } catch (err) {
      setToast({ message: 'Failed to load tasks.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(statusFilter, page);
  }, [statusFilter, page]);

  const handleTabChange = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  // Quick action: start next pending or in_progress task
  const handleStartNextTask = () => {
    const nextTask = tasks.find(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'REJECTED');
    if (nextTask) {
      navigate(`/labeling?task_id=${nextTask.id}`);
    } else {
      navigate('/labeling');
    }
  };

  return (
    <div className="main-content">
      <div className="container">
        {/* Header */}
        <div className="tasks-page-header">
          <div>
            <h1>My Annotation Tasks</h1>
            <p>Work through your assigned tasks, apply category labels, and fix any reviewer feedback.</p>
          </div>
          <button onClick={handleStartNextTask} className="btn btn-primary">
            ⚡ Start Labeling Workbench
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="tabs">
          <button 
            className={`tab-btn ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => handleTabChange('')}
          >
            All Tasks ({totalCount})
          </button>
          <button 
            className={`tab-btn ${statusFilter === 'PENDING' ? 'active' : ''}`}
            onClick={() => handleTabChange('PENDING')}
          >
            ⏳ Pending
          </button>
          <button 
            className={`tab-btn ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => handleTabChange('IN_PROGRESS')}
          >
            🔄 In Progress
          </button>
          <button 
            className={`tab-btn ${statusFilter === 'REJECTED' ? 'active' : ''}`}
            onClick={() => handleTabChange('REJECTED')}
          >
            ⚠️ Needs Correction
          </button>
          <button 
            className={`tab-btn ${statusFilter === 'SUBMITTED' ? 'active' : ''}`}
            onClick={() => handleTabChange('SUBMITTED')}
          >
            📬 Submitted
          </button>
          <button 
            className={`tab-btn ${statusFilter === 'APPROVED' ? 'active' : ''}`}
            onClick={() => handleTabChange('APPROVED')}
          >
            ✅ Approved
          </button>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <LoadingSpinner size="44px" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="card empty-state">
            <span style={{ fontSize: '2.5rem' }}>🎉</span>
            <h3>No tasks found in this queue</h3>
            <p>You have no tasks matching the selected filter.</p>
          </div>
        ) : (
          <div className="tasks-list">
            {tasks.map((task) => (
              <div key={task.id} className="card task-row-card">
                <div className="task-row-content">
                  <div className="task-meta-top">
                    <span className="task-project-tag">{task.project_name || 'Project'}</span>
                    <span className="task-id">Task #{task.id}</span>
                    <span className={`badge badge-${task.status.toLowerCase()}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    {task.label && (
                      <span 
                        className="badge" 
                        style={{ 
                          backgroundColor: `${task.label.color}18`, 
                          color: task.label.color,
                          border: `1px solid ${task.label.color}40`
                        }}
                      >
                        🏷️ {task.label.name}
                      </span>
                    )}
                  </div>

                  <p className="task-text-preview">{task.content}</p>

                  {/* Rejection comment banner */}
                  {task.status === 'REJECTED' && task.latest_review_comment && (
                    <div className="alert alert-danger" style={{ margin: '0.75rem 0 0 0', padding: '0.5rem 0.75rem' }}>
                      <span style={{ fontWeight: 'bold' }}>Reviewer Feedback:</span> {task.latest_review_comment}
                    </div>
                  )}
                </div>

                <div className="task-action-col">
                  {task.status !== 'APPROVED' ? (
                    <Link to={`/labeling?task_id=${task.id}`} className="btn btn-primary btn-sm">
                      {task.status === 'REJECTED' ? 'Fix Label →' : 'Label Task →'}
                    </Link>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
                      ✓ Completed
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-bar">
                <button 
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="btn btn-secondary btn-sm"
                >
                  ← Previous
                </button>
                <span className="pagination-text">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total)
                </span>
                <button 
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="btn btn-secondary btn-sm"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'info' })} 
      />

      <style>{`
        .tasks-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }
        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .task-row-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-5);
          gap: var(--space-6);
          transition: border-color var(--transition-fast);
        }
        .task-row-card:hover {
          border-color: var(--color-primary-border);
        }
        .task-row-content {
          flex: 1;
        }
        .task-meta-top {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-2);
          flex-wrap: wrap;
        }
        .task-project-tag {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-primary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .task-id {
          font-size: 0.75rem;
          color: var(--color-text-light);
          font-family: var(--font-mono);
        }
        .task-text-preview {
          font-size: 0.95rem;
          color: var(--color-text-main);
          font-weight: 500;
          line-height: 1.45;
        }
        .task-action-col {
          display: flex;
          align-items: center;
        }
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-4);
          margin-top: var(--space-8);
        }
        .pagination-text {
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
};

export default MyTasksPage;
