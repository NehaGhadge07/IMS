import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { CheckSquare, Plus, Calendar, AlertCircle, FileText, Send, Check, X, Award, Clock, Star } from 'lucide-react';

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [mockAssessments, setMockAssessments] = useState([]);
  const [taskViewTab, setTaskViewTab] = useState('all'); // 'all', 'tasks', 'mocks'
  const [interns, setInterns] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // New Task Form State
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tAssigneeType, setTAssigneeType] = useState(user?.role === 'Director' ? 'HR' : 'Intern');
  const [tAssignedTo, setTAssignedTo] = useState('');
  const [tAssignedMentor, setTAssignedMentor] = useState('');
  const [tDueDate, setTDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [tPriority, setTPriority] = useState('Medium');
  const [assignLoading, setAssignLoading] = useState(false);

  // Submit Task Form State
  const [sDesc, setSDesc] = useState('');
  const [sLink, setSLink] = useState('');
  const [sMarkCompleted, setSMarkCompleted] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Review Task Form State
  const [rDecision, setRDecision] = useState('Approved');
  const [rFeedback, setRFeedback] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Filters (Director/HR/Mentor)
  const [filterAssignee, setFilterAssignee] = useState(''); // 'intern_ID' or 'mentor_ID'
  const [filterStatus, setFilterStatus] = useState('');

  const fetchTasks = async () => {
    try {
      const params = {};
      if (filterAssignee) {
        if (filterAssignee.startsWith('intern_')) {
          params.intern_id = filterAssignee.replace('intern_', '');
        } else if (filterAssignee.startsWith('mentor_')) {
          params.mentor_id = filterAssignee.replace('mentor_', '');
        }
      }
      if (filterStatus) {
        params.status = filterStatus;
      }
      const data = await api.getTasks(params);
      setTasks(data);
    } catch (err) {
      setError(err.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMocks = async () => {
    try {
      const data = await api.getMockAssessments();
      setMockAssessments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load mock assessments:', e);
    }
  };

  const fetchInternsAndMentors = async () => {
    try {
      if (user?.role === 'Director') {
        const staffData = await api.getStaff();
        setMentors(staffData);
        setTAssigneeType('HR');
        const hrStaff = staffData.filter(s => s.technology === 'HR' || s.role === 'HR');
        if (hrStaff.length > 0) {
          setTAssignedMentor(hrStaff[0].user_id.toString());
        } else if (staffData.length > 0) {
          setTAssignedMentor(staffData[0].user_id.toString());
        }
      } else {
        const internsData = await api.getInterns();
        setInterns(internsData);
        if (internsData.length > 0) setTAssignedTo(internsData[0].id.toString());

        const mentorsData = await api.getMentors();
        setMentors(mentorsData);
        const filteredMentors = mentorsData.filter(m => m.role === 'Mentor' || m.technology === 'Mentor');
        if (filteredMentors.length > 0) setTAssignedMentor(filteredMentors[0].user_id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchMocks();
    // Auto-mark task & mock notifications as read
    api.markCategoryNotificationsRead('tasks').catch(() => {});

    const interval = setInterval(() => {
      fetchTasks();
      fetchMocks();
    }, 12000);
    return () => clearInterval(interval);
  }, [filterAssignee, filterStatus]);

  useEffect(() => {
    if (user?.role !== 'Intern') {
      fetchInternsAndMentors();
    }
  }, [user]);

  const handleAssignTask = async (e) => {
    e.preventDefault();
    setAssignLoading(true);
    try {
      const payload = {
        title: tTitle,
        description: tDesc,
        due_date: tDueDate,
        priority: tPriority
      };

      if (user?.role === 'Director') {
        if (!tAssignedMentor) {
          throw new Error('Please select an HR or Trainer assignee.');
        }
        payload.assigned_mentor_id = parseInt(tAssignedMentor);
      } else {
        if (tAssigneeType === 'Intern') {
          payload.assigned_to = parseInt(tAssignedTo);
        } else {
          payload.assigned_mentor_id = parseInt(tAssignedMentor);
        }
      }

      await api.assignTask(payload);
      setShowAssignModal(false);
      setTTitle('');
      setTDesc('');
      fetchTasks();
    } catch (err) {
      alert(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      await api.updateTaskStatus(taskId, 'In Progress');
      fetchTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCompleteTask = async (taskId) => {
    if (!window.confirm('Mark this task as completed? Your assigned trainer will be notified.')) return;
    try {
      await api.updateTaskStatus(taskId, 'Completed');
      fetchTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  const openSubmitModal = (task) => {
    setSelectedTask(task);
    setSMarkCompleted(false);
    setShowSubmitModal(true);
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitLoading(true);
    try {
      await api.submitTask(selectedTask.id, {
        update_description: sDesc,
        submission_link: sLink,
        mark_completed: sMarkCompleted
      });
      setShowSubmitModal(false);
      setSDesc('');
      setSLink('');
      setSMarkCompleted(false);
      fetchTasks();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const openReviewModal = (task) => {
    setSelectedTask(task);
    setShowReviewModal(true);
  };

  const handleReviewTask = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    setReviewLoading(true);
    try {
      await api.reviewTask(selectedTask.id, {
        decision: rDecision,
        feedback: rFeedback
      });
      setShowReviewModal(false);
      setRFeedback('');
      fetchTasks();
    } catch (err) {
      alert(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const isHR = user?.role === 'HR' || user?.role === 'Director';
  const isHRorMentor = user?.role === 'HR' || user?.role === 'Director' || user?.role === 'Mentor';
  const isIntern = user?.role === 'Intern';
  const upcomingMock = mockAssessments.find(m => m.status === 'Scheduled');

  const columns = [
    { title: 'Pending', status: 'Pending', badgeClass: 'badge-danger' },
    { title: 'In Progress', status: 'In Progress', badgeClass: 'badge-info' },
    { title: 'In Review', status: 'Review', badgeClass: 'badge-warning' },
    { title: 'Completed', status: 'Completed', badgeClass: 'badge-success' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Action Header and Filters */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Track task assignments, deadlines, and project submissions.</p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isHRorMentor && (
            <>
              <select
                className="form-control btn-sm"
                style={{ width: '220px' }}
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
              >
                <option value="">All Assignees</option>
                {user?.role === 'Director' ? (
                  <>
                    <optgroup label="HR Personnel">
                      {mentors
                        .filter(m => m.technology === 'HR' || m.role === 'HR')
                        .map(m => (
                          <option key={m.user_id} value={`mentor_${m.user_id}`}>{m.name} (HR)</option>
                        ))}
                    </optgroup>
                    <optgroup label="Trainers">
                      {mentors
                        .filter(m => m.technology === 'Mentor' || m.role === 'Mentor')
                        .map(m => (
                          <option key={m.user_id} value={`mentor_${m.user_id}`}>{m.name} (Trainer)</option>
                        ))}
                    </optgroup>
                  </>
                ) : user?.role === 'Mentor' ? (
                  <>
                    <option value={`mentor_${user.id}`}>Tasks Assigned to Me (from Director)</option>
                    <optgroup label="My Assigned Interns">
                      {interns.map(i => (
                        <option key={i.id} value={`intern_${i.id}`}>{i.name}</option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  <>
                    <optgroup label="Interns">
                      {interns.map(i => (
                        <option key={i.id} value={`intern_${i.id}`}>{i.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Trainers">
                      {mentors.map(m => (
                        <option key={m.user_id} value={`mentor_${m.user_id}`}>{m.name}</option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
              {isHRorMentor && (
                <button className="btn btn-primary" onClick={() => {
                  if (user?.role === 'Director') {
                    setTAssigneeType('HR');
                    const hrStaff = mentors.filter(m => m.technology === 'HR' || m.role === 'HR');
                    if (hrStaff.length > 0) setTAssignedMentor(hrStaff[0].user_id.toString());
                  }
                  setShowAssignModal(true);
                }}>
                  <Plus size={16} /> Assign Task
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Upcoming Mock Test & Assessment Notification Banner ── */}
      {upcomingMock && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              <Award size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                  Upcoming {upcomingMock.type}: {upcomingMock.focus_areas || 'Technical Assessment'}
                </strong>
                <span className="badge badge-warning" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Clock size={11} /> Scheduled Assessment
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Scheduled for: <strong>{upcomingMock.scheduled_at}</strong> &bull; Trainer: <strong>{upcomingMock.interviewer_name || 'Assigned Trainer'}</strong>
                {upcomingMock.intern_name ? ` &bull; Candidate: ${upcomingMock.intern_name}` : ''}
              </div>
            </div>
          </div>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => setTaskViewTab(taskViewTab === 'mocks' ? 'all' : 'mocks')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
          >
            {taskViewTab === 'mocks' ? 'Show All Tasks' : 'View Assessment Details'}
          </button>
        </div>
      )}

      {/* ── View Filter Tabs: All Board, Sprint Tasks, Mock Tests ── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          className={`btn btn-sm ${taskViewTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTaskViewTab('all')}
          style={{ fontWeight: 600, fontSize: '0.8rem' }}
        >
          All Tasks &amp; Assessments ({tasks.length + mockAssessments.length})
        </button>
        <button 
          className={`btn btn-sm ${taskViewTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTaskViewTab('tasks')}
          style={{ fontWeight: 600, fontSize: '0.8rem' }}
        >
          Sprint Tasks ({tasks.length})
        </button>
        <button 
          className={`btn btn-sm ${taskViewTab === 'mocks' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTaskViewTab('mocks')}
          style={{ fontWeight: 600, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <Award size={14} /> Mock Tests &amp; Assessments ({mockAssessments.length})
        </button>
      </div>

      {/* ── Mock Tests & Technical Interview Assessments Section ── */}
      {(taskViewTab === 'all' || taskViewTab === 'mocks') && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} color="var(--color-primary)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                Mock Tests &amp; Technical Interview Assessments
              </h3>
              <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>{mockAssessments.length}</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              {isIntern ? 'Scheduled by your trainer to evaluate technical competencies and interview readiness.' : 'Evaluate technical competencies and mock assessment scores.'}
            </p>
          </div>

          {mockAssessments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No mock tests or assessments scheduled yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {mockAssessments.map(mock => {
                const isCompleted = mock.status === 'Completed';

                return (
                  <div
                    key={mock.id}
                    className="card"
                    style={{
                      margin: 0,
                      padding: '1rem 1.15rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-hover)',
                      borderLeft: `4px solid ${isCompleted ? '#10b981' : '#f59e0b'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.6rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '4px' }}>
                        <span className="badge badge-purple" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Award size={11} /> {mock.type || 'Mock Assessment'}
                        </span>
                        {isCompleted ? (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Check size={11} /> Evaluated {mock.score !== null ? `(${mock.score}/10)` : ''}
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} /> Scheduled
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {mock.focus_areas || 'Technical Mock Assessment'}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div>Scheduled Date: <strong>{mock.scheduled_at}</strong></div>
                        <div>Trainer / Evaluator: <strong>{mock.interviewer_name || 'Assigned Mentor'}</strong></div>
                        {!isIntern && mock.intern_name && (
                          <div>Intern: <strong>{mock.intern_name}</strong></div>
                        )}
                      </div>

                      {mock.feedback && (
                        <div style={{ fontSize: '0.78rem', background: 'var(--bg-card)', padding: '0.5rem 0.65rem', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                          <strong>Trainer Feedback:</strong> &ldquo;{mock.feedback}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Loading task board...</div>
      ) : error ? (
        <div style={{ color: 'var(--color-danger)' }}>{error}</div>
      ) : (taskViewTab === 'all' || taskViewTab === 'tasks') && (
        /* Task Board Columns */
        <div className="task-column-grid">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.status);
            return (
              <div key={col.status} className="task-column">
                <div className="task-column-header">
                  <span>{col.title}</span>
                  <span className={`badge ${col.badgeClass}`}>{colTasks.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '60vh' }}>
                  {colTasks.map(task => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const tomorrowDate = new Date();
                    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

                    const isDueTomorrow = task.due_date === tomorrowStr && task.status !== 'Completed';
                    const isDueToday = task.due_date === todayStr && task.status !== 'Completed';
                    const isOverdue = task.due_date < todayStr && task.status !== 'Completed';

                    const isAssignedToCurrentUser = (task.assigned_mentor_id && task.assigned_mentor_id === user?.id) || (isIntern && (!task.assigned_mentor_id));
                    const canReview = (user?.role === 'Director') || (user?.role === 'HR' && task.assigned_mentor_id !== user?.id) || (user?.role === 'Mentor' && task.assigned_mentor_id !== user?.id);

                    return (
                      <div
                        key={task.id}
                        className="task-card"
                        style={isDueTomorrow ? { borderColor: 'rgba(245, 158, 11, 0.45)', boxShadow: '0 0 10px rgba(245, 158, 11, 0.08)' } : {}}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '4px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className={`badge ${
                              task.priority === 'High' ? 'badge-danger' : task.priority === 'Medium' ? 'badge-warning' : 'badge-success'
                            }`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                              {task.priority}
                            </span>
                            {isDueTomorrow && (
                              <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', fontSize: '0.68rem', padding: '0.1rem 0.4rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                ⏰ Due Tomorrow (1 Day Left)
                              </span>
                            )}
                            {isDueToday && (
                              <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', fontWeight: 600 }}>
                                🚨 Due Today
                              </span>
                            )}
                            {isOverdue && (
                              <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', opacity: 0.85 }}>
                                Overdue
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: isDueTomorrow ? '#f59e0b' : (isDueToday || isOverdue) ? 'var(--color-danger)' : 'var(--text-muted)', fontWeight: (isDueTomorrow || isDueToday) ? 600 : 400 }}>
                            Due: {task.due_date}
                          </span>
                        </div>

                        <div className="task-card-title">{task.title}</div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {task.description}
                        </p>

                        {/* Assigned details */}
                        {isIntern ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div>
                              Assigned by:{' '}
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                {task.assigner_name ? `${task.assigner_name} (Trainer)` : 'Assigned Trainer'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>
                              Assignee:{' '}
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                {task.assigned_mentor_id ? (
                                  `${task.mentor_name} (${task.mentor_role === 'HR' || task.mentor_tech === 'HR' ? 'HR' : 'Trainer'})`
                                ) : (
                                  `${task.intern_name || 'Intern'}`
                                )}
                              </span>
                            </div>
                            {task.assigner_name && (
                              <div>
                                Assigned by:{' '}
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                  {task.assigner_name}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action buttons inside card */}
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem', display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {isAssignedToCurrentUser && task.status === 'Pending' && (
                            <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleStartTask(task.id)}>
                                Start Task
                              </button>
                              <button className="btn btn-success btn-sm" style={{ flex: 1, gap: '0.2rem', justifyContent: 'center' }} onClick={() => handleCompleteTask(task.id)}>
                                <Check size={12} /> Complete
                              </button>
                            </div>
                          )}
                          {isAssignedToCurrentUser && task.status === 'In Progress' && (
                            <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                              <button className="btn btn-primary btn-sm" style={{ flex: 1, gap: '0.25rem', justifyContent: 'center' }} onClick={() => openSubmitModal(task)}>
                                <Send size={12} /> Submit Work
                              </button>
                              <button className="btn btn-success btn-sm" style={{ flex: 1, gap: '0.2rem', justifyContent: 'center' }} onClick={() => handleCompleteTask(task.id)}>
                                <Check size={12} /> Complete
                              </button>
                            </div>
                          )}
                          {isAssignedToCurrentUser && task.status === 'Review' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%', justifyContent: 'center' }}>
                              ⏳ Submitted for Review
                            </span>
                          )}
                          {canReview && task.status === 'Review' && (
                            <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => openReviewModal(task)}>
                              Review Submission
                            </button>
                          )}
                          {task.status === 'Completed' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%', justifyContent: 'center', fontWeight: 600 }}>
                              <Check size={12} /> Task Completed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Task Modal */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Assign Task</h2>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleAssignTask}>
              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={tTitle}
                  onChange={(e) => setTTitle(e.target.value)}
                  placeholder={user?.role === 'Director' ? "e.g. Conduct HR Review / Prepare Training Module" : "e.g. Develop backend APIs"}
                />
              </div>

              <div className="form-group">
                <label>Task Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  required
                  value={tDesc}
                  onChange={(e) => setTDesc(e.target.value)}
                  placeholder="Describe requirements and criteria of acceptance..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Assignee Type</label>
                  <select
                    className="form-control"
                    value={tAssigneeType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTAssigneeType(val);
                      if (val === "HR") {
                        const hrStaff = mentors.filter(m => m.technology === "HR" || m.role === "HR");
                        if (hrStaff.length > 0) setTAssignedMentor(hrStaff[0].user_id.toString());
                        else setTAssignedMentor("");
                      } else if (val === "Trainer") {
                        const trainers = mentors.filter(m => m.technology === "Mentor" || m.role === "Mentor");
                        if (trainers.length > 0) setTAssignedMentor(trainers[0].user_id.toString());
                        else setTAssignedMentor("");
                      } else if (val === "Mentor") {
                        const mentorsList = mentors.filter(m => m.role === "Mentor" || m.technology === "Mentor");
                        if (mentorsList.length > 0) setTAssignedMentor(mentorsList[0].user_id.toString());
                        else setTAssignedMentor("");
                      }
                    }}
                  >
                    {user?.role === 'Director' ? (
                      <>
                        <option value="HR">HR</option>
                        <option value="Trainer">Trainer</option>
                      </>
                    ) : (
                      <>
                        <option value="Intern">Intern</option>
                        {user?.role === 'HR' && <option value="Mentor">Trainer</option>}
                      </>
                    )}
                  </select>
                </div>

                {tAssigneeType === "Intern" && user?.role !== 'Director' ? (
                  <div className="form-group">
                    <label>Assign to Intern</label>
                    <select className="form-control" value={tAssignedTo} onChange={(e) => setTAssignedTo(e.target.value)}>
                      {interns.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.technology})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>
                      {tAssigneeType === "HR" ? "Assign to HR" : "Assign to Trainer"}
                    </label>
                    <select className="form-control" value={tAssignedMentor} onChange={(e) => setTAssignedMentor(e.target.value)}>
                      {mentors
                        .filter(m => {
                          if (tAssigneeType === "HR") return m.technology === "HR" || m.role === "HR";
                          if (tAssigneeType === "Trainer") return m.technology === "Mentor" || m.role === "Mentor";
                          if (tAssigneeType === "Mentor") return m.role === "Mentor" || m.technology === "Mentor";
                          return true;
                        })
                        .map(m => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.name} ({m.technology === "HR" || m.role === "HR" ? "HR" : "Trainer"})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={tDueDate}
                    onChange={(e) => setTDueDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    className="form-control"
                    value={tPriority}
                    onChange={(e) => setTPriority(e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={assignLoading}>
                {assignLoading ? 'Assigning...' : 'Assign Task'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Submit Task Modal */}
      {showSubmitModal && selectedTask && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Submit Task Work</h2>
              <button className="modal-close" onClick={() => setShowSubmitModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleSubmitTask}>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Task: </strong> {selectedTask.title}
              </div>

              <div className="form-group">
                <label>Description of Completed Work</label>
                <textarea className="form-control" rows="4" required value={sDesc} onChange={(e) => setSDesc(e.target.value)} placeholder="Provide short overview of what was built/resolved..." />
              </div>

              <div className="form-group">
                <label>Submission Link (e.g. GitHub Pull Request or Document Link)</label>
                <input type="url" className="form-control" value={sLink} onChange={(e) => setSLink(e.target.value)} placeholder="https://github.com/.../pull/1" />
              </div>

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={sMarkCompleted}
                    onChange={(e) => setSMarkCompleted(e.target.checked)}
                  />
                  <span>Mark task as Completed immediately (Notify Trainer)</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={submitLoading}>
                {submitLoading ? 'Saving...' : (sMarkCompleted ? 'Complete Task & Notify Trainer' : 'Submit for Review')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Review Task Modal */}
      {showReviewModal && selectedTask && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Review Task Submission</h2>
              <button className="modal-close" onClick={() => setShowReviewModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleReviewTask}>
              <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div><strong>Task Title:</strong> {selectedTask.title}</div>
                {selectedTask.updates && selectedTask.updates.length > 0 && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                    <div><strong>Submission details:</strong></div>
                    <div style={{ margin: '4px 0', fontStyle: 'italic' }}>"{selectedTask.updates[0].update_description}"</div>
                    {selectedTask.updates[0].submission_link && (
                      <div><a href={selectedTask.updates[0].submission_link} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>View Work Link</a></div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Review Decision</label>
                <select className="form-control" value={rDecision} onChange={(e) => setRDecision(e.target.value)}>
                  <option value="Approved">Approve Task (Mark Completed)</option>
                  <option value="Rejected">Reject Task (Request Modifications)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Feedback Comments</label>
                <textarea className="form-control" rows="3" required value={rFeedback} onChange={(e) => setRFeedback(e.target.value)} placeholder="Provide engineering feedback, necessary tweaks..." />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={reviewLoading}>
                {reviewLoading ? 'Saving Review...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
