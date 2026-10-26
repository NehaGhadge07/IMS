import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { UserPlus, Search, User, Filter, ArrowRight, Eye, EyeOff, Users, Award, CalendarCheck, CheckCircle2 } from 'lucide-react';

export default function InternsList({ user }) {
  const navigate = useNavigate();
  const [interns, setInterns] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [trainerFilter, setTrainerFilter] = useState('');
  const [slotFilter, setSlotFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showInternPwd, setShowInternPwd] = useState(false);
  const [formTrainingTime, setFormTrainingTime] = useState('09:00 AM - 01:00 PM');
  const [formMentor, setFormMentor] = useState('');
  const [formJoinDate, setFormJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [formFeeTotal, setFormFeeTotal] = useState('15000');
  const [formFeeDueDate, setFormFeeDueDate] = useState('');
  const [formPosition, setFormPosition] = useState('Software Development');
  const [formDuration, setFormDuration] = useState('6');
  const [formLoading, setFormLoading] = useState(false);

  const fetchInterns = async () => {
    try {
      const data = await api.getInterns({
        search,
        mentor_id: trainerFilter,
        slot: slotFilter,
        technology: techFilter,
        status: statusFilter
      });
      setInterns(data);
    } catch (err) {
      setError(err.message || 'Failed to load interns list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMentors = async () => {
    try {
      const data = await api.getMentors();
      setMentors(data);
      const filtered = data.filter(m => m.role === 'Mentor');
      if (filtered.length > 0 && !formMentor) setFormMentor(filtered[0].user_id.toString());
    } catch (err) {
      console.error('Failed to load mentors:', err);
    }
  };

  useEffect(() => {
    fetchInterns();
  }, [search, trainerFilter, slotFilter, techFilter, statusFilter]);

  useEffect(() => {
    fetchMentors();
  }, []);

  const handleAddIntern = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const data = {
        name: formName,
        email: formEmail,
        password: formPassword,
        training_time: formTrainingTime,
        mentor_id: formMentor ? parseInt(formMentor) : null,
        joining_date: formJoinDate,
        fee_total: parseFloat(formFeeTotal) || 0,
        fee_due_date: formFeeDueDate || formJoinDate,
        position: formPosition,
        duration: formDuration
      };

      await api.createIntern(data);
      setShowModal(false);
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setFormMentor(mentors.length > 0 ? mentors[0].user_id.toString() : '');
      setFormJoinDate(new Date().toISOString().split('T')[0]);
      setFormFeeTotal('15000');
      setFormFeeDueDate('');
      fetchInterns();
    } catch (err) {
      alert('Error creating intern: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const isHR = user?.role === 'HR' || user?.role === 'Director';
  const isMentor = user?.role === 'Mentor';

  // Stats for Mentor view
  const totalAssigned = interns.length;
  const presentTodayCount = interns.filter(r => r.attendance_status_today === 'Present' || r.attendance_status_today === 'Late').length;
  const activeCount = interns.filter(r => r.status === 'Active').length;
  const totalMockCount = interns.reduce((sum, r) => sum + (r.mock_count || 0), 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      {isMentor ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>My Assigned Interns</h1>
              <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                Trainer Module
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
              Monitor training progress, punch attendance, daily work logs, and mock assessments for all interns assigned to your mentorship.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Interns Directory</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
              Institutional roster of registered interns across technologies, departments, and mentoring tracks.
            </p>
          </div>
          {isHR && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <UserPlus size={16} /> Add Intern Record
            </button>
          )}
        </div>
      )}

      {/* Trainer Stats Overview */}
      {isMentor && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div 
            className="stat-card clickable"
            onClick={() => setStatusFilter('')}
            title="Click to show all assigned interns"
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)' }}>
              <Users size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Assigned Interns</span>
              <span className="stat-value">{totalAssigned}</span>
            </div>
          </div>

          <div 
            className="stat-card clickable"
            onClick={() => navigate('/attendance')}
            title="Click to view Attendance tab"
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
              <CalendarCheck size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Present Today</span>
              <span className="stat-value">{presentTodayCount}</span>
            </div>
          </div>

          <div 
            className="stat-card clickable"
            onClick={() => setStatusFilter(statusFilter === 'Active' ? '' : 'Active')}
            title="Click to filter Active interns"
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-info)' }}>
              <CheckCircle2 size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Active in Training</span>
              <span className="stat-value">{activeCount}</span>
            </div>
          </div>

          <div 
            className="stat-card clickable"
            onClick={() => setShowMockModal(true)}
            title="Click to manage Mock Assessments"
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
              <Award size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Mock Assessments</span>
              <span className="stat-value">{totalMockCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Filter Tabs for Mentors */}
      {isMentor && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${!statusFilter ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('')}
            style={{ borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
          >
            All Assigned ({totalAssigned})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'Active' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(statusFilter === 'Active' ? '' : 'Active')}
            style={{ borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
          >
            Active Only
          </button>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'Completed' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(statusFilter === 'Completed' ? '' : 'Completed')}
            style={{ borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
          >
            Completed
          </button>
        </div>
      )}

      {/* Filters & Actions Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '2.5rem' }} 
              placeholder="Search by name, email, technology..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {!isMentor && (
            <select
              className="form-control"
              style={{ minWidth: '170px' }}
              value={trainerFilter}
              onChange={(e) => setTrainerFilter(e.target.value)}
            >
              <option value="">All Assigned Trainers</option>
              {mentors.filter(m => m.role === 'Mentor').map(m => (
                <option key={m.user_id} value={m.user_id}>{m.name}</option>
              ))}
            </select>
          )}

          <select className="form-control" style={{ width: '180px' }} value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)}>
            <option value="">All Training Slots</option>
            <option value="09:00 AM - 01:00 PM">09:00 AM - 01:00 PM</option>
            <option value="02:00 PM - 06:00 PM">02:00 PM - 06:00 PM</option>
          </select>

          <select className="form-control" style={{ width: '180px' }} value={techFilter} onChange={(e) => setTechFilter(e.target.value)}>
            <option value="">All Technologies</option>
            <option value="Software Development">Software Development</option>
            <option value="Data Science">Data Science</option>
            <option value="Web Development">Web Development</option>
          </select>

          <select className="form-control" style={{ width: '130px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Terminated">Terminated</option>
          </select>

          {(search || trainerFilter || slotFilter || techFilter || statusFilter) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setTrainerFilter('');
                setSlotFilter('');
                setTechFilter('');
                setStatusFilter('');
              }}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              title="Reset all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Interns Table */}
      <div className="card">
        {loading ? (
          <div style={{ color: 'var(--text-secondary)', padding: '1.5rem', textAlign: 'center' }}>Loading assigned interns...</div>
        ) : error ? (
          <div style={{ color: 'var(--color-danger)', padding: '1.5rem' }}>{error}</div>
        ) : interns.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2.5rem' }}>
            <Users size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4, display: 'block' }} />
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>No interns found.</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {isMentor ? 'No interns are currently assigned to you matching the filter criteria.' : 'No interns found matching filter settings.'}
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Intern Name</th>
                  <th>Training Slot</th>
                  {!isMentor && <th>Trainer</th>}
                  <th>Technology</th>
                  <th>Attendance Today</th>
                  {isMentor ? <th>Mock Assessments</th> : <th>Fee Status</th>}
                  <th>Docs Status</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {interns.map(row => (
                  <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/interns/${row.id}`)}>
                    <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: 'none', height: '100%' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                        <User size={15} />
                      </div>
                      <div>
                        <div>{row.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.email}</div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {row.training_time || '09:00 AM - 01:00 PM'}
                      </span>
                    </td>
                    {!isMentor && (
                      <td>{row.mentor_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>}</td>
                    )}
                    <td>
                      <span className={`badge ${
                        row.technology?.toLowerCase().includes('data') ? 'badge-warning' :
                        row.technology?.toLowerCase().includes('web') ? 'badge-success' : 'badge-info'
                      }`}>
                        {row.technology}
                      </span>
                    </td>
                    <td>
                      {row.attendance_status_today === 'Present' ? (
                        <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                          Present {row.check_in_today ? `(${row.check_in_today.slice(0, 5)})` : ''}
                        </span>
                      ) : row.attendance_status_today === 'Late' ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                          Late ({row.check_in_today ? row.check_in_today.slice(0, 5) : 'In'})
                        </span>
                      ) : row.attendance_status_today === 'Half Day' ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                          Half Day
                        </span>
                      ) : row.attendance_status_today === 'Leave' ? (
                        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                          On Leave
                        </span>
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                          Not Punched
                        </span>
                      )}
                    </td>
                    {isMentor ? (
                      <td>
                        {row.mock_count > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge badge-success" style={{ fontSize: '0.75rem', width: 'fit-content' }}>
                              {row.mock_count} Evaluated
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Avg Score: <strong>{row.mock_avg_score ?? '—'} / 10</strong>
                            </span>
                          </div>
                        ) : (
                          <span className="badge badge-secondary" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                            0 Scheduled
                          </span>
                        )}
                      </td>
                    ) : (
                      <td>
                        {row.fee_status === 'Fully Paid' ? (
                          <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                            Fully Paid
                          </span>
                        ) : row.fee_status === 'Partially Paid' ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                            ₹{row.fee_remaining?.toLocaleString() || 0} Due
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                            ₹{row.fee_remaining?.toLocaleString() || 0} Pending
                          </span>
                        )}
                      </td>
                    )}
                    <td>
                      {row.docs_pending > 0 ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                          {row.docs_pending} Review Due
                        </span>
                      ) : row.docs_count > 0 ? (
                        <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                          {row.docs_count} Verified
                        </span>
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                          0 Uploaded
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${row.status === 'Active' ? 'badge-success' : row.status === 'Completed' ? 'badge-info' : 'badge-danger'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/interns/${row.id}`);
                        }}
                      >
                        <Eye size={13} /> {isMentor ? 'Dossier' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Intern Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Add New Intern Profile</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleAddIntern}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-control" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Full Name" />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" className="form-control" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email Address" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showInternPwd ? 'text' : 'password'}
                      className="form-control"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Password"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <span
                      onClick={() => setShowInternPwd(!showInternPwd)}
                      style={{
                        position: 'absolute', right: '10px', top: '50%',
                        transform: 'translateY(-50%)', cursor: 'pointer',
                        color: 'var(--text-muted)', display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showInternPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Training Slot</label>
                  <select className="form-control" value={formTrainingTime} onChange={(e) => setFormTrainingTime(e.target.value)}>
                    <option value="09:00 AM - 01:00 PM">09:00 AM - 01:00 PM</option>
                    <option value="02:00 PM - 06:00 PM">02:00 PM - 06:00 PM</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Assign Trainer</label>
                  <select className="form-control" value={formMentor} onChange={(e) => setFormMentor(e.target.value)}>
                    <option value="">No Trainer</option>
                    {mentors.filter(m => m.role === 'Mentor').map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Joining Date</label>
                  <input type="date" className="form-control" required value={formJoinDate} onChange={(e) => setFormJoinDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Training Fee (₹)</label>
                  <input type="number" className="form-control" value={formFeeTotal} onChange={(e) => setFormFeeTotal(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Fee Due Date</label>
                  <input type="date" className="form-control" value={formFeeDueDate} onChange={(e) => setFormFeeDueDate(e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Technology Track</label>
                  <select className="form-control" value={formPosition} onChange={(e) => setFormPosition(e.target.value)}>
                    <option value="Software Development">Software Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Web Development">Web Development</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Duration (Months)</label>
                  <input type="number" min="1" max="24" className="form-control" required value={formDuration} onChange={(e) => setFormDuration(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={formLoading}>
                {formLoading ? 'Saving...' : 'Add Intern Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
