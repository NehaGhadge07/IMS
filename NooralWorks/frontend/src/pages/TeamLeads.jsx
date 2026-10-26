import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Briefcase, 
  Code, 
  Star, 
  Award,
  BookOpen,
  MessageSquare,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Phone,
  Camera,
  Key
} from 'lucide-react';

// ─── Toast helper ────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.75rem 1.1rem',
          borderRadius: 'var(--radius-md)',
          background: t.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${t.type === 'success' ? 'var(--color-primary)' : 'var(--color-danger)'}`,
          color: t.type === 'success' ? 'var(--color-primary)' : 'var(--color-danger)',
          fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          backdropFilter: 'blur(6px)', minWidth: 260
        }}>
          {t.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function TeamLeads({ user }) {
  const [teamLeads, setTeamLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Trainer Password Reset Modal
  const [trainerPwdModal, setTrainerPwdModal] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [newTrainerPwd, setNewTrainerPwd] = useState('');
  const [trainerPwdLoading, setTrainerPwdLoading] = useState(false);

  const openTrainerPwdModal = (tl) => {
    setSelectedTrainer(tl);
    setNewTrainerPwd('');
    setTrainerPwdModal(true);
  };

  const handleUpdateTrainerPassword = async (e) => {
    e.preventDefault();
    if (!newTrainerPwd || newTrainerPwd.trim().length < 4) {
      showToast('Password must be at least 4 characters long.', 'error');
      return;
    }
    setTrainerPwdLoading(true);
    try {
      await api.adminUpdateUserPassword(selectedTrainer.user_id, newTrainerPwd.trim());
      showToast(`Password for ${selectedTrainer.name} updated successfully!`);
      setTrainerPwdModal(false);
      setNewTrainerPwd('');
    } catch (err) {
      showToast('Failed to update password: ' + err.message, 'error');
    } finally {
      setTrainerPwdLoading(false);
    }
  };
  const [error, setError] = useState(null);
  
  // Toast notifications (replaces browser alert)
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPerfModal, setShowPerfModal] = useState(false);
  const [selectedTL, setSelectedTL] = useState(null);
  
  // Add Team Lead form state
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('Mentor');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDept, setFormDept] = useState('Software Development');
  const [formTech, setFormTech] = useState('');
  const [formPhoto, setFormPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoInputRef = useRef(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showTrainerPwd, setShowTrainerPwd] = useState(false);
  
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Performance form state
  const [perfRating, setPerfRating] = useState(5.0);
  const [perfNotes, setPerfNotes] = useState('');
  const [perfLoading, setPerfLoading] = useState(false);

  const isHR = user?.role === 'HR' || user?.role === 'Director';

  // ── Fetch trainers ──────────────────────────────────────────────────────────
  const fetchTeamLeads = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await api.getMentors();
      setTeamLeads(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch Trainers. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTeamLeads();
  }, [fetchTeamLeads]);

  // Auto-refresh every 30 s so both Director & HR tabs stay in sync without a page reload
  useEffect(() => {
    const interval = setInterval(() => fetchTeamLeads(true), 30000);
    return () => clearInterval(interval);
  }, [fetchTeamLeads]);

  // ── Add trainer ─────────────────────────────────────────────────────────────
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      showToast('Name and email are required.', 'error');
      return;
    }
    if (formRole === 'Mentor' && (!formDept || !formTech)) {
      showToast('Department and technology are required for Trainers.', 'error');
      return;
    }
    
    try {
      setFormLoading(true);
      const formData = new FormData();
      formData.append('name', formName.trim());
      formData.append('email', formEmail.trim().toLowerCase());
      formData.append('mobile_number', formMobile.trim());
      formData.append('password', formPassword.trim() || 'trainer123');
      formData.append('department', formDept);
      formData.append('technology', formTech.trim());
      formData.append('role', formRole);
      if (formPhoto) {
        formData.append('profile_photo', formPhoto);
      }

      await api.createTeamLead(formData);
      
      // Reset form & close modal
      setFormName('');
      setFormEmail('');
      setFormMobile('');
      setFormPassword('');
      setFormTech('');
      setFormPhoto(null);
      setPhotoPreview(null);
      setFormDept('Data Science Trainer');
      setFormRole('Mentor');
      setShowAddModal(false);
      
      // Refresh list immediately so both Director & HR tabs reflect the new trainer
      await fetchTeamLeads(true);
      showToast(`Trainer "${formName || 'New Trainer'}" registered successfully!`);
    } catch (err) {
      showToast('Error registering Trainer: ' + err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Performance modal ───────────────────────────────────────────────────────
  const openPerformanceModal = (tl) => {
    setSelectedTL(tl);
    setPerfRating(tl.performance_rating || 5.0);
    setPerfNotes(tl.performance_notes || '');
    setShowPerfModal(true);
  };

  const handlePerformanceSubmit = async (e) => {
    e.preventDefault();
    if (perfRating < 0 || perfRating > 5) {
      showToast('Rating must be between 0.0 and 5.0', 'error');
      return;
    }

    try {
      setPerfLoading(true);
      await api.updateTeamLeadPerformance(selectedTL.user_id, perfRating, perfNotes);
      setShowPerfModal(false);
      setSelectedTL(null);
      await fetchTeamLeads(true);
      showToast('Performance evaluation logged successfully!');
    } catch (err) {
      showToast('Error updating performance: ' + err.message, 'error');
    } finally {
      setPerfLoading(false);
    }
  };

  // ── Remove trainer ──────────────────────────────────────────────────────────
  const handleRemoveTL = async (tl) => {
    if (window.confirm(`Are you sure you want to completely remove Trainer "${tl.name}"?\n\nThis will unassign all their interns and cannot be undone.`)) {
      try {
        await api.deleteTeamLead(tl.user_id);
        // Refresh list immediately so both Director & HR tabs reflect the removal
        await fetchTeamLeads(true);
        showToast(`Trainer "${tl.name}" removed successfully.`);
      } catch (err) {
        showToast('Error removing trainer: ' + err.message, 'error');
      }
    }
  };

  // Filter list
  const filteredTLs = teamLeads.filter(tl => {
    const search = searchTerm.toLowerCase();
    return (
      tl.name.toLowerCase().includes(search) ||
      tl.email.toLowerCase().includes(search) ||
      tl.department.toLowerCase().includes(search) ||
      tl.technology.toLowerCase().includes(search)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Toast notification layer */}
      <Toast toasts={toasts} />

      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Trainers Directory</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Manual refresh — useful when two users (Director + HR) are logged in simultaneously */}
          <button
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem' }}
            onClick={() => fetchTeamLeads()}
            title="Refresh trainer list"
          >
            <RefreshCw size={14} /> Refresh
          </button>

          {isHR && (
            <button className="btn btn-primary" style={{ gap: '0.5rem' }} onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Register Trainer
            </button>
          )}
        </div>
      </div>

      {/* Filters card */}
      <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by name, technology, email or department..." 
            style={{ paddingLeft: '2.25rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Team Leads list */}
      {loading ? (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>Fetching Trainers directory...</div>
      ) : error ? (
        <div style={{ color: 'var(--color-danger)', padding: '1rem' }}>{error}</div>
      ) : filteredTLs.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }} className="card">No Trainer records found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredTLs.map(tl => {
            const initials = tl.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={tl.user_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
                
                {/* Header row */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: 52, 
                    height: 52, 
                    borderRadius: 'var(--radius-md)', 
                    backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                    color: 'var(--color-primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 700, 
                    fontSize: '1.2rem',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {tl.profile_photo ? (
                      <img src={`/uploads/${tl.profile_photo}`} alt={tl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{tl.name}</h3>
                      <span className={`badge ${tl.role === 'HR' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>
                        {tl.role === 'HR' ? 'HR' : 'Trainer'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      <Mail size={12} /> {tl.email}
                    </div>
                    {tl.mobile_number && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        <Phone size={12} /> {tl.mobile_number}
                      </div>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1rem 0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Briefcase size={12} /> Department
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tl.department}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Code size={12} /> Core Tech
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'normal', lineHeight: '1.4', textAlign: 'center', height: 'auto', padding: '0.4rem 0.75rem' }} className="badge badge-info">{tl.technology}</span>
                  </div>
                  {tl.role !== 'HR' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users size={12} /> Assigned Interns
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>{tl.intern_count} Active Interns</span>
                    </div>
                  )}
                </div>

                {/* Performance indicators - only for Trainers */}
                {tl.role !== 'HR' && (
                  <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                        <Award size={14} color="var(--color-warning)" /> Performance Rating
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star size={14} fill="var(--color-warning)" color="var(--color-warning)" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{parseFloat(tl.performance_rating || 5.0).toFixed(1)} / 5.0</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.8rem' }}>
                      <MessageSquare size={14} style={{ color: 'var(--text-muted)', marginTop: '0.1rem', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', wordBreak: 'break-word' }}>
                        "{tl.performance_notes || 'Performance review pending.'}"
                      </span>
                    </div>
                  </div>
                )}

                {/* HR Actions */}
                {isHR && (
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ flex: 1, gap: '0.35rem', fontSize: '0.78rem' }}
                      onClick={() => openTrainerPwdModal(tl)}
                      title="Update Trainer Login Password"
                    >
                      <Key size={12} color="var(--color-primary)" /> Password
                    </button>
                    {tl.role !== 'HR' && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ flex: 1, gap: '0.35rem', border: '1px dashed var(--color-primary)', fontSize: '0.78rem' }}
                        onClick={() => openPerformanceModal(tl)}
                      >
                        <Star size={12} /> Performance
                      </button>
                    )}
                    {user?.role === 'Director' && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ flex: 1, gap: '0.35rem', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', fontSize: '0.78rem' }}
                        onClick={() => handleRemoveTL(tl)}
                      >
                        <Trash2 size={12} /> Remove Staff
                      </button>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Team Lead / Trainer */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2>{formRole === 'HR' ? 'Register HR Staff' : 'Register Trainer'}</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              {user?.role === 'Director' && (
                <div className="form-group">
                  <label>Staff Role</label>
                  <select className="form-control" value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                    <option value="Mentor">Trainer</option>
                    <option value="HR">HR Staff</option>
                  </select>
                </div>
              )}

              {/* Profile Photo Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem', padding: '0.75rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <div 
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-color)',
                    border: '2px dashed var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                  onClick={() => photoInputRef.current?.click()}
                  title="Upload Trainer Profile Photo"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
                      <Camera size={24} />
                      <span style={{ fontSize: '0.65rem', marginTop: '2px' }}>Photo</span>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={photoInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*" 
                  onChange={handlePhotoSelect} 
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.75rem', gap: '0.3rem' }}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Camera size={13} /> {photoPreview ? 'Change Profile Photo' : 'Upload Profile Photo'}
                </button>
              </div>

              {/* Name */}
              <div className="form-group">
                <label>Full Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  placeholder="e.g. Ramesh Kumar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              {/* Mobile & Email */}
              <div className="form-row">
                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    required 
                    placeholder="e.g. +91 98765 43210"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    required 
                    placeholder="e.g. ramesh@company.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Department & Technology Stack */}
              <div className="form-row">
                <div className="form-group">
                  <label>Department *</label>
                  <select className="form-control" value={formDept} onChange={(e) => setFormDept(e.target.value)}>
                    <option value="Software Development">Software Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Web Development">Web Development</option>
                    <option value="Data Analytics">Data Analytics</option>
                    <option value="Human Resources">Human Resources</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Technology Stack *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required={formRole === 'Mentor'}
                    placeholder="e.g. React.js, Node.js, Python"
                    value={formTech}
                    onChange={(e) => setFormTech(e.target.value)}
                  />
                </div>
              </div>

              {/* Initial Password with Eye toggle */}
              <div className="form-group">
                <label>Initial Login Password (Optional — default: trainer123)</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showTrainerPwd ? 'text' : 'password'}
                    className="form-control" 
                    placeholder="Leave empty for default (trainer123)"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <span
                    onClick={() => setShowTrainerPwd(!showTrainerPwd)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%',
                      transform: 'translateY(-50%)', cursor: 'pointer',
                      color: 'var(--text-muted)', display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showTrainerPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={formLoading}>
                {formLoading ? 'Registering Trainer...' : 'Register Trainer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage Performance */}
      {showPerfModal && selectedTL && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Evaluate Performance</h2>
              <button className="modal-close" onClick={() => setShowPerfModal(false)}>&times;</button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div>Team Lead: <span style={{ fontWeight: 700 }}>{selectedTL.name}</span></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Department: {selectedTL.department} | Core: {selectedTL.technology}</div>
            </div>

            <form onSubmit={handlePerformanceSubmit}>
              <div className="form-group">
                <label style={{ display: 'flex', justify: 'space-between' }}>
                  <span>Performance Score (0.0 to 5.0)</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{perfRating} / 5.0</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="0.1" 
                  className="form-control"
                  style={{ background: 'var(--bg-hover)', border: 'none', height: '6px', padding: 0 }}
                  value={perfRating}
                  onChange={(e) => setPerfRating(parseFloat(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Review Feedback & Performance Notes</label>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  required
                  placeholder="Write coaching feedback, performance highlights, or improvement instructions..."
                  value={perfNotes}
                  onChange={(e) => setPerfNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={perfLoading}>
                {perfLoading ? 'Saving Review...' : 'Submit Evaluation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Trainer Password */}
      {trainerPwdModal && selectedTrainer && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '1.75rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <Key size={18} color="var(--color-primary)" />
                Update Trainer Password
              </h3>
              <button className="modal-close" onClick={() => setTrainerPwdModal(false)}>&times;</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Set a new login password for <strong>{selectedTrainer.name}</strong> ({selectedTrainer.email}). The trainer will immediately use this updated password to sign in.
            </p>

            <form onSubmit={handleUpdateTrainerPassword}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>New Password <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter new password (min. 4 chars)"
                  value={newTrainerPwd}
                  onChange={(e) => setNewTrainerPwd(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTrainerPwdModal(false)}
                  disabled={trainerPwdLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={trainerPwdLoading}
                >
                  {trainerPwdLoading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
