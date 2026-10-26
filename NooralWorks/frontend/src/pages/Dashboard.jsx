import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Users, 
  Calendar, 
  IndianRupee, 
  FolderLock, 
  CheckSquare,
  Clock,
  Play,
  Square,
  Activity,
  Briefcase,
  PhoneCall,
  Award,
  HelpCircle,
  Video,
  ExternalLink,
  Plus,
  Trash2,
  X
} from 'lucide-react';

// Timezone-safe time formatter (converts UTC / ISO strings accurately to local time)
function formatLogTime(ts) {
  if (!ts) return '-';
  let d;
  if (typeof ts === 'string') {
    if (ts.includes(' ') && !ts.endsWith('Z') && !ts.includes('+')) {
      d = new Date(ts.replace(' ', 'T') + 'Z');
    } else {
      d = new Date(ts);
    }
  } else {
    d = new Date(ts);
  }
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}

function formatLogDateTime(ts) {
  if (!ts) return '-';
  let d;
  if (typeof ts === 'string') {
    if (ts.includes(' ') && !ts.endsWith('Z') && !ts.includes('+')) {
      d = new Date(ts.replace(' ', 'T') + 'Z');
    } else {
      d = new Date(ts);
    }
  } else {
    d = new Date(ts);
  }
  if (isNaN(d.getTime())) return ts;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  return `${day}-${month}-${year} ${timeStr}`;
}

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Training Session Scheduling state (for Trainers)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [sessTopic, setSessTopic] = useState('');
  const [sessBatch, setSessBatch] = useState('All Assigned');
  const [sessDate, setSessDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessTime, setSessTime] = useState('11:00');
  const [sessDuration, setSessDuration] = useState('60');
  const [sessMeetingLink, setSessMeetingLink] = useState('');
  const [sessDescription, setSessDescription] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const stats = await api.getDashboard();
      setData(stats);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 12 seconds for HR and Director so live logins/clock-ins reflect immediately
    if (user?.role === 'HR' || user?.role === 'Director') {
      const interval = setInterval(() => {
        fetchDashboardData();
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await api.checkIn();
      await fetchDashboardData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await api.checkOut();
      await fetchDashboardData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleSession = async (e) => {
    e.preventDefault();
    if (!sessTopic.trim()) {
      alert('Please enter a session topic.');
      return;
    }
    setScheduleLoading(true);
    try {
      const res = await api.scheduleTrainingSession({
        topic: sessTopic.trim(),
        batch: sessBatch,
        date: sessDate,
        time: sessTime,
        duration: parseInt(sessDuration) || 60,
        meeting_link: sessMeetingLink ? sessMeetingLink.trim() : '',
        materials_link: sessMeetingLink ? sessMeetingLink.trim() : '',
        description: sessDescription ? sessDescription.trim() : ''
      });
      alert(`Training session scheduled successfully! Notified ${res.notifiedCount || 0} assigned intern(s).`);
      setShowScheduleModal(false);
      setSessTopic('');
      setSessMeetingLink('');
      setSessDescription('');
      await fetchDashboardData();
    } catch (err) {
      alert('Failed to schedule session: ' + err.message);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled training session?')) return;
    try {
      await api.deleteTrainingSession(sessionId);
      await fetchDashboardData();
    } catch (err) {
      alert('Failed to cancel session: ' + err.message);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard metrics...</div>;
  if (error) return <div style={{ color: 'var(--color-danger)' }}>{error}</div>;

  const role = user?.role;
  const stats = data?.stats || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ----------------- HR / DIRECTOR DASHBOARD ----------------- */}
      {(role === 'HR' || role === 'Director') && (
        <>
          <div className="stats-grid">
            <div 
              className="card stat-card clickable" 
              onClick={() => navigate('/interns')}
              title="Click to view all Active Interns"
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <span>Active Interns</span>
                <div className="stat-icon"><Users size={16} /></div>
              </div>
              <div className="stat-value">{stats.totalInterns}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Currently enrolled post-onboarding</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable" 
              onClick={() => navigate('/team-leads')}
              title="Click to view all Active Trainers"
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <span>Active Trainers</span>
                <div className="stat-icon"><Users size={16} /></div>
              </div>
              <div className="stat-value">{stats.totalMentors}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Providing instruction & review</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable" 
              onClick={() => navigate('/attendance')}
              title="Click to view Attendance Records"
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <span>Attendance Today</span>
                <div className="stat-icon"><Calendar size={16} /></div>
              </div>
              <div className="stat-value">{stats.attendanceRate}%</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Of active interns checked in</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable" 
              onClick={() => navigate('/fees')}
              title="Click to view Fee Collection"
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <span>Fees Collected</span>
                <div className="stat-icon"><IndianRupee size={16} /></div>
              </div>
              <div className="stat-value">₹{stats.feeCollected}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Out of ₹{(stats.feeCollected + stats.feeRemaining)} total</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable" 
              style={{ cursor: 'pointer' }} 
              onClick={() => navigate('/enquiries')}
              title="Click to view Leads & Enquiries"
            >
              <div className="stat-header">
                <span>Leads & Enquiries</span>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                  <PhoneCall size={16} />
                </div>
              </div>
              <div className="stat-value">{stats.totalEnquiries || 0}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{stats.newEnquiries || 0} New • {stats.callbackEnquiries || 0} Callbacks</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>
          </div>

          <div className="grid-split">
            <div className="card">
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} color="var(--color-secondary)" />
                Recent System Log
              </h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Action</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentActivities?.map(act => (
                      <tr key={act.id}>
                        <td style={{ fontWeight: 600 }}>{act.user_name}</td>
                        <td>
                          <span className={`badge ${act.user_role === 'HR' ? 'badge-warning' : act.user_role === 'Mentor' ? 'badge-info' : 'badge-success'}`}>
                            {act.user_role}
                          </span>
                        </td>
                        <td>{act.action}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {formatLogTime(act.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3>Attention Required</h3>
              
              <div 
                onClick={() => navigate('/documents')}
                title="Click to review Pending Documents"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '1rem', 
                  padding: '0.75rem', 
                  background: 'var(--bg-hover)', 
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: '1px solid transparent'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-secondary)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: 'var(--color-secondary)' }}>
                    <FolderLock size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Documents Verification</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stats.pendingDocs} pending review</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: 700 }}>Review →</span>
              </div>

              <div 
                onClick={() => navigate('/tasks')}
                title="Click to review Pending Tasks"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '1rem', 
                  padding: '0.75rem', 
                  background: 'var(--bg-hover)', 
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: '1px solid transparent'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' }}>
                    <CheckSquare size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tasks Awaiting Review</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stats.pendingTasks} pending review</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>Review →</span>
              </div>
            </div>
          </div>

          {/* Trainer Daily Sessions & Work Logs (Supervision for Director & HR) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                  <Award size={18} color="#3b82f6" />
                  Trainer Daily Sessions & Work Logs
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Live tracking of trainer sessions, schedules, attendance and today's work accomplishments
                </div>
              </div>
              <a href="/daily-logs" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Open Daily Logs →
              </a>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Trainer</th>
                    <th>Attendance</th>
                    <th>Session Timing</th>
                    <th>Work Summary & Focus</th>
                    <th>Hours Logged</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.trainerDailyLogs?.map(trainer => (
                    <tr key={trainer.user_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{trainer.trainer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{trainer.trainer_email}</div>
                      </td>
                      <td>
                        {trainer.check_in_time ? (
                          <div>
                            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                              {trainer.attendance_status || 'Present'}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              In: {trainer.check_in_time} {trainer.check_out_time ? `| Out: ${trainer.check_out_time}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                            Login Pending
                          </span>
                        )}
                      </td>
                      <td>
                        {trainer.session_timing ? (
                          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '0.75rem' }}>
                            {trainer.session_timing}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ maxWidth: '340px' }}>
                        {trainer.work_summary ? (
                          <div>
                            {trainer.title && (
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                                {trainer.title}
                              </div>
                            )}
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              {trainer.work_summary}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Log pending for today
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>
                          {trainer.hours_spent ? `${trainer.hours_spent} hrs` : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data?.trainerDailyLogs || data.trainerDailyLogs.length === 0) && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                        No active trainers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Director / HR Enquiries Pipeline Overview */}
          {data?.recentEnquiries && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                  <PhoneCall size={18} color="#2563eb" />
                  Enquiries
                </h3>
                <a href="/enquiries" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  View All →
                </a>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Candidate Name</th>
                      <th>Phone</th>
                      <th>Interest Track</th>
                      <th>Status</th>
                      <th>Handled By</th>
                      <th>Next Callback</th>
                      <th>Notes / Discussion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentEnquiries.map(enq => (
                      <tr key={enq.id}>
                        <td style={{ fontWeight: 600 }}>{enq.name}</td>
                        <td>{enq.phone}</td>
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
                        <td style={{ fontWeight: 600, color: '#4f46e5' }}>{enq.hr_name || 'Admin'}</td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {enq.next_follow_up_date || '-'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {enq.notes || '-'}
                        </td>
                      </tr>
                    ))}
                    {data.recentEnquiries.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No enquiries registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Director Authentication Audit Log */}
          {role === 'Director' && data?.loginActivities && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <FolderLock size={18} color="var(--color-primary)" />
                User Authentication Audit Log
              </h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Email ID</th>
                      <th>Role</th>
                      <th>Timestamp Log</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.loginActivities.map(act => (
                      <tr key={act.id}>
                        <td style={{ fontWeight: 600 }}>{act.user_name}</td>
                        <td>{act.user_email}</td>
                        <td>
                          <span className={`badge ${act.user_role === 'HR' ? 'badge-warning' : act.user_role === 'Mentor' ? 'badge-info' : 'badge-success'}`}>
                            {act.user_role}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {formatLogDateTime(act.timestamp)}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{act.details}</td>
                      </tr>
                    ))}
                    {data.loginActivities.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)', padding: '1rem' }}>No login activities recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ----------------- MENTOR DASHBOARD ----------------- */}
      {role === 'Mentor' && (
        <>
          <div className="stats-grid">
            <div 
              className="card stat-card clickable"
              onClick={() => navigate('/interns')}
              title="Click to view assigned interns"
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <span>My Interns</span>
                <div className="stat-icon"><Users size={16} /></div>
              </div>
              <div className="stat-value">{stats.myInternsCount}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Interns assigned to you</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable" 
              style={{ cursor: 'pointer' }} 
              onClick={() => navigate('/tasks')}
              title="Click to view tasks assigned by Director"
            >
              <div className="stat-header">
                <span>Tasks Assigned to Me</span>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)' }}>
                  <CheckSquare size={16} />
                </div>
              </div>
              <div className="stat-value">{stats.myAssignedTasksCount || 0}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{stats.myAssignedTasksTotal || 0} Total assigned by Director</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable"
              onClick={() => navigate('/tasks')}
              title="Click to review task submissions"
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <span>Task Reviews</span>
                <div className="stat-icon"><CheckSquare size={16} /></div>
              </div>
              <div className="stat-value">{stats.pendingTaskReviews}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Submissions awaiting feedback</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable"
              onClick={() => navigate('/daily-logs')}
              title="Click to view daily logs feedback"
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <span>Pending Log Feedback</span>
                <div className="stat-icon"><Clock size={16} /></div>
              </div>
              <div className="stat-value">{stats.pendingLogFeedbacks}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Logs submitted today with no notes</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable" 
              style={{ cursor: 'pointer' }} 
              onClick={() => navigate('/helpdesk')}
              title="Click to view intern queries"
            >
              <div className="stat-header">
                <span>Intern Queries</span>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <HelpCircle size={16} />
                </div>
              </div>
              <div className="stat-value">{stats.pendingQueriesCount || 0}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Queries from your assigned interns</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable" 
              style={{ cursor: 'pointer' }} 
              onClick={() => navigate('/placements')}
              title="Click to view mock assessments"
            >
              <div className="stat-header">
                <span>Mock Assessments</span>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  <Award size={16} />
                </div>
              </div>
              <div className="stat-value">{stats.myMockAssessmentsCount || 0}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Assigned intern mock tests & interviews</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>
          </div>

          {/* Dedicated Tasks Assigned to This Trainer by Director */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <CheckSquare size={18} color="var(--color-primary)" />
                Tasks Assigned to Me (from Director)
              </h3>
              <a href="/tasks" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                View All in Tasks →
              </a>
            </div>

            {data?.myAssignedTasks?.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                No active tasks assigned to you by Director.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Task Title</th>
                      <th>Priority</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Assigned By</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.myAssignedTasks?.map(task => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isOverdue = task.due_date < todayStr && task.status !== 'Completed';
                      const isDueToday = task.due_date === todayStr && task.status !== 'Completed';

                      return (
                        <tr key={task.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{task.title}</div>
                            {task.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {task.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${
                              task.priority === 'High' ? 'badge-danger' : 
                              task.priority === 'Medium' ? 'badge-warning' : 'badge-info'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 600, color: isOverdue ? 'var(--color-danger)' : isDueToday ? '#f59e0b' : 'inherit' }}>
                              {task.due_date}
                            </div>
                            {isOverdue && <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', fontWeight: 600 }}>Overdue</span>}
                            {isDueToday && <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>Due Today</span>}
                          </td>
                          <td>
                            <span className={`badge ${
                              task.status === 'Completed' ? 'badge-success' : 
                              task.status === 'Review' ? 'badge-warning' : 
                              task.status === 'In Progress' ? 'badge-info' : 'badge-danger'
                            }`}>
                              {task.status === 'Review' ? 'Under Review' : task.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>
                            <span className="badge badge-secondary" style={{ marginRight: '0.35rem' }}>{task.assigner_role || 'Director'}</span>
                            <span style={{ fontWeight: 500 }}>{task.assigner_name}</span>
                          </td>
                          <td>
                            {task.status === 'Pending' && (
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={async () => {
                                  try {
                                    await api.updateTaskStatus(task.id, 'In Progress');
                                    fetchDashboardData();
                                  } catch (e) {
                                    alert(e.message);
                                  }
                                }}
                              >
                                Start Task
                              </button>
                            )}
                            {task.status === 'In Progress' && (
                              <a href="/tasks" className="btn btn-sm btn-secondary">
                                Submit Work →
                              </a>
                            )}
                            {task.status === 'Review' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Under Review</span>
                            )}
                            {task.status === 'Completed' && (
                              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Completed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Dedicated Help Desk Queries Raised by Assigned Interns */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <HelpCircle size={18} color="#f59e0b" />
                Help Desk Queries Raised by My Interns
              </h3>
              <a href="/helpdesk" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                View All in Help Desk →
              </a>
            </div>

            {(!data?.myInternQueries || data?.myInternQueries?.length === 0) ? (
              <div style={{ color: 'var(--text-secondary)', padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                No queries raised by your assigned interns at this time.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Intern Name</th>
                      <th>Topic / Subject</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Raised On</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.myInternQueries?.map(q => {
                      const isResolved = q.status === 'Resolved' || q.status === 'Answered';
                      return (
                        <tr key={q.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                            {q.intern_name}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{q.subject}</div>
                            {q.query_text && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {q.query_text}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                              {q.category}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              q.priority === 'Urgent' ? 'badge-danger' : 
                              q.priority === 'High' ? 'badge-warning' : 
                              q.priority === 'Medium' ? 'badge-info' : 'badge-secondary'
                            }`}>
                              {q.priority}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              isResolved ? 'badge-success' : 
                              q.status === 'In Progress' ? 'badge-info' : 'badge-warning'
                            }`}>
                              {isResolved ? '✓ Resolved' : q.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(q.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <a href="/helpdesk" className="btn btn-sm btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              {isResolved ? 'View' : 'Solve / Answer'}
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid-split">
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>My Enrolled Interns</h3>
              {data?.myInterns?.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', padding: '1rem' }}>No interns assigned yet.</div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Training Slot</th>
                        <th>Technology</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.myInterns?.map(intern => (
                        <tr key={intern.id}>
                          <td style={{ fontWeight: 600 }}>{intern.name}</td>
                          <td>{intern.training_time || '09:00 AM - 01:00 PM'}</td>
                          <td><span className="badge badge-info">{intern.technology}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Briefcase size={18} color="var(--color-primary)" />
                  Upcoming Training Sessions
                </h3>
                <button 
                  className="btn btn-sm btn-primary" 
                  onClick={() => setShowScheduleModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={14} /> Schedule Training Session
                </button>
              </div>

              {data?.upcomingTrainings?.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                  No training sessions scheduled yet. Click <strong>+ Schedule Training Session</strong> to set a lecture and notify your assigned interns.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {data?.upcomingTrainings?.map(sess => (
                    <div key={sess.id} style={{ padding: '0.85rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{sess.topic || sess.title}</div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                              👥 {sess.attendee_count || 0} assigned interns
                            </span>
                          </div>
                        </div>
                        <button 
                          className="btn btn-sm btn-danger" 
                          onClick={() => handleDeleteSession(sess.id)}
                          title="Cancel session"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Trash2 size={12} /> Cancel
                        </button>
                      </div>

                      {sess.description && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.4rem', fontStyle: 'italic' }}>
                          {sess.description}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                        <span>📅 {sess.date} at {sess.time} ({sess.duration}m)</span>
                        {sess.meeting_link && (
                          <a href={sess.meeting_link} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Video size={12} /> Join Link
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ----------------- INTERN DASHBOARD ----------------- */}
      {role === 'Intern' && (
        <>
          {/* Attendance Check-in & Check-out Register Console */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid rgba(99, 102, 241, 0.25)', boxShadow: '0 4px 20px -2px rgba(79, 70, 229, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)' }}>
                  <Clock size={18} />
                </div>
                Daily Attendance Terminal
              </h3>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', background: '#ffffff', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
                Session: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ minWidth: '220px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Today's Status</div>
                <div style={{ margin: '0.35rem 0' }}>
                  <span className={`badge ${
                    stats.attendanceToday === 'Present' || stats.attendanceToday === 'Late' 
                      ? 'badge-success' 
                      : stats.attendanceToday === 'Leave' 
                        ? 'badge-warning' 
                        : 'badge-secondary'
                  }`} style={{ fontSize: '1rem', padding: '0.4rem 1rem', fontWeight: 700 }}>
                    <span className="pulse-dot" style={{ backgroundColor: stats.attendanceToday === 'Present' ? '#10b981' : '#f59e0b', boxShadow: stats.attendanceToday === 'Present' ? '0 0 8px #10b981' : '0 0 8px #f59e0b' }} />
                    {stats.attendanceToday}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <span>Check In: <strong style={{ color: 'var(--text-primary)' }}>{stats.checkInTime ? formatLogTime(stats.checkInTime) : 'Not Checked In'}</strong></span>
                  <span>Check Out: <strong style={{ color: 'var(--text-primary)' }}>{stats.checkOutTime ? formatLogTime(stats.checkOutTime) : (stats.checkInTime ? 'Pending Check Out' : '—')}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Check In Button - Enabled freshly when user has not checked in */}
                  {!stats.checkInTime ? (
                    <button className="btn btn-primary" onClick={handleCheckIn} disabled={actionLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem' }}>
                      <Play size={16} /> Check In Now
                    </button>
                  ) : (
                    <button className="btn" disabled style={{ opacity: 0.9, cursor: 'default', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontWeight: 700, padding: '0.65rem 1.25rem' }}>
                      ✓ Checked In ({formatLogTime(stats.checkInTime)})
                    </button>
                  )}

                  {/* Check Out Button - Enabled after check in, disabled before check in */}
                  {stats.checkInTime && !stats.checkOutTime ? (
                    <button className="btn btn-danger" onClick={handleCheckOut} disabled={actionLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem' }}>
                      <Square size={16} /> Check Out Now
                    </button>
                  ) : stats.checkInTime && stats.checkOutTime ? (
                    <button className="btn" disabled style={{ opacity: 0.9, cursor: 'default', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', fontWeight: 700, padding: '0.65rem 1.25rem' }}>
                      ✓ Checked Out ({formatLogTime(stats.checkOutTime)})
                    </button>
                  ) : (
                    <button 
                      className="btn btn-secondary" 
                      disabled 
                      title="Please check in first to enable check out" 
                      style={{ opacity: 0.55, cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
                    >
                      <Square size={16} /> Check Out
                    </button>
                  )}
                </div>

                {stats.checkInTime && stats.checkOutTime && (
                  <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    ✓ Shift complete for today. Thank you for your work!
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="stats-grid">
            <div 
              className="card stat-card clickable"
              onClick={() => navigate('/tasks')}
              title="Click to view pending tasks"
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <span>Pending Tasks</span>
                <div className="stat-icon"><CheckSquare size={16} /></div>
              </div>
              <div className="stat-value">{stats.tasksPending}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Awaiting your action</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable"
              onClick={() => navigate('/tasks')}
              title="Click to view completed tasks"
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <span>Completed Tasks</span>
                <div className="stat-icon"><CheckSquare size={16} color="var(--color-success)" /></div>
              </div>
              <div className="stat-value">{stats.tasksCompleted}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Reviewed and approved</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable"
              onClick={() => navigate('/documents')}
              title="Click to view documents"
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <span>Documents Verified</span>
                <div className="stat-icon"><FolderLock size={16} /></div>
              </div>
              <div className="stat-value">{stats.docsApproved} / {stats.docsTotal}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Syllabus paperwork verified</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>

            <div 
              className="card stat-card clickable"
              onClick={() => navigate('/fees')}
              title="Click to view fee status"
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-header">
                <span>Remaining Fees</span>
                <div className="stat-icon"><IndianRupee size={16} /></div>
              </div>
              <div className="stat-value">₹{stats.feeRemaining}</div>
              <div className="stat-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Status: {stats.feeStatus}</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 700 }}>Open →</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={18} color="var(--color-primary)" />
              Next Scheduled Training Session
            </h3>
            {data?.nextSessions?.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', padding: '1.5rem', textAlign: 'center', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                No training sessions scheduled yet for your training track.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {data?.nextSessions?.map(sess => (
                  <div key={sess.id} style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {sess.topic || sess.title || sess.course_title}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Trainer: <strong style={{ color: 'var(--text-primary)' }}>{sess.mentor_name || 'Assigned Trainer'}</strong>
                    </div>

                    {sess.description && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '4px' }}>
                        {sess.description}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)' }}>
                      <span>📅 {sess.date}</span>
                      <span>⏰ {sess.time} ({sess.duration} min)</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {sess.meeting_link && (
                        <a href={sess.meeting_link} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          <Video size={13} /> Join Session
                        </a>
                      )}
                      {sess.materials_link && sess.materials_link !== sess.meeting_link && (
                        <a href={sess.materials_link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          <ExternalLink size={13} /> Materials
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal for Scheduling Training Session (for Trainer) */}
      {showScheduleModal && (
        <div className="modal-backdrop" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} color="var(--color-primary)" />
                Schedule Training Session
              </h3>
              <button 
                onClick={() => setShowScheduleModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleScheduleSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Session Topic / Subject *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Deep Learning & CNN Architecture with PyTorch"
                  value={sessTopic}
                  onChange={e => setSessTopic(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Target Audience</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value="All Assigned Interns" 
                    disabled 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Duration (Minutes)</label>
                  <input 
                    type="number" 
                    min="15" 
                    step="15"
                    className="form-control" 
                    value={sessDuration}
                    onChange={e => setSessDuration(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Date *</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={sessDate}
                    onChange={e => setSessDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Time *</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={sessTime}
                    onChange={e => setSessTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Meeting / Video Call Link (Google Meet / Zoom)</label>
                <input 
                  type="url" 
                  className="form-control" 
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={sessMeetingLink}
                  onChange={e => setSessMeetingLink(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Agenda / Syllabus Notes</label>
                <textarea 
                  className="form-control" 
                  rows={3}
                  placeholder="Topics to be covered, prerequisites, or assignment prep..."
                  value={sessDescription}
                  onChange={e => setSessDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowScheduleModal(false)}
                  disabled={scheduleLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={scheduleLoading}
                >
                  {scheduleLoading ? 'Scheduling...' : 'Confirm & Notify Interns'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
