import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  PhoneCall, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Edit2, 
  AlertCircle, 
  Eye, 
  Download, 
  RefreshCw,
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function Enquiries({ user }) {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // Add Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newInterest, setNewInterest] = useState('Software Development');
  const [newNotes, setNewNotes] = useState('');
  const [newNextDate, setNewNextDate] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Follow-up log state
  const [logStatus, setLogStatus] = useState('Callback');
  const [logNotes, setLogNotes] = useState('');
  const [logNextDate, setLogNextDate] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  const isDirector = user?.role === 'Director';
  const isHR = user?.role === 'HR';

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const data = await api.getEnquiries({
        search: searchTerm,
        status: statusFilter,
        interest: interestFilter
      });
      setEnquiries(data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load enquiries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [searchTerm, statusFilter, interestFilter]);

  const handleAddEnquiry = async (e) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    setAddLoading(true);
    try {
      await api.createEnquiry({
        name: newName,
        phone: newPhone,
        email: newEmail,
        interest: newInterest,
        notes: newNotes,
        next_follow_up_date: newNextDate
      });
      setShowAddModal(false);
      // Reset fields
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewNotes('');
      setNewNextDate('');
      fetchEnquiries();
    } catch (err) {
      alert(err.message || 'Failed to add enquiry.');
    } finally {
      setAddLoading(false);
    }
  };

  const openFollowUpModal = (enq) => {
    setSelectedEnquiry(enq);
    setLogStatus(enq.status);
    setLogNotes(enq.notes || '');
    setLogNextDate(enq.next_follow_up_date || '');
    setShowFollowUpModal(true);
  };

  const openDetailModal = (enq) => {
    setSelectedEnquiry(enq);
    setShowDetailModal(true);
  };

  const handleSaveFollowUp = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry) return;
    setLogLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await api.updateEnquiry(selectedEnquiry.id, {
        status: logStatus,
        notes: logNotes,
        last_follow_up_date: todayStr,
        next_follow_up_date: logNextDate
      });
      setShowFollowUpModal(false);
      setSelectedEnquiry(null);
      setLogNotes('');
      setLogNextDate('');
      fetchEnquiries();
    } catch (err) {
      alert(err.message || 'Failed to update follow-up logs.');
    } finally {
      setLogLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this enquiry?')) return;
    try {
      await api.deleteEnquiry(id);
      fetchEnquiries();
    } catch (err) {
      alert(err.message || 'Failed to delete enquiry.');
    }
  };

  const handleExportCSV = () => {
    if (!enquiries || enquiries.length === 0) {
      alert('No enquiries data to export.');
      return;
    }
    const headers = ['ID', 'Name', 'Phone', 'Email', 'Interest Track', 'Status', 'Handled By', 'Next Follow-up', 'Created Date', 'Notes'];
    const rows = enquiries.map(e => [
      e.id,
      `"${(e.name || '').replace(/"/g, '""')}"`,
      `"${(e.phone || '').replace(/"/g, '""')}"`,
      `"${(e.email || '').replace(/"/g, '""')}"`,
      `"${(e.interest || '').replace(/"/g, '""')}"`,
      `"${(e.status || '').replace(/"/g, '""')}"`,
      `"${(e.hr_name || 'Admin').replace(/"/g, '""')}"`,
      `"${(e.next_follow_up_date || '').replace(/"/g, '""')}"`,
      `"${(e.created_at || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admissions_enquiries_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // KPI calculations
  const totalCount = enquiries.length;
  const newCount = enquiries.filter(e => e.status === 'New').length;
  const callbackCount = enquiries.filter(e => e.status === 'Callback').length;
  const enrolledCount = enquiries.filter(e => e.status === 'Enrolled').length;
  const conversionRate = totalCount > 0 ? Math.round((enrolledCount / totalCount) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner & Title */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <PhoneCall size={22} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>
                Admissions & Leads Enquiries
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Download size={15} /> Export Excel (.CSV)
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={fetchEnquiries}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Header Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div 
          className="card stat-card clickable"
          onClick={() => setStatusFilter('')}
          title="Click to view all enquiries"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-header">
            <span className="stat-title">Total Enquiries</span>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)' }}>
              <PhoneCall size={16} color="var(--color-primary)" />
            </div>
          </div>
          <div className="stat-value">{totalCount}</div>
        </div>

        <div 
          className="card stat-card clickable"
          onClick={() => setStatusFilter(statusFilter === 'New' ? '' : 'New')}
          title="Click to filter New enquiries"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-header">
            <span className="stat-title">New Enquiries</span>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
              <AlertCircle size={16} color="#ef4444" />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{newCount}</div>
        </div>

        <div 
          className="card stat-card clickable"
          onClick={() => setStatusFilter(statusFilter === 'Callback' ? '' : 'Callback')}
          title="Click to filter Callbacks Scheduled"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-header">
            <span className="stat-title">Callbacks Scheduled</span>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)' }}>
              <Clock size={16} color="var(--color-warning)" />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{callbackCount}</div>
        </div>

        <div 
          className="card stat-card clickable"
          onClick={() => setStatusFilter(statusFilter === 'Enrolled' ? '' : 'Enrolled')}
          title="Click to filter Enrolled Trainees"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-header">
            <span className="stat-title">Enrolled Trainees</span>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)' }}>
              <CheckCircle size={16} color="var(--color-success)" />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>{enrolledCount}</div>
          <div className="stat-desc">{conversionRate}% conversion</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '2.5rem' }} 
              placeholder="Search by name, phone, email, notes, HR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select className="form-control" style={{ width: '160px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Callback">Callback</option>
            <option value="Enrolled">Enrolled</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select className="form-control" style={{ width: '180px' }} value={interestFilter} onChange={(e) => setInterestFilter(e.target.value)}>
            <option value="">All Interests</option>
            <option value="Software Development">Software Development</option>
            <option value="Data Science">Data Science</option>
            <option value="Web Development">Web Development</option>
          </select>
        </div>

        {/* HR or Director can add an enquiry */}
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Register New Enquiry
        </button>
      </div>

      {/* Main Table */}
      <div className="card">
        {loading ? (
          <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            Loading enquiries pipeline...
          </div>
        ) : error ? (
          <div style={{ color: 'var(--color-danger)', padding: '1rem' }}>{error}</div>
        ) : enquiries.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>
            <PhoneCall size={36} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>No enquiries or leads found matching criteria.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Enquirer Name</th>
                  <th>Contact Info</th>
                  <th>Interest Track</th>
                  <th>Status</th>
                  <th>Handled By</th>
                  <th>Next Follow-up</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map(enq => (
                  <tr key={enq.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{enq.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Registered: {formatDate(enq.created_at?.split(' ')[0] || enq.created_at)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{enq.phone}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{enq.email || '-'}</div>
                    </td>
                    <td>
                      <span className={`badge ${enq.interest === 'Data Science' ? 'badge-warning' : 'badge-info'}`}>
                        {enq.interest}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        enq.status === 'New' ? 'badge-danger' : 
                        enq.status === 'Callback' ? 'badge-warning' : 
                        enq.status === 'Enrolled' ? 'badge-success' : 'badge-secondary'
                      }`}>
                        {enq.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5' }}>
                        {enq.hr_name || 'Admin'}
                      </span>
                    </td>
                    <td>
                      {enq.status === 'Callback' && enq.next_follow_up_date ? (
                        <span style={{ fontWeight: 600, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                          <Calendar size={13} /> {formatDate(enq.next_follow_up_date)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {enq.notes || '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        {/* View Details Button */}
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }} 
                          title="Show Complete Enquiry Details"
                          onClick={() => openDetailModal(enq)}
                        >
                          <Eye size={13} /> View
                        </button>

                        {/* Follow up Button */}
                        <button 
                          className="btn btn-primary btn-sm" 
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }} 
                          title="Log Callback / Follow-up"
                          onClick={() => openFollowUpModal(enq)}
                        >
                          <Edit2 size={13} /> Follow-up
                        </button>

                        {/* Delete Button (HR & Director) */}
                        <button 
                          className="btn btn-danger btn-sm" 
                          style={{ padding: '4px 7px' }} 
                          title="Delete Enquiry"
                          onClick={() => handleDelete(enq.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enquiry Detail Dossier Modal (For Director & HR) */}
      {showDetailModal && selectedEnquiry && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px', borderRadius: '12px', padding: '1.5rem' }}>
            <div className="modal-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PhoneCall size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Enquiry Dossier</h3>
              </div>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-hover)', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Candidate Name</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{selectedEnquiry.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Lead Status</div>
                  <span className={`badge ${
                    selectedEnquiry.status === 'New' ? 'badge-danger' : 
                    selectedEnquiry.status === 'Callback' ? 'badge-warning' : 
                    selectedEnquiry.status === 'Enrolled' ? 'badge-success' : 'badge-secondary'
                  }`} style={{ marginTop: '4px', display: 'inline-block' }}>
                    {selectedEnquiry.status}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Phone Number</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '2px' }}>{selectedEnquiry.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Email Address</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '2px' }}>{selectedEnquiry.email || 'Not provided'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Interest Internship Track</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '2px' }}>{selectedEnquiry.interest}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Handled By (HR)</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#4f46e5', marginTop: '2px' }}>{selectedEnquiry.hr_name || 'Admin'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Registered On</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>{selectedEnquiry.created_at || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Next Callback Scheduled</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f59e0b', marginTop: '2px' }}>{formatDate(selectedEnquiry.next_follow_up_date)}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Discussion Notes & Query Details
                </div>
                <div style={{ 
                  background: 'var(--bg-surface)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '0.85rem', 
                  fontSize: '0.85rem', 
                  lineHeight: 1.5,
                  minHeight: '80px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedEnquiry.notes || 'No additional discussion notes entered for this enquiry.'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowDetailModal(false);
                    openFollowUpModal(selectedEnquiry);
                  }}
                >
                  <Edit2 size={14} /> Update Follow-up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Enquiry Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Register New Enquiry</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleAddEnquiry}>
              <div className="form-group">
                <label>Enquirer Name *</label>
                <input type="text" className="form-control" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Ramesh Patil" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input type="text" className="form-control" required value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="e.g. +91 99999 88888" />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" className="form-control" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="e.g. ramesh@gmail.com" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Interest Internship Track</label>
                  <select className="form-control" value={newInterest} onChange={(e) => setNewInterest(e.target.value)}>
                    <option value="Software Development">Software Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Web Development">Web Development</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Next Callback Date (Optional)</label>
                  <input type="date" className="form-control" value={newNextDate} onChange={(e) => setNewNextDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Enquiry Notes / Queries</label>
                <textarea className="form-control" rows="3" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Add specific questions, slot availability notes..." />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={addLoading}>
                {addLoading ? 'Saving...' : 'Register Enquiry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Follow-up Call Logger Modal */}
      {showFollowUpModal && selectedEnquiry && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Log Follow-up Call</h2>
              <button className="modal-close" onClick={() => setShowFollowUpModal(false)}>&times;</button>
            </div>

            <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div>Lead: <strong style={{ color: 'var(--color-primary)' }}>{selectedEnquiry.name}</strong> ({selectedEnquiry.phone})</div>
              <div style={{ color: 'var(--text-muted)' }}>Interest: {selectedEnquiry.interest} • Handled by: {selectedEnquiry.hr_name || 'Admin'}</div>
            </div>

            <form onSubmit={handleSaveFollowUp}>
              <div className="form-group">
                <label>Update Status</label>
                <select className="form-control" value={logStatus} onChange={(e) => setLogStatus(e.target.value)}>
                  <option value="New">New (Unattempted)</option>
                  <option value="Callback">Callback (Arrange Follow-up)</option>
                  <option value="Enrolled">Enrolled (Convert to Intern)</option>
                  <option value="Rejected">Rejected (Not Interested)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Follow-up Notes / Call Details</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  required 
                  value={logNotes} 
                  onChange={(e) => setLogNotes(e.target.value)} 
                  placeholder="Record callback results, interest details, slot preferences..." 
                />
              </div>

              {logStatus === 'Callback' && (
                <div className="form-group">
                  <label>Schedule Next Callback Date</label>
                  <input type="date" className="form-control" required value={logNextDate} onChange={(e) => setLogNextDate(e.target.value)} />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={logLoading}>
                {logLoading ? 'Saving Logs...' : 'Log Follow-up Call'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
