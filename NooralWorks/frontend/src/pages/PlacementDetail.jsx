import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  ArrowLeft, GitBranch as Github, Globe as Linkedin, FileText, 
  Award, Calendar, CheckCircle, ExternalLink, ShieldCheck, 
  UserCheck, AlertCircle, Eye, Star, FolderLock, Plus, Edit2, 
  Trash2, Clock, CheckSquare, X
} from 'lucide-react';

export default function PlacementDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [intern, setIntern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Links Form (for HR - read-only for Trainer & Director)
  const [formLinks, setFormLinks] = useState({ github_url: '', linkedin_url: '', resume_url: '' });
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksSuccess, setLinksSuccess] = useState(false);

  // Mock Interviews & Tests
  const [mockInterviews, setMockInterviews] = useState([]);
  const [showMockForm, setShowMockForm] = useState(false);
  const [mockForm, setMockForm] = useState({ 
    type: 'Mock Interview',
    interviewer_name: user?.name || '', 
    scheduled_at: new Date().toISOString().split('T')[0], 
    focus_areas: '', 
    score: '', 
    feedback: '' 
  });
  const [documents, setDocuments] = useState([]);
  const [mockLoading, setMockLoading] = useState(false);

  // Score Evaluation Modal state
  const [evalModal, setEvalModal] = useState({
    isOpen: false,
    mock: null,
    score: '',
    feedback: '',
    loading: false
  });

  const isDirector = user?.role === 'Director';
  const isMentor = user?.role === 'Mentor';
  const isHR = user?.role === 'HR';
  const isReadOnlyLinks = isDirector || isMentor; // Trainer and Director can only view links/resume
  const canManageAssessments = isMentor || isHR; // Both Trainer and HR can schedule & evaluate mock assessments

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getIntern(id);
      setIntern(data.intern);
      setDocuments(data.documents || []);
      setFormLinks({
        github_url: data.intern.github_url || '',
        linkedin_url: data.intern.linkedin_url || '',
        resume_url: data.intern.resume_url || ''
      });
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load intern details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMockInterviews = async () => {
    try {
      const data = await api.getMockInterviews(id);
      setMockInterviews(data || []);
    } catch (err) {
      console.error('Could not load mock assessments:', err);
    }
  };

  useEffect(() => {
    fetchDetails();
    fetchMockInterviews();
  }, [id]);

  const handleSaveLinks = async (e) => {
    e.preventDefault();
    if (isReadOnlyLinks) return; // Prevent Trainer & Director from modifying profiles

    setLinksLoading(true);
    setLinksSuccess(false);
    try {
      await api.updateIntern(id, {
        github_url: formLinks.github_url,
        linkedin_url: formLinks.linkedin_url,
        resume_url: formLinks.resume_url
      });
      setLinksSuccess(true);
      setTimeout(() => setLinksSuccess(false), 3000);
      fetchDetails();
    } catch (err) {
      alert('Error updating links: ' + err.message);
    } finally {
      setLinksLoading(false);
    }
  };

  const handleAddMockInterview = async (e) => {
    e.preventDefault();
    if (!canManageAssessments) {
      alert('Only Trainers and HR staff can schedule or evaluate mock assessments.');
      return;
    }

    setMockLoading(true);
    try {
      await api.createMockInterview(id, mockForm);
      setShowMockForm(false);
      setMockForm({ 
        type: 'Mock Interview',
        interviewer_name: user?.name || '', 
        scheduled_at: new Date().toISOString().split('T')[0], 
        focus_areas: '', 
        score: '', 
        feedback: '' 
      });
      fetchMockInterviews();
    } catch (err) {
      alert(err.message || 'Failed to schedule mock assessment.');
    } finally {
      setMockLoading(false);
    }
  };

  const openEvalModal = (mock) => {
    setEvalModal({
      isOpen: true,
      mock,
      score: mock.score !== null && mock.score !== undefined ? String(mock.score) : '',
      feedback: mock.feedback || '',
      loading: false
    });
  };

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!evalModal.mock) return;

    setEvalModal(prev => ({ ...prev, loading: true }));
    try {
      await api.updateMockInterview(evalModal.mock.id, {
        score: evalModal.score,
        feedback: evalModal.feedback,
        status: 'Completed'
      });
      setEvalModal({ isOpen: false, mock: null, score: '', feedback: '', loading: false });
      fetchMockInterviews();
    } catch (err) {
      alert('Failed to mark score: ' + err.message);
      setEvalModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteMock = async (mockId) => {
    if (!window.confirm('Are you sure you want to remove this mock assessment record?')) return;
    try {
      await api.deleteMockInterview(mockId);
      fetchMockInterviews();
    } catch (err) {
      alert('Failed to delete assessment: ' + err.message);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading placement details...</div>;
  if (error) return <div style={{ color: 'var(--color-danger)' }}>{error}</div>;
  if (!intern) return null;

  // Calculate average mock interview score
  const validScores = mockInterviews.filter(m => m.score !== null && m.score !== undefined);
  const avgScore = validScores.length > 0
    ? (validScores.reduce((acc, curr) => acc + parseFloat(curr.score), 0) / validScores.length).toFixed(1)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/placements')} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <ArrowLeft size={14} /> Back to Placement Record
        </button>

        {isDirector && (
          <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Eye size={13} /> Director View (Read-Only)
          </span>
        )}
        {isMentor && (
          <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Award size={13} /> Trainer View (Documents View-Only • Assessments Active)
          </span>
        )}
      </div>

      {/* Trainer Advisory Notice */}
      {isMentor && (
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.08)', 
          borderLeft: '4px solid var(--color-primary)', 
          borderRadius: 'var(--radius-md)', 
          padding: '0.85rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} color="var(--color-primary)" />
          <div>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Trainer Placement & Assessment Management</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
              You have inspection access to view the resume and verified documents for <strong>{intern.name}</strong>. 
              As their assigned trainer, you can schedule <strong>Mock Tests</strong> & <strong>Mock Interviews</strong>, evaluate their performance, and mark their scores.
            </div>
          </div>
        </div>
      )}

      {/* Director Read-Only Advisory Notice */}
      {isDirector && (
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.08)', 
          borderLeft: '4px solid var(--color-primary)', 
          borderRadius: 'var(--radius-md)', 
          padding: '0.85rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} color="var(--color-primary)" />
          <div>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Executive Placement Record</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
              You are viewing the placement portfolio and mock interview records for <strong>{intern.name}</strong>. 
              As Director, you have executive inspection access. Profiles and mock interview assessments are recorded by Trainers and HR.
            </div>
          </div>
        </div>
      )}

      {/* Intern Overview Header */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
              {intern.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              <span>{intern.email}</span>
              <span>•</span>
              <span className="badge badge-info">{intern.technology || intern.department}</span>
              <span>•</span>
              <span>Batch: {intern.batch || 'Current'} ({intern.training_time})</span>
            </div>
          </div>

          {/* Quick Mock Summary Badge */}
          {mockInterviews.length > 0 && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              background: 'var(--bg-hover)', 
              padding: '0.6rem 1.2rem', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)' 
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Mock Average</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: avgScore >= 7 ? 'var(--color-success)' : avgScore >= 5 ? '#f59e0b' : '#ef4444' }}>
                  {avgScore}/10
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Assessments</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {mockInterviews.length}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two-Column Grid: Profiles & Mock Interviews */}
      <div className="grid-split">
        {/* Left Column: Professional Profiles & Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
              <Award size={20} color="var(--color-primary)" /> Professional Profiles & Resume
            </h3>

            {isReadOnlyLinks ? (
              /* Read-Only Showcase for Director and Trainer */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* GitHub */}
                <div style={{ background: 'var(--bg-hover)', padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Github size={16} /> GitHub Profile
                  </div>
                  {intern.github_url ? (
                    <a 
                      href={intern.github_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '4px' }}
                    >
                      <ExternalLink size={13} /> Open GitHub: {intern.github_url.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No GitHub profile link recorded.</span>
                  )}
                </div>

                {/* LinkedIn */}
                <div style={{ background: 'var(--bg-hover)', padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0a66c2', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Linkedin size={16} /> LinkedIn Profile
                  </div>
                  {intern.linkedin_url ? (
                    <a 
                      href={intern.linkedin_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '4px', color: '#0a66c2' }}
                    >
                      <ExternalLink size={13} /> Open LinkedIn: {intern.linkedin_url.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No LinkedIn profile link recorded.</span>
                  )}
                </div>

                {/* Resume */}
                <div style={{ background: 'var(--bg-hover)', padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={16} /> Resume Document
                  </div>
                  {intern.resume_url ? (
                    <a 
                      href={intern.resume_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '4px' }}
                    >
                      <FileText size={14} /> View & Inspect Resume
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No resume uploaded for this intern.</span>
                  )}
                </div>
              </div>
            ) : (
              /* Editable Form for HR */
              <form onSubmit={handleSaveLinks} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>GitHub Profile URL</label>
                  <div style={{ position: 'relative' }}>
                    <Github size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="url" 
                      className="form-control" 
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="https://github.com/username"
                      value={formLinks.github_url}
                      onChange={(e) => setFormLinks({ ...formLinks, github_url: e.target.value })}
                      disabled={linksLoading}
                    />
                  </div>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>LinkedIn Profile URL</label>
                  <div style={{ position: 'relative' }}>
                    <Linkedin size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="url" 
                      className="form-control" 
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="https://linkedin.com/in/username"
                      value={formLinks.linkedin_url}
                      onChange={(e) => setFormLinks({ ...formLinks, linkedin_url: e.target.value })}
                      disabled={linksLoading}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Resume Link / File URL</label>
                  <div style={{ position: 'relative' }}>
                    <FileText size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="e.g. /uploads/... or https://drive.google.com/..."
                      value={formLinks.resume_url}
                      onChange={(e) => setFormLinks({ ...formLinks, resume_url: e.target.value })}
                      disabled={linksLoading}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  {linksSuccess && (
                    <span style={{ color: 'var(--color-success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle size={14} /> Saved successfully
                    </span>
                  )}
                  <button type="submit" className="btn btn-primary" disabled={linksLoading}>
                    {linksLoading ? 'Saving...' : 'Save Profiles'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Dedicated Placement & Career Documents Card */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
              <FolderLock size={20} color="var(--color-primary)" /> Placement & Verified Documents
            </h3>
            
            {documents.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                No additional placement documents uploaded for this intern.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {documents.map(doc => (
                  <div 
                    key={doc.id}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.75rem 1rem', 
                      background: 'var(--bg-hover)', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border-color)',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FileText size={16} color="var(--color-primary)" />
                        <span>{doc.doc_type}</span>
                        <span className={`badge ${doc.status === 'Verified' ? 'badge-success' : doc.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                          {doc.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Uploaded: {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '-'}
                        {doc.comments && ` • ${doc.comments}`}
                      </div>
                    </div>

                    <a 
                      href={`/uploads/${doc.file_path}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                    >
                      <Eye size={13} /> View Document
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mock Tests & Interview Assessments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                  <Calendar size={20} color="var(--color-warning)" /> Mock Tests & Interview Assessments
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Schedule technical evaluations, mock coding tests, and mark performance scores.
                </span>
              </div>
              
              {/* Trainer & HR can schedule mock assessments */}
              {canManageAssessments && !showMockForm && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowMockForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={14} /> Schedule Mock Test / Interview
                </button>
              )}
            </div>

            {/* Mock Assessment Scheduling Form */}
            {canManageAssessments && showMockForm && (
              <form onSubmit={handleAddMockInterview} style={{ background: 'var(--bg-hover)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} color="var(--color-primary)" /> Schedule New Mock Test / Interview
                  </h4>
                  <button type="button" onClick={() => setShowMockForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                    <label>Assessment Type *</label>
                    <select 
                      className="form-control" 
                      value={mockForm.type} 
                      onChange={e => setMockForm({ ...mockForm, type: e.target.value })}
                    >
                      <option value="Mock Interview">Mock Interview (Technical / HR)</option>
                      <option value="Mock Test">Mock Test (Coding / Aptitude)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 1, minWidth: '130px' }}>
                    <label>Scheduled Date *</label>
                    <input 
                      type="date" 
                      required 
                      className="form-control" 
                      value={mockForm.scheduled_at} 
                      onChange={e => setMockForm({ ...mockForm, scheduled_at: e.target.value })} 
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
                    <label>Evaluator / Trainer Name *</label>
                    <input 
                      type="text" 
                      required 
                      className="form-control" 
                      value={mockForm.interviewer_name} 
                      onChange={e => setMockForm({ ...mockForm, interviewer_name: e.target.value })} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ flex: 3, minWidth: '160px' }}>
                    <label>Technical Focus Topics (e.g. React & Node.js, Python, DSA, System Design)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. OOPs, REST API, Database Queries, Component Lifecycle" 
                      value={mockForm.focus_areas} 
                      onChange={e => setMockForm({ ...mockForm, focus_areas: e.target.value })} 
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1, minWidth: '110px' }}>
                    <label>Score (0-10) <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Optional)</span></label>
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      step="0.5" 
                      placeholder="e.g. 8.5" 
                      className="form-control" 
                      value={mockForm.score} 
                      onChange={e => setMockForm({ ...mockForm, score: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Evaluation Notes / Feedback <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Optional when scheduling ahead)</span></label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    placeholder="Enter instructions, questions asked, or evaluation remarks..." 
                    value={mockForm.feedback} 
                    onChange={e => setMockForm({ ...mockForm, feedback: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowMockForm(false)} disabled={mockLoading}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={mockLoading}>
                    {mockLoading ? 'Saving...' : mockForm.score ? 'Save & Record Score' : 'Schedule Assessment'}
                  </button>
                </div>
              </form>
            )}

            {/* Mock Assessment Records List */}
            {mockInterviews.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2.5rem 1rem' }}>
                <Award size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>No mock tests or interviews recorded yet.</div>
                <div style={{ fontSize: '0.85rem', marginTop: '6px', maxWidth: '380px', margin: '6px auto 0' }}>
                  {isDirector 
                    ? 'Evaluations conducted by Trainers and HR will automatically show here.' 
                    : 'Click "+ Schedule Mock Test / Interview" above to assign an evaluation session.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {mockInterviews.map((mi, i) => {
                  const score = mi.score !== null && mi.score !== undefined && mi.score !== '' ? parseFloat(mi.score) : null;
                  const isScored = score !== null;
                  const isHigh = isScored && score >= 7;
                  const isMid = isScored && score >= 5 && score < 7;
                  const borderColor = isScored ? (isHigh ? 'var(--color-success)' : isMid ? '#f59e0b' : '#ef4444') : '#3b82f6';
                  const isTest = mi.type === 'Mock Test';

                  return (
                    <div 
                      key={mi.id} 
                      style={{ 
                        borderLeft: `4px solid ${borderColor}`, 
                        background: 'var(--bg-hover)', 
                        borderRadius: 'var(--radius-sm)', 
                        padding: '1.1rem 1.25rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        border: '1px solid var(--border-color)',
                        borderLeftWidth: '4px',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        {/* Session Header & Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            backgroundColor: isTest ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: isTest ? '#7c3aed' : '#2563eb',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            {isTest ? <CheckSquare size={11} /> : <Award size={11} />}
                            {mi.type || 'Mock Interview'}
                          </span>

                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            #{mockInterviews.length - i}
                          </span>

                          <span className={`badge ${isScored ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {isScored ? <CheckCircle size={10} /> : <Clock size={10} />}
                            {isScored ? 'Completed' : 'Scheduled'}
                          </span>

                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: 'auto' }}>
                            <Calendar size={12} /> {mi.scheduled_at}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <strong>Evaluator / Trainer:</strong> {mi.interviewer_name}
                        </div>

                        {mi.focus_areas && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <strong>Focus Topics:</strong> <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{mi.focus_areas}</span>
                          </div>
                        )}

                        {mi.feedback && (
                          <div style={{ 
                            fontSize: '0.85rem', 
                            marginTop: '8px', 
                            color: 'var(--text-primary)', 
                            background: 'var(--bg-card)',
                            padding: '0.6rem 0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            lineHeight: 1.45,
                            whiteSpace: 'pre-wrap'
                          }}>
                            <strong>Feedback:</strong> {mi.feedback}
                          </div>
                        )}

                        {/* Actions for Trainer and HR */}
                        {canManageAssessments && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => openEvalModal(mi)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '3px 8px' }}
                            >
                              <Edit2 size={12} /> {isScored ? 'Update Score' : 'Mark Score'}
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => handleDeleteMock(mi.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '3px 8px', color: '#ef4444' }}
                              title="Delete record"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Score Box */}
                      <div style={{ 
                        textAlign: 'center', 
                        minWidth: '85px', 
                        background: 'var(--bg-card)', 
                        padding: '0.75rem 0.85rem', 
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {isScored ? (
                          <>
                            <div style={{ 
                              fontSize: '1.6rem', 
                              fontWeight: 800, 
                              color: borderColor,
                              lineHeight: 1.1 
                            }}>
                              {score}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              out of 10
                            </div>
                            <div style={{ marginTop: '4px' }}>
                              <span className={`badge ${isHigh ? 'badge-success' : isMid ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                                {isHigh ? 'Strong' : isMid ? 'Average' : 'Needs Work'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
                              Pending
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              No score
                            </div>
                            {canManageAssessments && (
                              <button 
                                onClick={() => openEvalModal(mi)}
                                className="btn btn-primary btn-sm"
                                style={{ marginTop: '6px', fontSize: '0.72rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Star size={11} /> Mark Score
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mark Score / Evaluation Modal */}
      {evalModal.isOpen && evalModal.mock && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '90%', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Mark Score & Feedback
                </h3>
              </div>
              <button 
                onClick={() => setEvalModal({ isOpen: false, mock: null, score: '', feedback: '', loading: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Assessment Details Banner */}
            <div style={{ background: 'var(--bg-hover)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div><strong>Intern:</strong> {intern.name}</div>
              <div style={{ marginTop: '3px' }}><strong>Assessment:</strong> {evalModal.mock.type || 'Mock Interview'} ({evalModal.mock.scheduled_at})</div>
              {evalModal.mock.focus_areas && (
                <div style={{ marginTop: '3px' }}><strong>Focus:</strong> {evalModal.mock.focus_areas}</div>
              )}
            </div>

            <form onSubmit={handleSaveEvaluation}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Score (0.0 to 10.0) *</label>
                <input 
                  type="number" 
                  min="0" 
                  max="10" 
                  step="0.5" 
                  required 
                  className="form-control" 
                  placeholder="e.g. 8.5" 
                  value={evalModal.score} 
                  onChange={e => setEvalModal({ ...evalModal, score: e.target.value })} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                  Score guideline: ≥7.0 Strong / Ready, 5.0 - 6.5 Average, &lt;5.0 Needs Work.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Detailed Technical Feedback & Improvement Areas</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  placeholder="Technical accuracy, problem-solving, code structure, communication skills, suggestions for improvement..." 
                  value={evalModal.feedback} 
                  onChange={e => setEvalModal({ ...evalModal, feedback: e.target.value })} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setEvalModal({ isOpen: false, mock: null, score: '', feedback: '', loading: false })}
                  disabled={evalModal.loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  disabled={evalModal.loading}
                >
                  {evalModal.loading ? 'Saving...' : 'Save & Mark Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

