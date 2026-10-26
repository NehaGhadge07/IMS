import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Briefcase, FileText, Award, Edit, CheckCircle, ExternalLink, 
  GitBranch as Github, Globe as Linkedin, Calendar, Eye, 
  Search, Filter, Check, Clock, AlertCircle, TrendingUp, Plus, X, CheckSquare, Star
} from 'lucide-react';

export default function Placements({ user }) {
  const navigate = useNavigate();
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [mockFilter, setMockFilter] = useState('all'); // 'all' | 'completed' | 'pending' | 'top_scorers'
  const [techFilter, setTechFilter] = useState('all');

  const isDirector = user?.role === 'Director';
  const isMentor = user?.role === 'Mentor';
  const isHR = user?.role === 'HR';
  const isReadOnly = isDirector; // Director is read-only
  const canSchedule = isMentor || isHR; // Trainer and HR can schedule & evaluate mock assessments

  // Quick Schedule Modal state
  const [scheduleModal, setScheduleModal] = useState({
    isOpen: false,
    internId: '',
    type: 'Mock Interview',
    scheduled_at: new Date().toISOString().split('T')[0],
    focus_areas: '',
    score: '',
    feedback: '',
    interviewer_name: user?.name || '',
    loading: false
  });

  const fetchInterns = async () => {
    try {
      setLoading(true);
      const data = await api.getInterns({});
      setInterns(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load interns list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterns();
  }, []);

  const openPlacementDetail = (intern) => {
    navigate(`/placements/${intern.id}`);
  };

  const openScheduleModal = (internId = '') => {
    setScheduleModal({
      isOpen: true,
      internId: internId || (interns.length > 0 ? String(interns[0].id) : ''),
      type: 'Mock Interview',
      scheduled_at: new Date().toISOString().split('T')[0],
      focus_areas: '',
      score: '',
      feedback: '',
      interviewer_name: user?.name || '',
      loading: false
    });
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleModal.internId) {
      alert('Please select an intern.');
      return;
    }

    setScheduleModal(prev => ({ ...prev, loading: true }));
    try {
      await api.createMockInterview(scheduleModal.internId, {
        type: scheduleModal.type,
        scheduled_at: scheduleModal.scheduled_at,
        interviewer_name: scheduleModal.interviewer_name,
        focus_areas: scheduleModal.focus_areas,
        score: scheduleModal.score,
        feedback: scheduleModal.feedback
      });
      setScheduleModal(prev => ({ ...prev, isOpen: false, loading: false }));
      alert(`${scheduleModal.type} scheduled successfully!`);
      fetchInterns();
    } catch (err) {
      alert('Failed to schedule assessment: ' + err.message);
      setScheduleModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Filtered interns list
  const filteredInterns = interns.filter(intern => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (intern.name || '').toLowerCase().includes(q);
      const matchEmail = (intern.email || '').toLowerCase().includes(q);
      const matchTech = (intern.technology || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchTech) return false;
    }

    // Tech filter
    if (techFilter !== 'all' && intern.technology !== techFilter) {
      return false;
    }

    // Mock status filter
    if (mockFilter === 'completed' && (!intern.mock_count || intern.mock_count === 0)) {
      return false;
    }
    if (mockFilter === 'pending' && intern.mock_count > 0) {
      return false;
    }
    if (mockFilter === 'top_scorers' && (!intern.latest_mock_score || intern.latest_mock_score < 7)) {
      return false;
    }

    return true;
  });

  // KPI Calculations
  const totalInterns = interns.length;
  const withResumes = interns.filter(i => i.resume_url && i.resume_url.trim()).length;
  const withMocks = interns.filter(i => i.mock_count > 0).length;
  const topScorers = interns.filter(i => i.latest_mock_score >= 7).length;
  
  // Calculate aggregate avg mock score
  const scoredMocks = interns.filter(i => i.mock_avg_score !== null && i.mock_avg_score !== undefined);
  const avgMockScore = scoredMocks.length > 0 
    ? (scoredMocks.reduce((acc, curr) => acc + parseFloat(curr.mock_avg_score), 0) / scoredMocks.length).toFixed(1)
    : '—';

  // Unique technologies for filter
  const technologies = Array.from(new Set(interns.map(i => i.technology).filter(Boolean)));

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading placement records...</div>;
  if (error) return <div style={{ color: 'var(--color-danger)' }}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={26} color="var(--color-primary)" /> Placement Record
            </h1>
            {isDirector && (
              <span className="badge badge-warning" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                Director View (Read-Only)
              </span>
            )}
            {isMentor && (
              <span className="badge badge-info" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                Trainer View (Placement Record & Assessments)
              </span>
            )}
          </div>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)' }}>
            {isMentor 
              ? 'View intern resumes, portfolio documents, and schedule / evaluate mock tests and mock interviews.'
              : isDirector 
              ? 'Complete overview of intern placement readiness, verified professional profiles, and mock interview performance.'
              : "Manage intern professional profiles, resumes, and evaluate mock interview assessments."}
          </p>
        </div>

        {/* Schedule Button for Trainer and HR */}
        {canSchedule && (
          <button 
            className="btn btn-primary" 
            onClick={() => openScheduleModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          >
            <Plus size={16} /> Schedule Mock Test / Interview
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Interns</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-primary)' }}>{totalInterns}</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Resumes Available</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#059669' }}>
            {withResumes} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>({totalInterns > 0 ? Math.round((withResumes/totalInterns)*100) : 0}%)</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>Mock Interviews Taken</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#d97706' }}>
            {withMocks} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>interns</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase' }}>Average Mock Score</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#7c3aed' }}>
            {avgMockScore} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ 10</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, textTransform: 'uppercase' }}>Interview Ready (≥7/10)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#2563eb' }}>{topScorers}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '350px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control form-control-sm" 
              placeholder="Search by intern name, email, tech..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Tech Filter */}
            <select 
              className="form-control form-control-sm" 
              style={{ width: '150px' }}
              value={techFilter} 
              onChange={e => setTechFilter(e.target.value)}
            >
              <option value="all">All Technologies</option>
              {technologies.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Mock Interview Status Filter */}
            <select 
              className="form-control form-control-sm" 
              style={{ width: '180px' }}
              value={mockFilter} 
              onChange={e => setMockFilter(e.target.value)}
            >
              <option value="all">All Mock Assessments</option>
              <option value="completed">Mock Completed</option>
              <option value="pending">Pending Mock Interview</option>
              <option value="top_scorers">High Scorers (Score ≥ 7.0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Placements & Mock Assessment Records Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: '950px' }}>
            <thead>
              <tr>
                <th>Intern Profile</th>
                <th>Batch / Slot</th>
                <th>Professional Links</th>
                <th>Resume</th>
                <th>Mock Interview Assessment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterns.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                    <Briefcase size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <div style={{ fontWeight: 600 }}>No placement records match the criteria.</div>
                  </td>
                </tr>
              ) : (
                filteredInterns.map(intern => {
                  const hasMocks = intern.mock_count > 0;
                  const latestScore = intern.latest_mock_score;
                  const scoreColor = latestScore >= 7 ? 'var(--color-success)' : latestScore >= 5 ? '#f59e0b' : '#ef4444';

                  return (
                    <tr key={intern.id}>
                      {/* Intern Name & Department */}
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{intern.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{intern.email}</div>
                        <span className="badge badge-info" style={{ fontSize: '0.7rem', marginTop: '3px', display: 'inline-block' }}>
                          {intern.technology || intern.department}
                        </span>
                      </td>

                      {/* Batch & Slot */}
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{intern.batch || 'Current Batch'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{intern.training_time}</div>
                      </td>

                      {/* Professional Profiles */}
                      <td>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                          {intern.github_url ? (
                            <a 
                              href={intern.github_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              title="GitHub Profile" 
                              style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', textDecoration: 'none' }}
                            >
                              <Github size={17} />
                              <span style={{ textDecoration: 'underline' }}>GitHub</span>
                            </a>
                          ) : (
                            <span title="No GitHub Profile" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '3px', opacity: 0.5 }}>
                              <Github size={15} /> —
                            </span>
                          )}

                          <span style={{ color: 'var(--border-color)' }}>•</span>

                          {intern.linkedin_url ? (
                            <a 
                              href={intern.linkedin_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              title="LinkedIn Profile" 
                              style={{ color: '#0a66c2', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', textDecoration: 'none' }}
                            >
                              <Linkedin size={17} />
                              <span style={{ textDecoration: 'underline' }}>LinkedIn</span>
                            </a>
                          ) : (
                            <span title="No LinkedIn Profile" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '3px', opacity: 0.5 }}>
                              <Linkedin size={15} /> —
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Resume Document */}
                      <td>
                        {intern.resume_url ? (
                          <a 
                            href={intern.resume_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.35rem', 
                              fontSize: '0.82rem', 
                              fontWeight: 600,
                              color: 'var(--color-primary)', 
                              background: 'rgba(59, 130, 246, 0.08)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              textDecoration: 'none' 
                            }}
                          >
                            <FileText size={14} /> View Resume
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Not Uploaded</span>
                        )}
                      </td>

                      {/* Mock Interview Assessment Column */}
                      <td>
                        {hasMocks ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ 
                                fontWeight: 800, 
                                fontSize: '0.95rem', 
                                color: scoreColor 
                              }}>
                                {latestScore !== null ? `${latestScore}/10` : 'Evaluated'}
                              </span>
                              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                                ✓ {intern.mock_count} Mock{intern.mock_count > 1 ? 's' : ''}
                              </span>
                            </div>
                            {intern.latest_mock_date && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Calendar size={11} /> {intern.latest_mock_date}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="badge badge-secondary" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Pending Mock
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button 
                            className={isDirector ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"} 
                            onClick={() => openPlacementDetail(intern)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                          >
                            <Eye size={14} /> {isDirector ? 'View Record' : isMentor ? 'View & Assess' : 'Manage Profile'}
                          </button>
                          {canSchedule && (
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => openScheduleModal(String(intern.id))}
                              style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', padding: '3px 7px', fontWeight: 600 }}
                              title="Schedule Mock Test or Interview for this intern"
                            >
                              <Plus size={12} /> Mock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Schedule Mock Test / Interview Modal */}
      {scheduleModal.isOpen && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '90%', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Schedule Mock Test / Interview
                </h3>
              </div>
              <button 
                onClick={() => setScheduleModal(prev => ({ ...prev, isOpen: false }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontWeight: 700 }}>Select Intern *</label>
                <select 
                  className="form-control" 
                  required 
                  value={scheduleModal.internId}
                  onChange={e => setScheduleModal({ ...scheduleModal, internId: e.target.value })}
                >
                  <option value="">-- Choose Intern --</option>
                  {interns.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.technology || 'General'} - Batch {i.batch || 'Current'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ fontWeight: 700 }}>Assessment Type *</label>
                  <select 
                    className="form-control"
                    value={scheduleModal.type}
                    onChange={e => setScheduleModal({ ...scheduleModal, type: e.target.value })}
                  >
                    <option value="Mock Interview">Mock Interview</option>
                    <option value="Mock Test">Mock Test</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1, minWidth: '130px' }}>
                  <label style={{ fontWeight: 700 }}>Scheduled Date *</label>
                  <input 
                    type="date"
                    required
                    className="form-control"
                    value={scheduleModal.scheduled_at}
                    onChange={e => setScheduleModal({ ...scheduleModal, scheduled_at: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ fontWeight: 700 }}>Evaluator / Trainer Name *</label>
                  <input 
                    type="text"
                    required
                    className="form-control"
                    value={scheduleModal.interviewer_name}
                    onChange={e => setScheduleModal({ ...scheduleModal, interviewer_name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ flex: 1, minWidth: '110px' }}>
                  <label style={{ fontWeight: 700 }}>Score (0-10) <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Optional)</span></label>
                  <input 
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    placeholder="e.g. 8.5"
                    className="form-control"
                    value={scheduleModal.score}
                    onChange={e => setScheduleModal({ ...scheduleModal, score: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontWeight: 700 }}>Technical Focus Topics</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="e.g. React & Node.js, Python OOPs, SQL Queries, DSA"
                  value={scheduleModal.focus_areas}
                  onChange={e => setScheduleModal({ ...scheduleModal, focus_areas: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 700 }}>Evaluation Notes / Remarks <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Optional)</span></label>
                <textarea 
                  className="form-control"
                  rows={2}
                  placeholder="Questions asked, preparation instructions, feedback..."
                  value={scheduleModal.feedback}
                  onChange={e => setScheduleModal({ ...scheduleModal, feedback: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setScheduleModal(prev => ({ ...prev, isOpen: false }))}
                  disabled={scheduleModal.loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  disabled={scheduleModal.loading}
                >
                  {scheduleModal.loading ? 'Scheduling...' : 'Confirm & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
