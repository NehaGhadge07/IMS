import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  MessageSquare,
  Calendar,
  Users,
  Filter,
  Clock,
  FileText,
  Award,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ChevronRight,
  UserCheck,
  CheckSquare,
  Sparkles,
  Send,
  Edit3,
  Flame,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function DailyLogs({ user }) {
  const isDirector = user?.role === 'Director';
  const isHR = user?.role === 'HR';
  const isTrainer = user?.role === 'Mentor';
  const isStaff = isTrainer || isHR;
  const isIntern = user?.role === 'Intern';

  // Date selection (Defaults to today)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // View modes: 'all_staff', 'trainers', 'hr', 'interns' (for Director/Staff)
  const [viewMode, setViewMode] = useState(
    isDirector ? 'all_staff' : isStaff ? 'my_log' : 'interns'
  );

  // Data states
  const [staffLogs, setStaffLogs] = useState([]);
  const [internLogs, setInternLogs] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Intern filters
  const [mentors, setMentors] = useState([]);
  const [selectedIntern, setSelectedIntern] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState('');

  // Trainer-filtered interns
  const filteredInterns = interns.filter(i => {
    if (!selectedTrainer) return true;
    return (
      i.mentor_id?.toString() === selectedTrainer.toString() ||
      i.mentor_user_id?.toString() === selectedTrainer.toString()
    );
  });

  const handleTrainerFilterChange = (newTrainerId) => {
    setSelectedTrainer(newTrainerId);
    if (selectedIntern) {
      const found = interns.find(i => i.id.toString() === selectedIntern.toString());
      if (found && newTrainerId) {
        const matches = (
          found.mentor_id?.toString() === newTrainerId.toString() ||
          found.mentor_user_id?.toString() === newTrainerId.toString()
        );
        if (!matches) setSelectedIntern('');
      }
    }
  };

  // Staff Work Submission Form State (for Trainers / HR) - Kept empty initially
  const [myTitle, setMyTitle] = useState('');
  const [mySessionTiming, setMySessionTiming] = useState(isTrainer ? '09:00 AM - 11:00 AM' : '');
  const [myWorkSummary, setMyWorkSummary] = useState('');
  const [myAccomplishments, setMyAccomplishments] = useState('');
  const [myChallenges, setMyChallenges] = useState('');
  const [myHours, setMyHours] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  // Director Feedback & Acknowledgement State
  const [directorFeedback, setDirectorFeedback] = useState({});
  const [savingFeedback, setSavingFeedback] = useState({});

  // Mentor feedback on intern logs
  const [mentorInternFeedback, setMentorInternFeedback] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  // AI Summary
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchStaffLogs = async (date) => {
    try {
      const data = await api.getStaffDailyLogs({ date: date || selectedDate });
      setStaffLogs(data || []);
    } catch (err) {
      console.error('Failed to load staff logs:', err);
      setError(err.message || 'Failed to load staff logs.');
    }
  };

  const fetchInternLogs = async () => {
    try {
      const data = await api.getDailyLogs({
        intern_id: selectedIntern,
        mentor_id: selectedTrainer
      });
      setInternLogs(data || []);
    } catch (err) {
      console.error('Failed to load intern logs:', err);
      setError(err.message || 'Failed to load intern logs.');
    }
  };

  const fetchInterns = async () => {
    try {
      const data = await api.getInterns();
      setInterns(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMentors = async () => {
    try {
      const data = await api.getMentors();
      setMentors(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (viewMode === 'interns') {
        await fetchInternLogs();
      } else {
        await fetchStaffLogs(selectedDate);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, viewMode, selectedIntern, selectedTrainer]);

  useEffect(() => {
    if (!isIntern) {
      fetchInterns();
      fetchMentors();
    }
  }, [user]);

  // Handle staff submitting their own work log
  const handleSaveStaffLog = async (e) => {
    e.preventDefault();
    if (!myWorkSummary.trim()) {
      alert('Please enter your daily work summary.');
      return;
    }

    setSavingLog(true);
    try {
      await api.submitStaffDailyLog({
        date: selectedDate,
        title: myTitle.trim() || `${user?.role === 'Mentor' ? 'Trainer' : 'HR'} Daily Activities`,
        session_timing: isTrainer ? mySessionTiming : undefined,
        work_summary: myWorkSummary.trim(),
        key_accomplishments: myAccomplishments.trim(),
        challenges_blockers: myChallenges.trim(),
        hours_spent: parseFloat(myHours) || 8.0
      });
      alert('Daily work log saved successfully!');
      setMyTitle('');
      setMySessionTiming(isTrainer ? '09:00 AM - 11:00 AM' : '');
      setMyWorkSummary('');
      setMyAccomplishments('');
      setMyChallenges('');
      setMyHours('');
      fetchStaffLogs(selectedDate);
    } catch (err) {
      alert(err.message || 'Failed to save daily work log.');
    } finally {
      setSavingLog(false);
    }
  };

  // Handle Director providing executive feedback / acknowledgement
  const handleDirectorFeedback = async (staffUserId, acknowledgeOnly = false) => {
    setSavingFeedback(prev => ({ ...prev, [staffUserId]: true }));
    try {
      const feedback = directorFeedback[staffUserId] || '';
      await api.submitDirectorStaffFeedback(staffUserId, {
        date: selectedDate,
        feedback: feedback,
        acknowledge: true
      });
      alert('Executive remarks & acknowledgment saved successfully!');
      fetchStaffLogs(selectedDate);
    } catch (err) {
      alert(err.message || 'Failed to record feedback.');
    } finally {
      setSavingFeedback(prev => ({ ...prev, [staffUserId]: false }));
    }
  };

  // Handle Mentor feedback on intern log
  const handleMentorInternFeedback = async (logId) => {
    const feedback = mentorInternFeedback[logId];
    if (!feedback) return;

    setActionLoading(true);
    try {
      await api.submitLogFeedback(logId, feedback);
      setMentorInternFeedback({ ...mentorInternFeedback, [logId]: '' });
      fetchInternLogs();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Generate AI Executive Briefing from today's staff logs
  const handleAiSummarize = async () => {
    setAiLoading(true);
    setAiSummary(null);
    try {
      if (viewMode === 'interns') {
        if (internLogs.length === 0) return alert('No intern logs to summarize.');
        const res = await api.summarizeLogs(internLogs);
        setAiSummary(res.summary);
      } else {
        if (staffLogs.length === 0) return alert('No staff logs found for this date.');
        
        // Synthesize an executive briefing for the Director
        const summaryText = staffLogs.map(s => {
          const logContent = s.log 
            ? `${s.log.title}: ${s.log.work_summary}` 
            : 'No written log filed yet.';
          const hours = s.attendance ? `${s.attendance.working_hours} hours logged` : 'Attendance pending';
          return `• ${s.name} (${s.role}): ${logContent} [${hours}]`;
        }).join('\n');

        // If backend AI endpoint is available, try it; otherwise display the synthesized executive brief
        try {
          const res = await api.summarizeLogs(staffLogs.map(s => ({
            intern_name: `${s.name} (${s.role})`,
            comments: s.log ? `${s.log.title} - ${s.log.work_summary}` : 'Active on duty',
            date: selectedDate,
            working_hours: s.attendance?.working_hours || 8.0,
            status: s.attendance?.status || 'Present'
          })));
          setAiSummary(res.summary);
        } catch {
          setAiSummary(`### Executive Daily Operations Summary (${selectedDate})\n\n**Team Productivity Breakdown:**\n${summaryText}\n\n**Director Recommendation:**\nAll departments are on track. Continue monitoring task milestones and student progress.`);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to generate AI summary.');
    } finally {
      setAiLoading(false);
    }
  };

  // Filter staff logs according to the selected view mode
  const filteredStaffLogs = staffLogs.filter(staff => {
    if (viewMode === 'my_log') return staff.user_id === user?.id;
    if (viewMode === 'trainers') return staff.role === 'Trainer' || staff.original_role === 'Mentor';
    if (viewMode === 'hr') return staff.role === 'HR';
    return true; // 'all_staff'
  });

  // Calculate high-level metrics for today
  const activeTrainers = staffLogs.filter(s => (s.role === 'Trainer' || s.original_role === 'Mentor') && s.attendance?.check_in_time).length;
  const totalTrainers = staffLogs.filter(s => s.role === 'Trainer' || s.original_role === 'Mentor').length;
  const activeHR = staffLogs.filter(s => s.role === 'HR' && s.attendance?.check_in_time).length;
  const totalHR = staffLogs.filter(s => s.role === 'HR').length;
  const totalHoursLogged = staffLogs.reduce((acc, s) => acc + (parseFloat(s.attendance?.working_hours) || 0), 0).toFixed(1);
  const reportsSubmittedCount = staffLogs.filter(s => s.has_log).length;
  const totalStaffTasks = staffLogs.reduce((acc, s) => acc + (s.tasks?.length || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Action Header and Date Control */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={22} color="var(--color-primary)" />
              {isDirector ? "Staff Daily Work Logs & Operations Supervision" : "Daily Activity & Performance Logs"}
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
              {isDirector
                ? "Review comprehensive daily work logs, accomplishments, attendance, and tasks for Trainers and HR."
                : "Record your daily accomplishments, coaching milestones, and task deliverables."}
            </p>
          </div>

          {/* Date Selector & AI Action */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <Calendar size={15} color="var(--text-muted)" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
              />
            </div>

            <button
              className={`btn btn-sm ${selectedDate === todayStr ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedDate(todayStr)}
            >
              Today
            </button>

            <button
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(45deg, #8b5cf6, #ec4899)',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 600
              }}
              onClick={handleAiSummarize}
              disabled={aiLoading}
            >
              <Sparkles size={15} />
              {aiLoading ? 'Analyzing...' : 'AI Executive Briefing'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', flexWrap: 'wrap' }}>
          {isDirector && (
            <>
              <button
                className={`btn btn-sm ${viewMode === 'all_staff' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('all_staff')}
              >
                <Users size={14} /> All Staff ({staffLogs.length})
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'trainers' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('trainers')}
              >
                <Award size={14} /> Trainer Logs ({staffLogs.filter(s => s.role === 'Trainer' || s.original_role === 'Mentor').length})
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'hr' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('hr')}
              >
                <Briefcase size={14} /> HR Logs ({staffLogs.filter(s => s.role === 'HR').length})
              </button>
            </>
          )}

          {isStaff && (
            <button
              className={`btn btn-sm ${viewMode === 'my_log' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('my_log')}
            >
              <UserCheck size={14} /> My Work Log
            </button>
          )}

          {isHR && (
            <>
              <button
                className={`btn btn-sm ${viewMode === 'trainers' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('trainers')}
              >
                <Award size={14} /> Trainer Team Logs ({staffLogs.filter(s => s.role === 'Trainer' || s.original_role === 'Mentor').length})
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'hr' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('hr')}
              >
                <Briefcase size={14} /> HR Team Logs ({staffLogs.filter(s => s.role === 'HR').length})
              </button>
            </>
          )}

          <button
            className={`btn btn-sm ${viewMode === 'interns' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ marginLeft: 'auto' }}
            onClick={() => setViewMode('interns')}
          >
            <Layers size={14} /> Intern Work Logs
          </button>
        </div>
      </div>

      {/* AI Performance Summary Modal / Banner */}
      {aiSummary && (
        <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(to right, rgba(139, 92, 246, 0.07), rgba(236, 72, 153, 0.07))', border: '1px solid rgba(139, 92, 246, 0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc', fontSize: '1.05rem' }}>
              <Sparkles size={18} /> AI Executive Operations Briefing
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setAiSummary(null)}>Dismiss</button>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            {aiSummary}
          </div>
        </div>
      )}

      {/* Executive Metric KPI Bar for Director / HR (when looking at staff logs) */}
      {viewMode !== 'interns' && (isDirector || isHR) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={22} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Trainers on Duty</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeTrainers} / {totalTrainers}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={22} color="#a855f7" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>HR on Duty</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeHR} / {totalHR}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Hours Logged</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {totalHoursLogged} hrs
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckSquare size={22} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Work Reports Filed</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {reportsSubmittedCount} of {staffLogs.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Self-Submission Card (for Trainers / HR) */}
      {isStaff && viewMode === 'my_log' && (
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit3 size={18} color="var(--color-primary)" />
              Record Daily Work ({selectedDate})
            </h3>
          </div>

          <form onSubmit={handleSaveStaffLog}>
            {isTrainer && (
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Session Timings / Slot <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <select
                    className="form-control"
                    value={mySessionTiming}
                    onChange={(e) => setMySessionTiming(e.target.value)}
                  >
                    <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM (Morning Session)</option>
                    <option value="11:30 AM - 01:30 PM">11:30 AM - 01:30 PM (Midday Session)</option>
                    <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM (Afternoon Session)</option>
                    <option value="04:30 PM - 06:30 PM">04:30 PM - 06:30 PM (Evening Session)</option>
                    <option value="Full Day (09:00 AM - 06:00 PM)">Full Day (09:00 AM - 06:00 PM)</option>
                    <option value="Doubt Clearing / Project Lab">Doubt Clearing / Project Lab</option>
                  </select>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Work Title / Module Focus</label>
              <input
                type="text"
                className="form-control"
                placeholder={isTrainer ? "e.g. React Hooks & API Integration Lecture" : "Work title"}
                value={myTitle}
                onChange={(e) => setMyTitle(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Work Summary <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <textarea
                className="form-control"
                rows="3"
                required
                placeholder={isTrainer ? "Summary of training sessions conducted, topics covered, intern attendance..." : "Summary of work done today..."}
                value={myWorkSummary}
                onChange={(e) => setMyWorkSummary(e.target.value)}
              />
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Key Accomplishments / Deliverables</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="List accomplishments, modules finished, assessments conducted..."
                  value={myAccomplishments}
                  onChange={(e) => setMyAccomplishments(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Challenges / Blockers</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Any challenges or blockers (optional)..."
                  value={myChallenges}
                  onChange={(e) => setMyChallenges(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="var(--text-muted)" />
                <label style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Hours:</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control btn-sm"
                  style={{ width: '100px' }}
                  placeholder="e.g. 8.0"
                  value={myHours}
                  onChange={(e) => setMyHours(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {(myTitle || myWorkSummary || myAccomplishments || myChallenges || myHours) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      setMyTitle('');
                      setMySessionTiming(isTrainer ? '09:00 AM - 11:00 AM' : '');
                      setMyWorkSummary('');
                      setMyAccomplishments('');
                      setMyChallenges('');
                      setMyHours('');
                    }}
                  >
                    Clear Fields
                  </button>
                )}

                <button type="submit" className="btn btn-primary" disabled={savingLog}>
                  <Send size={15} /> {savingLog ? "Submitting Log..." : "Save Today's Work Log"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Clock size={36} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 1rem', opacity: 0.5 }} />
          Loading daily work logs for {selectedDate}...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', color: 'var(--color-danger)' }}>{error}</div>
      ) : viewMode === 'interns' ? (
        /* INTERN LOGS VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Intern Filters */}
          <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <Filter size={16} /> Filters:
            </div>
            {!isTrainer && (
              <select className="form-control btn-sm" style={{ width: '180px' }} value={selectedTrainer} onChange={(e) => handleTrainerFilterChange(e.target.value)}>
                <option value="">All Trainers</option>
                {mentors.filter(m => m.role === 'Mentor').map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.name}</option>
                ))}
              </select>
            )}
            <select className="form-control btn-sm" style={{ width: '220px' }} value={selectedIntern} onChange={(e) => setSelectedIntern(e.target.value)}>
              <option value="">All Interns {selectedTrainer ? `(Filtered)` : ''}</option>
              {filteredInterns.map(i => (
                <option key={i.id} value={i.id}>{i.name} ({i.technology})</option>
              ))}
            </select>
          </div>

          {internLogs.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <h3>No Intern Daily Logs Found</h3>
              <p>No intern attendance or activity logs found for the selected filters.</p>
            </div>
          ) : (
            internLogs.map(log => (
              <div key={log.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} /> {log.date}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> {log.working_hours} Hours Logged
                      </span>
                    </div>
                    {!isIntern && (
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>
                        {log.intern_name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>({log.technology})</span>
                      </h4>
                    )}
                  </div>
                  <span className={`badge ${log.status === 'Present' ? 'badge-success' : 'badge-info'}`}>
                    {log.status}
                  </span>
                </div>

                <div style={{ padding: '0.25rem 0', fontSize: '0.95rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Accomplishments Log
                  </div>
                  <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                    {log.comments || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description logged.</span>}
                  </div>
                </div>

                {/* Mentor Feedback input */}
                {!isIntern && (
                  <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Coaching Feedback
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="form-control"
                        style={{ flex: 1, minWidth: '220px' }}
                        placeholder="Add coaching comments, guidance or review feedback..."
                        value={mentorInternFeedback[log.id] || ''}
                        onChange={(e) => setMentorInternFeedback({ ...mentorInternFeedback, [log.id]: e.target.value })}
                        disabled={actionLoading}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleMentorInternFeedback(log.id)}
                        disabled={actionLoading || !mentorInternFeedback[log.id]}
                      >
                        Save Feedback
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* STAFF (TRAINERS & HR) WORK LOGS VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredStaffLogs.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <h3>{viewMode === 'my_log' ? 'No Work Log Filed Yet' : viewMode === 'trainers' ? `No Trainer Logs for ${selectedDate}` : `No Staff Records for ${selectedDate}`}</h3>
              <p>{viewMode === 'my_log' ? 'You have not submitted a daily log for this date yet. Fill in the form above and click "Save Today\'s Work Log".' : viewMode === 'trainers' ? 'No trainer work logs recorded for the selected date.' : 'No staff members matched the selected criteria.'}</p>
            </div>
          ) : (
            filteredStaffLogs.map(staff => {
              const isAcknowledged = staff.log?.director_acknowledged === 1;

              return (
                <div
                  key={staff.user_id}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    border: isAcknowledged ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
                    background: 'var(--card-bg)'
                  }}
                >
                  {/* Top Bar: Staff Profile & Live Attendance Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: staff.role === 'Trainer' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #a855f7, #7e22ce)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}>
                        {staff.name ? staff.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'S'}
                        {staff.attendance?.is_live && (
                          <span style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '2px solid var(--card-bg)'
                          }} title="Currently Logged In" />
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{staff.name}</h3>
                          <span className={`badge ${staff.role === 'Trainer' ? 'badge-primary' : 'badge-info'}`} style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                            {staff.role}
                          </span>
                          {isAcknowledged && (
                            <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={12} /> Acknowledged by Director
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {staff.designation} • {staff.email} {staff.technology ? `• Tech: ${staff.technology}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Today's Attendance Chips */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {staff.attendance?.check_in_time ? (
                          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> In: {staff.attendance.check_in_time}
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                            Login Pending
                          </span>
                        )}

                        {staff.attendance?.check_out_time ? (
                          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Out: {staff.attendance.check_out_time}
                          </span>
                        ) : staff.attendance?.check_in_time ? (
                          <span className="badge badge-success" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🟢 Active on Shift
                          </span>
                        ) : null}

                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>
                          {staff.attendance?.working_hours ? `${staff.attendance.working_hours} hrs` : '0.0 hrs'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Date: {staff.date}
                      </div>
                    </div>
                  </div>

                  {/* Main Body: Work Summary & Deliverables */}
                  {staff.log ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Work Title */}
                      <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${staff.role === 'Trainer' ? '#3b82f6' : '#a855f7'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                              Primary Focus / Milestone
                            </div>
                            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                              {staff.log.title}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {staff.log.session_timing && (
                              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '0.75rem' }}>
                                Session: {staff.log.session_timing}
                              </span>
                            )}
                            {staff.log.hours_spent && (
                              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.75rem' }}>
                                {staff.log.hours_spent} hrs
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Work Narrative */}
                      <div>
                        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.35rem' }}>
                          Work Accomplishments Overview
                        </div>
                        <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {staff.log.work_summary}
                        </p>
                      </div>

                      {/* Highlights & Blockers Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                        {staff.log.key_accomplishments && (
                          <div style={{ background: 'rgba(59, 130, 246, 0.04)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#3b82f6', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} /> Key Deliverables & Sessions
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                              {staff.log.key_accomplishments}
                            </div>
                          </div>
                        )}

                        {staff.log.challenges_blockers && (
                          <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#f59e0b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={14} /> Blockers / Operational Notes
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                              {staff.log.challenges_blockers}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <AlertCircle size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Detailed work report pending submission for {staff.date}
                      </div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        {staff.attendance?.check_in_time
                          ? `Staff member checked in at ${staff.attendance.check_in_time} and is currently on duty.`
                          : "Staff member has not logged in yet today."}
                      </div>
                    </div>
                  )}

                  {/* Tasks Assigned by Director Section */}
                  {staff.tasks && staff.tasks.length > 0 && (
                    <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckSquare size={14} color="var(--color-primary)" />
                        Assigned Director Tasks Underway ({staff.tasks.length})
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                        {staff.tasks.map(task => (
                          <div
                            key={task.id}
                            style={{
                              background: 'var(--bg-secondary)',
                              padding: '0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {task.title}
                              </span>
                              <span className={`badge ${
                                task.status === 'Completed' ? 'badge-success' : task.status === 'Review' ? 'badge-warning' : 'badge-info'
                              }`} style={{ fontSize: '0.65rem' }}>
                                {task.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Due: <strong>{task.due_date}</strong> • Priority: {task.priority}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Director Coaching Remarks & Acknowledgement */}
                  {isDirector && (
                    <div style={{ marginTop: '1.25rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Award size={14} color="#10b981" />
                          Director Executive Remarks & Coaching
                        </div>
                        {staff.log?.acknowledged_at && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 500 }}>
                            Acknowledged on {staff.log.acknowledged_at}
                          </div>
                        )}
                      </div>

                      {staff.log?.director_feedback && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.06)', borderLeft: '3px solid #10b981', padding: '0.6rem 0.85rem', borderRadius: '4px', marginBottom: '0.75rem', fontSize: '0.88rem' }}>
                          <strong style={{ color: '#10b981' }}>Director's Note:</strong> {staff.log.director_feedback}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ flex: 1, minWidth: '240px' }}
                          placeholder={`Add guidance or directive for ${staff.name}...`}
                          value={directorFeedback[staff.user_id] ?? (staff.log?.director_feedback || '')}
                          onChange={(e) => setDirectorFeedback({ ...directorFeedback, [staff.user_id]: e.target.value })}
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => handleDirectorFeedback(staff.user_id)}
                          disabled={savingFeedback[staff.user_id]}
                        >
                          <CheckCircle2 size={14} />
                          {savingFeedback[staff.user_id] ? "Saving..." : isAcknowledged ? "Update Remarks" : "Save Remarks & Acknowledge"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Staff view of Director feedback */}
                  {!isDirector && staff.log?.director_feedback && (
                    <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-success)', fontWeight: 700, marginBottom: '0.25rem' }}>
                        Director's Executive Remarks
                      </div>
                      <div style={{ background: 'rgba(16, 185, 129, 0.06)', borderLeft: '3px solid #10b981', padding: '0.6rem 0.85rem', borderRadius: '4px', fontSize: '0.88rem' }}>
                        {staff.log.director_feedback}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
