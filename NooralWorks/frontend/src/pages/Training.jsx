import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BookOpen, Plus, Calendar, Clock, Link2, Users } from 'lucide-react';

export default function Training({ user }) {
  const [trainings, setTrainings] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // New Course Form State
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cDept, setCDept] = useState('Software Development');
  const [cTech, setCTech] = useState('React.js');
  const [cStart, setCStart] = useState(new Date().toISOString().split('T')[0]);
  const [cEnd, setCEnd] = useState('');
  const [cMentor, setCMentor] = useState('');
  const [courseLoading, setCourseLoading] = useState(false);

  // New Session Form State
  const [sTopic, setSTopic] = useState('');
  const [sBatch, setSBatch] = useState('All Assigned');
  const [sDate, setSDate] = useState(new Date().toISOString().split('T')[0]);
  const [sTime, setSTime] = useState('10:00');
  const [sDuration, setSDuration] = useState('90');
  const [sLink, setSLink] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);

  const fetchTrainings = async () => {
    try {
      const data = await api.getTrainings();
      setTrainings(data);
    } catch (err) {
      setError(err.message || 'Failed to load training programs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMentors = async () => {
    try {
      const data = await api.getMentors();
      setMentors(data);
      if (data.length > 0) setCMentor(data[0].user_id.toString());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTrainings();
    if (user?.role === 'HR' || user?.role === 'Director') {
      fetchMentors();
    }
  }, [user]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setCourseLoading(true);
    try {
      await api.createTraining({
        title: cTitle,
        description: cDesc,
        department: cDept,
        technology: cTech,
        start_date: cStart,
        end_date: cEnd || null,
        mentor_id: cMentor ? parseInt(cMentor) : null
      });
      setShowCourseModal(false);
      setCTitle('');
      setCDesc('');
      fetchTrainings();
    } catch (err) {
      alert(err.message);
    } finally {
      setCourseLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    setSessionLoading(true);
    try {
      await api.createSession(selectedCourseId, {
        topic: sTopic,
        batch: sBatch,
        date: sDate,
        time: sTime,
        duration: parseInt(sDuration),
        materials_link: sLink,
        meeting_link: sLink
      });
      setShowSessionModal(false);
      setSTopic('');
      setSLink('');
      fetchTrainings();
    } catch (err) {
      alert(err.message);
    } finally {
      setSessionLoading(false);
    }
  };

  const openAddSessionModal = (courseId) => {
    setSelectedCourseId(courseId);
    setShowSessionModal(true);
  };

  const isHR = user?.role === 'HR' || user?.role === 'Director' || user?.role === 'Mentor';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Track interactive bootcamps, training curricula, and scheduled session logs.</p>
        {isHR && (
          <button className="btn btn-primary" onClick={() => setShowCourseModal(true)}>
            <Plus size={16} /> Create Program
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Loading syllabus logs...</div>
      ) : error ? (
        <div style={{ color: 'var(--color-danger)' }}>{error}</div>
      ) : trainings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h4>No training programs configured yet.</h4>
          {isHR && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Create a training program using the button above.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {trainings.map(course => (
            <div key={course.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={20} color="var(--color-primary)" />
                    {course.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{course.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="badge badge-info">{course.technology}</span>
                  <span className="badge badge-success">{course.department}</span>
                  {isHR && (
                    <button className="btn btn-secondary btn-sm" onClick={() => openAddSessionModal(course.id)}>
                      <Plus size={12} /> Add Session
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Training Sessions & Schedules
                </h4>

                {course.sessions.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                    No sessions scheduled inside this program yet.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {course.sessions.map(sess => (
                      <div key={sess.id} style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{sess.topic}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sess.duration}m duration</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={12} /> {sess.date}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} /> {sess.time}
                          </span>
                        </div>

                        {sess.materials_link && (
                          <a 
                            href={sess.materials_link} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn btn-secondary btn-sm" 
                            style={{ gap: '0.25rem', marginTop: '0.5rem', width: '100%' }}
                          >
                            <Link2 size={12} /> Open Reference Materials
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Program Modal */}
      {showCourseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create Training Program</h2>
              <button className="modal-close" onClick={() => setShowCourseModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateCourse}>
              <div className="form-group">
                <label>Program Title</label>
                <input type="text" className="form-control" required value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="e.g. Node.js Back-end Bootcamp" />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows="3" value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="Enter details about program curriculum..." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select className="form-control" required value={cDept} onChange={(e) => setCDept(e.target.value)}>
                    <option value="Software Development">Software Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Web Development">Web Development</option>
                    <option value="Data Analytics">Data Analytics</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Technology Stack</label>
                  <input type="text" className="form-control" required value={cTech} onChange={(e) => setCTech(e.target.value)} placeholder="e.g. Javascript" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" className="form-control" required value={cStart} onChange={(e) => setCStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Assign Trainer</label>
                  <select className="form-control" value={cMentor} onChange={(e) => setCMentor(e.target.value)}>
                    <option value="">Choose Trainer</option>
                    {mentors.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={courseLoading}>
                {courseLoading ? 'Saving...' : 'Create Program'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Session Modal */}
      {showSessionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Training Session</h2>
              <button className="modal-close" onClick={() => setShowSessionModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateSession}>
              <div className="form-group">
                <label>Session Topic *</label>
                <input type="text" className="form-control" required value={sTopic} onChange={(e) => setSTopic(e.target.value)} placeholder="e.g. Express Routers and Middlewares" />
              </div>

              <div className="form-group">
                <label>Target Audience</label>
                <input type="text" className="form-control" value="All Assigned Interns" disabled />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" className="form-control" required value={sDate} onChange={(e) => setSDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input type="time" className="form-control" required value={sTime} onChange={(e) => setSTime(e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Duration (Minutes)</label>
                  <input type="number" className="form-control" required value={sDuration} onChange={(e) => setSDuration(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Materials Link (Slides / Labs)</label>
                  <input type="url" className="form-control" value={sLink} onChange={(e) => setSLink(e.target.value)} placeholder="http://example.com" />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={sessionLoading}>
                {sessionLoading ? 'Scheduling...' : 'Schedule Session'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
