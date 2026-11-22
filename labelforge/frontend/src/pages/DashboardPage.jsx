import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const DashboardPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdParam = searchParams.get('project_id');

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdParam || '');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // 1. Fetch available projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects?page=1&limit=50');
        setProjects(res.data.items);
        if (res.data.items.length > 0) {
          const initialId = projectIdParam || res.data.items[0].id.toString();
          setSelectedProjectId(initialId);
        }
      } catch (err) {
        setToast({ message: 'Failed to load projects list.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [projectIdParam]);

  // 2. Fetch stats when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const res = await api.get(`/projects/${selectedProjectId}/stats`);
        setStats(res.data);
      } catch (err) {
        setToast({ message: 'Failed to fetch project statistics.', type: 'error' });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [selectedProjectId]);

  // 3. Handle project selection change
  const handleProjectChange = (e) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    setSearchParams({ project_id: newId });
  };

  // 4. Handle Dataset Export
  const handleExport = async (format) => {
    try {
      setExportLoading(true);
      const res = await api.get(`/projects/${selectedProjectId}/export?format=${format}`, {
        responseType: 'blob'
      });
      // Create download link
      const blob = new Blob([res.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `labelforge_project_${selectedProjectId}_approved.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setToast({ message: `Exported ${format.toUpperCase()} dataset successfully!`, type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to export dataset.', type: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0' }}>
        <LoadingSpinner size="48px" />
      </div>
    );
  }

  const selectedProjObj = projects.find(p => p.id.toString() === selectedProjectId);

  return (
    <div className="main-content">
      <div className="container">
        {/* Dashboard Top Header */}
        <div className="dashboard-header">
          <div>
            <h1>Analytics & Dataset Curation</h1>
            <p>Real-time metrics calculated via raw parameterized SQL queries.</p>
          </div>

          {/* Project Selector & Export Toolbar */}
          <div className="dashboard-toolbar">
            <select 
              value={selectedProjectId} 
              onChange={handleProjectChange}
              className="form-select project-dropdown"
              aria-label="Select Project"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <div className="export-buttons">
              <button 
                onClick={() => handleExport('csv')} 
                disabled={exportLoading}
                className="btn btn-secondary btn-sm"
              >
                📥 Export CSV
              </button>
              <button 
                onClick={() => handleExport('json')} 
                disabled={exportLoading}
                className="btn btn-primary btn-sm"
              >
                📥 Export JSON
              </button>
            </div>
          </div>
        </div>

        {statsLoading || !stats ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <LoadingSpinner size="40px" />
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="kpi-grid">
              <div className="card kpi-card">
                <span className="kpi-label">Total Ingested</span>
                <span className="kpi-value">{stats.progress.total_tasks}</span>
                <span className="kpi-meta">Tasks generated</span>
              </div>

              <div className="card kpi-card">
                <span className="kpi-label">Approved (Exportable)</span>
                <span className="kpi-value" style={{ color: 'var(--color-success)' }}>
                  {stats.progress.approved_count}
                </span>
                <span className="kpi-meta">Quality verified</span>
              </div>

              <div className="card kpi-card">
                <span className="kpi-label">Submitted Queue</span>
                <span className="kpi-value" style={{ color: 'var(--color-warning)' }}>
                  {stats.progress.submitted_count}
                </span>
                <span className="kpi-meta">Awaiting review</span>
              </div>

              <div className="card kpi-card">
                <span className="kpi-label">Rejected Feedback</span>
                <span className="kpi-value" style={{ color: 'var(--color-danger)' }}>
                  {stats.progress.rejected_count}
                </span>
                <span className="kpi-meta">Returned for correction</span>
              </div>

              <div className="card kpi-card">
                <span className="kpi-label">Completion Velocity</span>
                <span className="kpi-value" style={{ color: 'var(--color-primary)' }}>
                  {stats.progress.completion_percentage}%
                </span>
                <span className="kpi-meta">Target completion</span>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span><strong>Overall Dataset Progress</strong></span>
                <span>{stats.progress.approved_count} of {stats.progress.total_tasks} Approved ({stats.progress.completion_percentage}%)</span>
              </div>
              <div className="progress-bar-container" style={{ height: '10px' }}>
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${stats.progress.completion_percentage}%` }}
                ></div>
              </div>
            </div>

            {/* Visual Analytics Grid: Charts */}
            <div className="charts-grid">
              {/* Chart 1: Label Distribution Bar Chart */}
              <div className="card chart-card">
                <div className="chart-header">
                  <h3>Approved Class Distribution</h3>
                  <p>Frequency distribution of applied labels for verified tasks.</p>
                </div>
                <div style={{ width: '100%', height: 280 }}>
                  {stats.label_distribution.length === 0 ? (
                    <div style={{ textAlign: 'center', paddingTop: '4rem', color: 'var(--color-text-muted)' }}>
                      No approved labels yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.label_distribution} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis dataKey="label_name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} />
                        <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} allowDecimals={false} />
                        <Tooltip 
                          formatter={(value) => [`${value} approved`, 'Count']}
                          contentStyle={{ 
                            backgroundColor: 'var(--color-surface)', 
                            color: 'var(--color-text-main)',
                            borderRadius: '8px', 
                            border: '1px solid var(--color-border)',
                            boxShadow: 'var(--shadow-lg)'
                          }}
                          itemStyle={{ color: 'var(--color-text-main)' }}
                          labelStyle={{ color: 'var(--color-text-main)', fontWeight: 600 }}
                        />
                        <Bar dataKey="approved_count" radius={[4, 4, 0, 0]}>
                          {stats.label_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.label_color || 'var(--color-primary)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 2: Daily Throughput Line Chart */}
              <div className="card chart-card">
                <div className="chart-header">
                  <h3>14-Day Submission Velocity</h3>
                  <p>Daily volume of annotations submitted over trailing 14 calendar days.</p>
                </div>
                <div style={{ width: '100%', height: 280 }}>
                  {stats.daily_throughput.length === 0 ? (
                    <div style={{ textAlign: 'center', paddingTop: '4rem', color: 'var(--color-text-muted)' }}>
                      No submissions recorded in the last 14 days.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.daily_throughput} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis dataKey="submission_date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} allowDecimals={false} />
                        <Tooltip 
                          formatter={(value) => [`${value} submissions`, 'Volume']}
                          contentStyle={{ 
                            backgroundColor: 'var(--color-surface)', 
                            color: 'var(--color-text-main)',
                            borderRadius: '8px', 
                            border: '1px solid var(--color-border)',
                            boxShadow: 'var(--shadow-lg)'
                          }}
                          itemStyle={{ color: 'var(--color-text-main)' }}
                          labelStyle={{ color: 'var(--color-text-main)', fontWeight: 600 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="submissions_count" 
                          stroke="var(--color-primary)" 
                          strokeWidth={3}
                          dot={{ r: 4, fill: 'var(--color-primary)' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Annotator Quality & Accuracy Table */}
            <div className="card" style={{ marginTop: '2rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3>Annotator Accuracy & QA Metrics</h3>
                <p>Calculated via <code>JOIN tasks + reviews</code>: Approved ÷ (Approved + Rejected).</p>
              </div>

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Annotator</th>
                      <th>Total Reviewed</th>
                      <th>Approved</th>
                      <th>Rejected</th>
                      <th>Accuracy Rate</th>
                      <th>Performance Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.annotator_accuracy.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                          No reviewed tasks recorded for this project yet.
                        </td>
                      </tr>
                    ) : (
                      stats.annotator_accuracy.map((ann) => {
                        const tier = ann.accuracy_percentage >= 80 ? 'High Accuracy'
                          : ann.accuracy_percentage >= 65 ? 'Good Velocity'
                          : 'Review Feedback';
                        const badgeClass = ann.accuracy_percentage >= 80 ? 'badge-approved'
                          : ann.accuracy_percentage >= 65 ? 'badge-in_progress'
                          : 'badge-rejected';

                        return (
                          <tr key={ann.user_id}>
                            <td><strong>{ann.annotator_name}</strong></td>
                            <td>{ann.total_reviewed}</td>
                            <td style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{ann.approved_count}</td>
                            <td style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{ann.rejected_count}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong>{ann.accuracy_percentage}%</strong>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${badgeClass}`}>{tier}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'info' })} 
      />

      <style>{`
        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }
        .dashboard-toolbar {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          flex-wrap: wrap;
        }
        .project-dropdown {
          width: 260px;
          font-weight: 600;
        }
        .export-buttons {
          display: flex;
          gap: var(--space-2);
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }
        .kpi-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          padding: var(--space-5);
        }
        .kpi-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .kpi-value {
          font-size: 2rem;
          font-weight: 800;
          line-height: 1.1;
        }
        .kpi-meta {
          font-size: 0.75rem;
          color: var(--color-text-light);
        }
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(440px, 1fr));
          gap: var(--space-6);
        }
        .chart-card {
          padding: var(--space-6);
        }
        .chart-header {
          margin-bottom: var(--space-4);
        }
        @media (max-width: 640px) {
          .charts-grid { grid-template-columns: 1fr; }
          .project-dropdown { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
