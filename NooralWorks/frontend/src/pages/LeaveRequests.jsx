import React, { useEffect, useState } from 'react';
import { CalendarDays, Check, Clock3, Plus, X, Bell, Info } from 'lucide-react';
import api from '../services/api';

const badgeClass = (status) => ({
  Approved: 'badge-success',
  Rejected: 'badge-danger',
  Pending: 'badge-warning',
  Cancelled: 'badge-info'
}[status] || 'badge-info');

export default function LeaveRequests({ user }) {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [form, setForm] = useState({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' });

  const isDirector = user.role === 'Director';
  const canReview = user.role === 'Director' || user.role === 'HR';
  const canViewQueue = ['HR', 'Director'].includes(user.role);

  const load = async () => {
    try {
      setLoading(true);
      setRequests(await api.getLeaveRequests(status ? { status } : {}));
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, user.role]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createLeaveRequest(form);
      alert(res.message || (isDirector ? 'Leave notice recorded and notified to HR successfully.' : 'Leave request submitted for approval.'));
      setForm({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const review = async (id, decision) => {
    const notes = window.prompt(`Optional note for this ${decision.toLowerCase()} decision:`) || '';
    setReviewing(id);
    try {
      await api.reviewLeaveRequest(id, decision, notes);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setReviewing(null);
    }
  };

  const cancel = async (id) => {
    const confirmMsg = isDirector
      ? 'Cancel this scheduled leave notice?'
      : 'Cancel this pending leave request?';
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.cancelLeaveRequest(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '.25rem' }}>
            {isDirector ? 'Executive Leave & Absence Notice' : 'Leave Centre'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
            {isDirector
              ? 'Notify HR of your planned leaves or absence. Executive leaves are recorded immediately without approval requirements.'
              : 'Submit time-off requests and keep approval decisions in one auditable place.'}
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          onClick={() => setShowForm(!showForm)}
        >
          {isDirector ? (
            <>
              <Bell size={17} /> Notify Leave to HR
            </>
          ) : (
            <>
              <Plus size={17} /> Request Leave
            </>
          )}
        </button>
      </div>

      {/* Leave Notification / Request Form */}
      {showForm && (
        <form className="card" onSubmit={submit}>
          <h3 style={{ marginBottom: isDirector ? '0.5rem' : '1.25rem' }}>
            {isDirector ? 'Notify Planned Leave to HR' : 'New Leave Request'}
          </h3>

          <div className="form-row">
            <div className="form-group">
              <label>Leave type</label>
              <select
                className="form-control"
                value={form.leave_type}
                onChange={e => setForm({ ...form, leave_type: e.target.value })}
              >
                {['Casual', 'Sick', 'Emergency', 'Work From Home', 'Other'].map(v => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Start date</label>
              <input
                required
                type="date"
                className="form-control"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>End date</label>
              <input
                required
                type="date"
                min={form.start_date || undefined}
                className="form-control"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Reason</label>
            <textarea
              required
              rows="3"
              className="form-control"
              placeholder={isDirector ? "Briefly describe leave purpose or key delegate during absence..." : "Briefly explain the request..."}
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button disabled={submitting} className="btn btn-primary">
              {submitting
                ? (isDirector ? 'Notifying HR…' : 'Submitting…')
                : (isDirector ? 'Notify HR & Record Leave' : 'Submit Request')}
            </button>
          </div>
        </form>
      )}

      {/* Leave Queue / Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>
              {canViewQueue ? 'Leave Requests' : 'My Leave Records'}
            </h3>
          </div>
          <select
            className="form-control"
            style={{ width: '170px' }}
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {['Pending', 'Approved', 'Rejected', 'Cancelled'].map(v => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', padding: '2rem 0' }}>Loading leave records…</p>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
            <CalendarDays size={28} style={{ marginBottom: '.5rem', opacity: 0.5 }} />
            <p>No leave records match this view.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  {canViewQueue && <th>Employee / Role</th>}
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(item => {
                  const isItemDirector = item.employee_role === 'Director';
                  const isMyRecord = item.user_id === user.id;

                  return (
                    <tr key={item.id}>
                      {canViewQueue && (
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong>{item.employee_name}</strong>
                            <span className={`badge ${
                              item.employee_role === 'Director' ? 'badge-primary' :
                              item.employee_role === 'Mentor' ? 'badge-info' :
                              item.employee_role === 'HR' ? 'badge-warning' :
                              'badge-secondary'
                            }`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                              {item.employee_role === 'Mentor' ? 'Trainer' : item.employee_role}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{item.employee_email}</div>
                        </td>
                      )}
                      <td>
                        <strong>{item.leave_type}</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>
                          {item.total_days} day{item.total_days !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td>
                        {item.start_date} <span style={{ color: 'var(--text-muted)' }}>to</span> {item.end_date}
                      </td>
                      <td>{item.reason}</td>
                      <td>
                        {isItemDirector && item.status === 'Approved' ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Check size={12} /> Approved (Notice)
                          </span>
                        ) : (
                          <span className={`badge ${badgeClass(item.status)}`}>{item.status}</span>
                        )}
                        {item.review_notes && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '.75rem', marginTop: '.25rem' }}>
                            {item.review_notes}
                          </div>
                        )}
                      </td>
                      <td>
                        {isItemDirector ? (
                          /* Director leaves: NO approval or rejection allowed for anyone */
                          isMyRecord && item.status !== 'Cancelled' ? (
                            <button className="btn btn-secondary btn-sm" onClick={() => cancel(item.id)}>
                              Cancel Notice
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '.78rem', fontStyle: 'italic' }}>
                              Executive Notice (No approval needed)
                            </span>
                          )
                        ) : isDirector && item.employee_role === 'Intern' ? (
                          /* Director CANNOT approve intern leaves (only Trainer and HR leaves) */
                          <span style={{ color: 'var(--text-muted)', fontSize: '.78rem', fontStyle: 'italic' }}>
                            Managed by HR / Mentor
                          </span>
                        ) : (
                          /* Standard approvals for HR, Mentors, and Director for Trainers/HR */
                          canReview && item.status === 'Pending' && !isMyRecord ? (
                            <div style={{ display: 'flex', gap: '.4rem' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={reviewing === item.id}
                                onClick={() => review(item.id, 'Approved')}
                              >
                                <Check size={14} /> Approve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                disabled={reviewing === item.id}
                                onClick={() => review(item.id, 'Rejected')}
                              >
                                <X size={14} /> Reject
                              </button>
                            </div>
                          ) : isMyRecord && item.status === 'Pending' ? (
                            <button className="btn btn-secondary btn-sm" onClick={() => cancel(item.id)}>
                              Cancel
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>
                              {item.reviewed_by_name ? `by ${item.reviewed_by_name}` : <Clock3 size={15} />}
                            </span>
                          )
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
    </div>
  );
}
