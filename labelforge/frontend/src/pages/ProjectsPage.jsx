import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [labelsModalOpen, setLabelsModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Active selected project
  const [selectedProject, setSelectedProject] = useState(null);

  // Form states
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  // Labels modal state
  const [projectLabels, setProjectLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#4F46E5');

  // Upload modal state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);

  // Assign modal state
  const [annotatorsList, setAnnotatorsList] = useState([]);
  const [selectedAnnotatorIds, setSelectedAnnotatorIds] = useState([]);
  const [assignResult, setAssignResult] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects?page=1&limit=50');
      setProjects(res.data.items);
    } catch (err) {
      setToast({ message: 'Failed to load projects.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // 1. Create Project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await api.post('/projects', { name: projectName, description: projectDesc });
      setToast({ message: 'Project created successfully!', type: 'success' });
      setCreateModalOpen(false);
      setProjectName('');
      setProjectDesc('');
      fetchProjects();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to create project', type: 'error' });
    }
  };

  // 2. Edit Project
  const handleEditProject = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/projects/${selectedProject.id}`, { name: projectName, description: projectDesc });
      setToast({ message: 'Project updated successfully!', type: 'success' });
      setEditModalOpen(false);
      fetchProjects();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to update project', type: 'error' });
    }
  };

  // 3. Delete Project
  const handleDeleteProject = async (proj) => {
    if (!window.confirm(`Are you sure you want to delete project "${proj.name}"? This cascades to all tasks and data items.`)) {
      return;
    }
    try {
      await api.delete(`/projects/${proj.id}`);
      setToast({ message: `Project "${proj.name}" deleted.`, type: 'info' });
      fetchProjects();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to delete project', type: 'error' });
    }
  };

  // 4. Open Labels Modal
  const openLabelsModal = async (proj) => {
    setSelectedProject(proj);
    try {
      const res = await api.get(`/projects/${proj.id}/labels`);
      setProjectLabels(res.data);
      setLabelsModalOpen(true);
    } catch (err) {
      setToast({ message: 'Failed to load project labels', type: 'error' });
    }
  };

  const handleAddLabel = async (e) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    try {
      const res = await api.post(`/projects/${selectedProject.id}/labels`, {
        name: newLabelName.trim(),
        color: newLabelColor
      });
      setProjectLabels([...projectLabels, res.data]);
      setNewLabelName('');
      setToast({ message: `Label "${res.data.name}" added`, type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to add label', type: 'error' });
    }
  };

  const handleDeleteLabel = async (labelId) => {
    try {
      await api.delete(`/labels/${labelId}`);
      setProjectLabels(projectLabels.filter(l => l.id !== labelId));
      setToast({ message: 'Label removed', type: 'info' });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Cannot delete label', type: 'error' });
    }
  };

  // 5. Open Upload Modal
  const openUploadModal = (proj) => {
    setSelectedProject(proj);
    setUploadFile(null);
    setUploadSummary(null);
    setUploadModalOpen(true);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setToast({ message: 'Please select a CSV or JSON file.', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      setUploadLoading(true);
      const res = await api.post(`/projects/${selectedProject.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadSummary(res.data);
      setToast({ message: 'Data ingested successfully!', type: 'success' });
      fetchProjects();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to upload dataset', type: 'error' });
    } finally {
      setUploadLoading(false);
    }
  };

  // 6. Open Assign Modal
  const openAssignModal = async (proj) => {
    setSelectedProject(proj);
    setAssignResult(null);
    try {
      const res = await api.get('/users?role=annotator');
      setAnnotatorsList(res.data);
      setSelectedAnnotatorIds(res.data.map(u => u.id)); // select all by default
      setAssignModalOpen(true);
    } catch (err) {
      setToast({ message: 'Failed to load annotators', type: 'error' });
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (selectedAnnotatorIds.length === 0) {
      setToast({ message: 'Please select at least one annotator.', type: 'error' });
      return;
    }

    try {
      setAssignLoading(true);
      const res = await api.post(`/projects/${selectedProject.id}/assign`, {
        annotator_ids: selectedAnnotatorIds
      });
      setAssignResult(res.data);
      setToast({ message: `Assigned ${res.data.assigned_count} tasks!`, type: 'success' });
      fetchProjects();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Assignment failed', type: 'error' });
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div className="main-content">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1>Annotation Projects</h1>
            <p>Create datasets, configure taxonomies, ingest raw text, and assign tasks to annotators.</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setProjectName('');
              setProjectDesc('');
              setCreateModalOpen(true);
            }}
          >
            + New Project
          </button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <LoadingSpinner size="44px" />
          </div>
        ) : projects.length === 0 ? (
          <div className="card empty-state">
            <span style={{ fontSize: '2.5rem' }}>📁</span>
            <h3>No projects created yet</h3>
            <p>Get started by creating your first text annotation project.</p>
            <button 
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => setCreateModalOpen(true)}
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((proj) => {
              const progressPct = proj.total_tasks > 0 
                ? Math.round((proj.completed_tasks / proj.total_tasks) * 100) 
                : 0;

              return (
                <div key={proj.id} className="card project-card">
                  <div className="project-card-header">
                    <h3>{proj.name}</h3>
                    <div className="card-actions">
                      <button 
                        className="btn-icon" 
                        title="Edit Project"
                        onClick={() => {
                          setSelectedProject(proj);
                          setProjectName(proj.name);
                          setProjectDesc(proj.description || '');
                          setEditModalOpen(true);
                        }}
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Delete Project"
                        onClick={() => handleDeleteProject(proj)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <p className="project-desc">{proj.description || 'No description provided.'}</p>

                  {/* Progress Indicator */}
                  <div className="project-stats-preview">
                    <div className="stats-row">
                      <span>Progress</span>
                      <strong>{progressPct}% ({proj.completed_tasks} / {proj.total_tasks})</strong>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Operational Toolbar */}
                  <div className="project-card-footer">
                    <div className="btn-group-row">
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => openLabelsModal(proj)}
                      >
                        🏷️ Labels
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => openUploadModal(proj)}
                      >
                        📤 Upload
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => openAssignModal(proj)}
                      >
                        👥 Assign
                      </button>
                    </div>
                    <Link to={`/dashboard?project_id=${proj.id}`} className="btn btn-primary btn-sm">
                      Analytics →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* 1. Modal: Create Project                          */}
      {/* ================================================= */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Project"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateProject}>Create Project</button>
          </>
        }
      >
        <form onSubmit={handleCreateProject}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Sentiment Classification"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Annotation Guidelines / Description</label>
            <textarea
              className="form-textarea"
              placeholder="Explain the labeling objective and guidelines for annotators..."
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* ================================================= */}
      {/* 2. Modal: Edit Project                            */}
      {/* ================================================= */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Project"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEditProject}>Save Changes</button>
          </>
        }
      >
        <form onSubmit={handleEditProject}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              type="text"
              required
              className="form-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* ================================================= */}
      {/* 3. Modal: Label Scheme Manager                    */}
      {/* ================================================= */}
      <Modal
        isOpen={labelsModalOpen}
        onClose={() => setLabelsModalOpen(false)}
        title={`Labels: ${selectedProject?.name}`}
        footer={
          <button className="btn btn-primary" onClick={() => setLabelsModalOpen(false)}>Done</button>
        }
      >
        <div className="labels-manager">
          <p style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
            Configure categorical labels. Shortcuts (1–9) are assigned to labels in order of appearance.
          </p>

          {/* Add Label Form */}
          <form onSubmit={handleAddLabel} className="add-label-bar">
            <input
              type="text"
              placeholder="Label name (e.g. Positive)"
              className="form-input"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="color"
              value={newLabelColor}
              onChange={(e) => setNewLabelColor(e.target.value)}
              className="color-picker"
              title="Pick label color"
            />
            <button type="submit" className="btn btn-primary btn-sm">+ Add</button>
          </form>

          {/* Existing Labels List */}
          <div className="labels-list">
            {projectLabels.length === 0 ? (
              <p style={{ color: 'var(--color-text-light)', fontStyle: 'italic' }}>No labels defined yet.</p>
            ) : (
              projectLabels.map((lbl, idx) => (
                <div key={lbl.id} className="label-item">
                  <div className="label-badge-preview">
                    <span className="label-key-shortcut">{idx + 1}</span>
                    <span 
                      className="label-dot" 
                      style={{ backgroundColor: lbl.color }}
                    ></span>
                    <strong>{lbl.name}</strong>
                  </div>
                  <button 
                    onClick={() => handleDeleteLabel(lbl.id)}
                    className="btn btn-outline-danger btn-sm"
                    title="Delete label"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* ================================================= */}
      {/* 4. Modal: Upload Text Dataset                     */}
      {/* ================================================= */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title={`Upload Data: ${selectedProject?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setUploadModalOpen(false)}>Close</button>
            {!uploadSummary && (
              <button 
                className="btn btn-primary" 
                onClick={handleUploadSubmit}
                disabled={uploadLoading || !uploadFile}
              >
                {uploadLoading ? 'Ingesting...' : 'Start Ingestion'}
              </button>
            )}
          </>
        }
      >
        <div className="upload-container">
          <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            Upload raw text data in <strong>.csv</strong> or <strong>.json</strong> format up to 5,000 rows.
            The file must contain a <code>text</code> column or attribute.
          </p>

          {!uploadSummary ? (
            <div className="file-drop-zone">
              <input
                type="file"
                accept=".csv, application/json"
                id="file-input"
                onChange={(e) => setUploadFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-input" className="file-drop-label">
                <span style={{ fontSize: '2rem' }}>📄</span>
                <span>{uploadFile ? uploadFile.name : 'Click to select .CSV or .JSON file'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                  Max 5,000 rows • Automatic deduplication
                </span>
              </label>
            </div>
          ) : (
            <div className="alert alert-success" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                <span>✅ Ingestion Summary:</span>
              </div>
              <div>• <strong>{uploadSummary.inserted}</strong> new text items inserted and tasks created</div>
              <div>• <strong>{uploadSummary.skipped}</strong> empty or duplicate rows skipped</div>
              <div>• <strong>{uploadSummary.total_processed}</strong> total rows evaluated</div>
            </div>
          )}
        </div>
      </Modal>

      {/* ================================================= */}
      {/* 5. Modal: Round-Robin Task Assignment             */}
      {/* ================================================= */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Tasks: ${selectedProject?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAssignModalOpen(false)}>Close</button>
            {!assignResult && (
              <button 
                className="btn btn-primary" 
                onClick={handleAssignSubmit}
                disabled={assignLoading || selectedAnnotatorIds.length === 0}
              >
                {assignLoading ? 'Distributing...' : 'Assign Round-Robin'}
              </button>
            )}
          </>
        }
      >
        <div>
          <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            Select active annotators to distribute unassigned tasks evenly in round-robin sequence:
          </p>

          {!assignResult ? (
            <div className="annotators-checkbox-list">
              {annotatorsList.length === 0 ? (
                <p>No active annotators found.</p>
              ) : (
                annotatorsList.map((ann) => (
                  <label key={ann.id} className="annotator-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedAnnotatorIds.includes(ann.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAnnotatorIds([...selectedAnnotatorIds, ann.id]);
                        } else {
                          setSelectedAnnotatorIds(selectedAnnotatorIds.filter(id => id !== ann.id));
                        }
                      }}
                    />
                    <div>
                      <strong>{ann.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{ann.email}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          ) : (
            <div className="alert alert-success" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontWeight: 'bold' }}>🎉 Distribution Completed!</div>
              <p>Successfully assigned <strong>{assignResult.assigned_count}</strong> unassigned tasks:</p>
              <ul style={{ paddingLeft: '1.25rem' }}>
                {Object.entries(assignResult.distribution).map(([userId, count]) => {
                  const userObj = annotatorsList.find(u => u.id === parseInt(userId));
                  return (
                    <li key={userId}>
                      {userObj ? userObj.name : `User #${userId}`}: <strong>{count} tasks</strong>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* Global Toast */}
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'info' })} 
      />

      <style>{`
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-8);
        }
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: var(--space-6);
        }
        .project-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .project-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: var(--space-2);
        }
        .project-desc {
          font-size: 0.9rem;
          margin-bottom: var(--space-4);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-actions {
          display: flex;
          gap: var(--space-1);
        }
        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 0.2rem;
          border-radius: var(--radius-sm);
        }
        .btn-icon:hover {
          background-color: var(--color-surface-hover);
        }
        .project-stats-preview {
          margin-bottom: var(--space-6);
        }
        .stats-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          margin-bottom: var(--space-2);
        }
        .project-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--color-border);
          padding-top: var(--space-4);
        }
        .btn-group-row {
          display: flex;
          gap: var(--space-1);
        }
        .labels-manager {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .add-label-bar {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .color-picker {
          width: 38px;
          height: 38px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          padding: 2px;
        }
        .labels-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          max-height: 250px;
          overflow-y: auto;
        }
        .label-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background-color: var(--color-surface-hover);
        }
        .label-badge-preview {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .label-key-shortcut {
          background-color: var(--color-surface);
          color: var(--color-text-main);
          border: 1px solid var(--color-border);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 3px;
        }
        .label-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .file-drop-zone {
          border: 2px dashed var(--color-border-dark);
          border-radius: var(--radius-lg);
          padding: 2.5rem 1.5rem;
          text-align: center;
          background-color: var(--color-surface-hover);
          cursor: pointer;
          transition: border-color var(--transition-fast);
        }
        .file-drop-zone:hover {
          border-color: var(--color-primary);
        }
        .file-drop-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
        }
        .annotators-checkbox-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          max-height: 250px;
          overflow-y: auto;
        }
        .annotator-checkbox-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        .annotator-checkbox-row:hover {
          background-color: var(--color-surface-hover);
        }
      `}</style>
    </div>
  );
};

export default ProjectsPage;
