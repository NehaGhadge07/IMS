import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import LeaveRequests from './LeaveRequests';
import { 
  CheckCircle, 
  LogIn, 
  LogOut, 
  ArrowLeft, 
  BarChart3, 
  RefreshCw, 
  Calendar, 
  CalendarDays,
  Clock, 
  Users, 
  UserCheck, 
  TrendingUp, 
  ShieldCheck, 
  Radio,
  UserCog,
  Edit2,
  Plus,
  X
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

function getStatusFromNow() {
  const now = new Date();
  const total = now.getHours() * 60 + now.getMinutes();
  if (total >= 12 * 60) return 'Half Day';
  if (total >= 10 * 60) return 'Late';
  return 'Present';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
}

function getStartAndEndOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diffToMonday));
  const sunday = new Date(date.setDate(monday.getDate() + 6));
  const todayStr = new Date().toISOString().split('T')[0];
  const startStr = monday.toISOString().split('T')[0];
  const sundayStr = sunday.toISOString().split('T')[0];
  return {
    start: startStr,
    end: sundayStr > todayStr ? todayStr : sundayStr
  };
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(time.getHours()).padStart(2, '0');
  const m = String(time.getMinutes()).padStart(2, '0');
  const s = String(time.getSeconds()).padStart(2, '0');
  const dateStr = time.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
        {h}:{m}:{s}
      </div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{dateStr}</div>
    </div>
  );
}

function StatusPreview() {
  const [status, setStatus] = useState(getStatusFromNow());
  useEffect(() => {
    const t = setInterval(() => setStatus(getStatusFromNow()), 10000);
    return () => clearInterval(t);
  }, []);
  const colors = { Present: '#10b981', Late: '#f59e0b', 'Half Day': '#8b5cf6' };
  return (
    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Login will be marked as</div>
      <span style={{ background: colors[status] + '22', color: colors[status], border: `1px solid ${colors[status]}`, borderRadius: '20px', padding: '0.25rem 0.9rem', fontWeight: 700, fontSize: '0.85rem' }}>
        {status}
      </span>
    </div>
  );
}

function AttendanceCharts({ data, title = '' }) {
  const [graphMode, setGraphMode] = useState('overview'); // 'overview' | 'timeline' | 'comparison'

  if (!data) return null;

  const hasComparison = data.comparisonData && data.comparisonData.length > 1;

  return (
    <div style={{ marginBottom: '1.75rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      {/* Top Header with Title and Graph View Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} color="var(--color-primary)" /> {title || 'Attendance Visual Analytics'}
        </div>
        
        {/* Graph Mode Buttons */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-color)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button 
            type="button"
            className={`btn btn-xs ${graphMode === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setGraphMode('overview')}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
          >
            📊 Status & Hours
          </button>
          <button 
            type="button"
            className={`btn btn-xs ${graphMode === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setGraphMode('timeline')}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
          >
            📈 Daily Timeline Trend
          </button>
          {hasComparison && (
            <button 
              type="button"
              className={`btn btn-xs ${graphMode === 'comparison' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setGraphMode('comparison')}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
            >
              👥 Person Comparison
            </button>
          )}
        </div>
      </div>

      {/* High-Level Metric Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Present', value: data.presentDays, color: '#10b981', sub: 'On-Time Clocked' },
          { label: 'Late', value: data.lateDays, color: '#f59e0b', sub: 'After 10:00 AM' },
          ...(data.halfDays !== undefined ? [{ label: 'Half Day', value: data.halfDays, color: '#8b5cf6', sub: 'Under 1.5 hrs' }] : []),
          { label: 'Absent', value: data.absentDays, color: '#ef4444', sub: 'Unexcused' },
          ...(data.leaveDays !== undefined ? [{ label: 'Leave', value: data.leaveDays, color: '#3b82f6', sub: 'Approved' }] : []),
          { label: 'Attendance Rate', value: `${data.attendanceRate}%`, color: 'var(--color-primary)', sub: 'Overall Turnout' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--bg-color)', borderRadius: '10px', padding: '0.85rem 0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', position: 'relative' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 700 }}>{stat.label}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Mode 1: Status & Hours Overview */}
      {graphMode === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: data.barData?.length > 0 && data.pieData?.length > 0 ? '1fr 2fr' : '1fr', gap: '1.25rem', marginBottom: '1rem' }}>
          {/* Donut Chart with Center Percentage */}
          {data.pieData && data.pieData.length > 0 && (
            <div style={{ background: 'var(--bg-color)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Attendance Composition</div>
              <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie 
                      data={data.pieData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={48} 
                      outerRadius={78} 
                      paddingAngle={4} 
                      dataKey="value"
                    >
                      {data.pieData.map((entry, i) => {
                        const c = { Present: '#10b981', Late: '#f59e0b', Absent: '#ef4444', Leave: '#3b82f6', 'Half Day': '#8b5cf6' };
                        return <Cell key={i} fill={c[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Percentage Display */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>{data.attendanceRate}%</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Turnout</div>
                </div>
              </div>
              {/* Legend Badges */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                {data.pieData.map((entry, i) => {
                  const c = { Present: '#10b981', Late: '#f59e0b', Absent: '#ef4444', Leave: '#3b82f6', 'Half Day': '#8b5cf6' };
                  return (
                    <span key={i} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c[entry.name] || '#ccc' }}></span>
                      {entry.name} ({entry.value})
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Working Hours Bar Chart */}
          {data.barData && data.barData.length > 0 && (
            <div style={{ background: 'var(--bg-color)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Daily Clocked Working Hours</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg: {data.avgHours} hrs/day</div>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={data.barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  <Bar dataKey="hours" fill="#c49b2c" radius={[4, 4, 0, 0]} name="Hours Worked" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Daily Timeline Trend Area Chart */}
      {graphMode === 'timeline' && (
        <div style={{ background: 'var(--bg-color)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Daily Attendance Progression Over Period</div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>● Present</span>
              <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>● Late</span>
              <span style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>● Half Day</span>
              <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>● Absent</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={data.timelineData}>
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="colorHalfDay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" />
              <Area type="monotone" dataKey="Late" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorLate)" />
              <Area type="monotone" dataKey="Half Day" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorHalfDay)" />
              <Area type="monotone" dataKey="Absent" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorAbsent)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mode 3: Comparative Performance Chart */}
      {graphMode === 'comparison' && hasComparison && (
        <div style={{ background: 'var(--bg-color)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Personnel Attendance Rate & Hours Comparison</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data.comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                formatter={(value, name) => [
                  name === 'Attendance Rate (%)' ? `${value}%` : `${value} hrs`,
                  name
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <Bar dataKey="attendanceRate" name="Attendance Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalHours" name="Total Hours (hrs)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cumulative Metrics Footer */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Total Logged Entries:</strong> {data.totalDays}</span>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Cumulative Hours Clocked:</strong> {data.totalHours} hrs</span>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Average per Entry:</strong> {data.avgHours} hrs</span>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Active Range:</strong> {data.timelineData?.length || 0} active days</span>
      </div>
    </div>
  );
}

function TrainerMonthlyGrid({ monthStr, logs, interns, todayStr }) {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = todayStr || new Date().toISOString().split('T')[0];

  // Only include dates up to today! Remove all next/future dates!
  const allDates = Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
  const dates = allDates.filter(d => d <= today).reverse();

  const getStatusBadge = (status) => {
    if (!status || status === '-') return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    let badgeClass = 'badge-success';
    if (status === 'Absent') badgeClass = 'badge-danger';
    if (status === 'Leave') badgeClass = 'badge-info';
    if (status === 'Late' || status === 'Half Day') badgeClass = 'badge-warning';
    if (status === 'Not Checked In' || status === 'Pending') {
      return (
        <span className="badge badge-secondary" style={{ fontSize: '0.7rem', padding: '0.25rem 0.45rem', opacity: 0.85 }}>
          Not Checked In
        </span>
      );
    }
    return <span className={`badge ${badgeClass}`} style={{ fontSize: '0.7rem', padding: '0.25rem 0.45rem' }}>{status}</span>;
  };

  return (
    <div className="table-container" style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
      <table className="table" style={{ whiteSpace: 'nowrap', minWidth: '800px' }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2, minWidth: '120px' }}>Date</th>
            {interns.map(i => <th key={i.id} style={{ textAlign: 'center', minWidth: '120px' }}>{i.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {dates.map(date => {
            return (
              <tr key={date}>
                <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg-color)', zIndex: 1 }}>{formatDate(date)}</td>
                {interns.map(i => {
                  const log = logs.find(l => l.intern_id === i.id && l.date === date);
                  let status = log?.status;
                  // If date is in the past (before today) and intern has no attendance record, mark Absent
                  if (!status) {
                    if (date < today) {
                      if (!i.joining_date || date >= i.joining_date) {
                        status = 'Absent';
                      }
                    } else if (date === today) {
                      status = 'Not Checked In';
                    }
                  }
                  return <td key={i.id} style={{ textAlign: 'center', verticalAlign: 'middle' }}>{getStatusBadge(status)}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Attendance({ user }) {
  const [logs, setLogs] = useState([]);
  const [mentorLogs, setMentorLogs] = useState([]);
  const [hrLogs, setHrLogs] = useState([]);
  const [todayAllLogs, setTodayAllLogs] = useState([]);
  const [todayAllMentorLogs, setTodayAllMentorLogs] = useState([]);
  const [todayAllHRLogs, setTodayAllHRLogs] = useState([]);
  const [interns, setInterns] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [hrUsers, setHrUsers] = useState([]);
  const [selectedHR, setSelectedHR] = useState('');
  const [showHRModal, setShowHRModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const isIntern = user?.role === 'Intern';
  const isDirector = user?.role === 'Director';
  const isMentor = user?.role === 'Mentor';
  const isHR = user?.role === 'HR' || isDirector;

  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'leave' 
    ? 'Leave' 
    : (tabParam === 'mentor' && (isHR || isMentor) 
        ? 'Mentor' 
        : (tabParam === 'hr' && (isDirector || user?.role === 'HR') ? 'HR' : 'Intern'));
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === 'Leave') {
      setSearchParams({ tab: 'leave' });
    } else if (newTab === 'Mentor') {
      setSearchParams({ tab: 'mentor' });
    } else if (newTab === 'HR') {
      setSearchParams({ tab: 'hr' });
    } else {
      setSearchParams({});
    }
  };
  const [selectedInternDetail, setSelectedInternDetail] = useState(null);
  
  // Date & Period Filter State (Local Timezone Safe)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const defaultWeekRange = useMemo(() => getStartAndEndOfWeek(), []);

  const [dateFilterMode, setDateFilterMode] = useState('month'); // 'today' | 'week' | 'month' | 'range'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [dateFrom, setDateFrom] = useState(defaultWeekRange.start);
  const [dateTo, setDateTo] = useState(defaultWeekRange.end);

  const [selectedIntern, setSelectedIntern] = useState('');
  const [selectedMentor, setSelectedMentor] = useState('');

  const [hrForm, setHrForm] = useState({
    hr_id: '',
    date: todayStr,
    check_in_time: '09:30:00',
    check_out_time: '18:00:00',
    status: 'Present',
    comments: ''
  });

  // Dynamic trainer-filtered intern list
  const filteredInterns = useMemo(() => {
    if (!selectedMentor) return interns;
    return interns.filter(i => {
      return (
        i.mentor_id?.toString() === selectedMentor.toString() ||
        i.mentor_user_id?.toString() === selectedMentor.toString() ||
        i.intern_mentor_id?.toString() === selectedMentor.toString()
      );
    });
  }, [interns, selectedMentor]);

  // Handle trainer selection: updates selectedMentor and resets selectedIntern if it doesn't belong to the newly selected trainer
  const handleMentorFilterChange = (newMentorId) => {
    setSelectedMentor(newMentorId);
    if (selectedIntern) {
      const found = interns.find(i => i.id.toString() === selectedIntern);
      if (found && newMentorId) {
        const matches = (
          found.mentor_id?.toString() === newMentorId.toString() ||
          found.mentor_user_id?.toString() === newMentorId.toString() ||
          found.intern_mentor_id?.toString() === newMentorId.toString()
        );
        if (!matches) {
          setSelectedIntern('');
          setSelectedInternDetail(null);
        }
      }
    }
  };

  // Live Sync & Activity State
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Leave & Actions
  const [leaveDate, setLeaveDate] = useState(todayStr);
  const [leaveComments, setLeaveComments] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [approvalComments, setApprovalComments] = useState({});
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [todayStatus, setTodayStatus] = useState(null);

  // Compute Active Query Parameters based on dateFilterMode
  const buildQueryParams = useCallback(() => {
    const params = {};
    if (dateFilterMode === 'today') {
      params.date = todayStr;
    } else if (dateFilterMode === 'week') {
      const wk = getStartAndEndOfWeek();
      params.start_date = wk.start;
      params.end_date = wk.end > todayStr ? todayStr : wk.end;
    } else if (dateFilterMode === 'month') {
      params.month = selectedMonth;
      if (selectedMonth === todayStr.slice(0, 7)) {
        params.end_date = todayStr;
      }
    } else if (dateFilterMode === 'range') {
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo > todayStr ? todayStr : dateTo;
    }
    return params;
  }, [dateFilterMode, todayStr, selectedMonth, dateFrom, dateTo]);

  // Main Attendance Fetch
  const fetchAttendanceLogs = useCallback(async (isManualRefresh = false) => {
    try {
      if (!isManualRefresh) setLoading(true);
      else setIsRefreshing(true);

      const baseParams = buildQueryParams();

      if (activeTab === 'Intern') {
        const internParams = { ...baseParams };
        if (selectedIntern) internParams.intern_id = selectedIntern;
        if (selectedMentor) internParams.mentor_id = selectedMentor;
        const data = await api.getAttendance(internParams);
        setLogs(data);
      } else if (activeTab === 'Mentor') {
        const mentorParams = { ...baseParams };
        if (selectedMentor) mentorParams.mentor_id = selectedMentor;
        const data = await api.getMentorAttendance(mentorParams);
        setMentorLogs(data);
      } else if (activeTab === 'HR') {
        const hrParams = { ...baseParams };
        if (selectedHR) hrParams.hr_id = selectedHR;
        else if (user?.role === 'HR') hrParams.hr_id = user.id;
        const data = await api.getHRAttendance(hrParams);
        setHrLogs(data);
      }

      // Fetch Today's Overall Live Status for the Director Header & Side Panel
      if (isDirector || user?.role === 'HR') {
        try {
          const [tInterns, tMentors, tHR] = await Promise.all([
            api.getAttendance({ date: todayStr }),
            api.getMentorAttendance({ date: todayStr }),
            api.getHRAttendance({ date: todayStr })
          ]);
          setTodayAllLogs(tInterns || []);
          setTodayAllMentorLogs(tMentors || []);
          setTodayAllHRLogs(tHR || []);
        } catch (e) {
          console.warn('Today live logs fetch warning:', e);
        }
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Fetch attendance error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [buildQueryParams, activeTab, selectedIntern, selectedMentor, selectedHR, isDirector, user?.role, todayStr, user?.id]);

  // Initial and reactive fetch
  useEffect(() => {
    fetchAttendanceLogs();
  }, [fetchAttendanceLogs]);

  // Periodic Live Background Polling for Director/HR (every 12 seconds)
  useEffect(() => {
    if (isDirector || user?.role === 'HR') {
      const interval = setInterval(() => {
        fetchAttendanceLogs(true);
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [fetchAttendanceLogs, isDirector, user?.role]);

  // Load intern and mentor rosters
  useEffect(() => {
    if (user?.role !== 'Intern') {
      api.getInterns().then(setInterns).catch(console.error);
      api.getMentors().then(data => {
        setMentors(data);
        if (user?.role === 'Mentor' && user?.id) {
          setSelectedMentor(user.id.toString());
        }
      }).catch(console.error);
    }
    if (isDirector || user?.role === 'HR') {
      api.getHRList().then(data => {
        setHrUsers(data || []);
      }).catch(console.error);
    }
  }, [user, isDirector]);

  // Check today's personal or selected user record
  useEffect(() => {
    if (!isHR) return;
    setTodayStatus(null);
    if (activeTab === 'Intern' && selectedIntern) {
      api.getAttendance({ intern_id: selectedIntern, date: todayStr })
        .then(data => setTodayStatus(data[0] || null))
        .catch(() => setTodayStatus(null));
    } else if (activeTab === 'Mentor' && selectedMentor) {
      api.getMentorAttendance({ mentor_id: selectedMentor, date: todayStr })
        .then(data => setTodayStatus(data[0] || null))
        .catch(() => setTodayStatus(null));
    } else if (activeTab === 'HR') {
      const targetId = selectedHR || (user?.role === 'HR' ? user.id : (hrUsers[0]?.user_id || null));
      if (targetId) {
        api.getHRAttendance({ hr_id: targetId, date: todayStr })
          .then(data => setTodayStatus(data[0] || null))
          .catch(() => setTodayStatus(null));
      }
    }
  }, [activeTab, selectedIntern, selectedMentor, selectedHR, isHR, todayStr, user?.role, user?.id, hrUsers]);

  const showMsg = (text, type = 'success') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      let res;
      if (activeTab === 'Intern') {
        res = await api.hrLoginIntern(parseInt(selectedIntern));
      } else if (activeTab === 'Mentor') {
        res = await api.trainerLogin(parseInt(selectedMentor));
      } else if (activeTab === 'HR') {
        const targetId = selectedHR || (user?.role === 'HR' ? user.id : (hrUsers[0]?.user_id || null));
        res = await api.hrSelfLogin(parseInt(targetId));
      }
      showMsg(`Login marked — ${res.time} — Status: ${res.status}`);
      setTodayStatus({ check_in_time: res.time, check_out_time: null, status: res.status });
      fetchAttendanceLogs(true);
    } catch (err) { showMsg(err.message, 'error'); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      let res;
      if (activeTab === 'Intern') {
        res = await api.hrLogoutIntern(parseInt(selectedIntern));
      } else if (activeTab === 'Mentor') {
        res = await api.trainerLogout(parseInt(selectedMentor));
      } else if (activeTab === 'HR') {
        const targetId = selectedHR || (user?.role === 'HR' ? user.id : (hrUsers[0]?.user_id || null));
        res = await api.hrSelfLogout(parseInt(targetId));
      }
      showMsg(`Logout marked — ${res.time} — Hours: ${res.workingHours}`);
      setTodayStatus(prev => prev ? { ...prev, check_out_time: res.time } : prev);
      fetchAttendanceLogs(true);
    } catch (err) { showMsg(err.message, 'error'); }
    finally { setLogoutLoading(false); }
  };

  const handleSaveHRLog = async (e) => {
    e.preventDefault();
    try {
      await api.logHRAttendance(hrForm);
      showMsg('HR attendance record saved successfully.');
      setShowHRModal(false);
      fetchAttendanceLogs(true);
    } catch (err) {
      showMsg(err.message || 'Failed to save HR attendance record', 'danger');
    }
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    setLeaveLoading(true);
    try { 
      await api.requestLeave(leaveDate, leaveComments); 
      setLeaveComments(''); 
      fetchAttendanceLogs(true); 
      alert('Leave requested.'); 
    } catch (err) { 
      alert(err.message); 
    } finally { 
      setLeaveLoading(false); 
    }
  };

  const handleApprove = async (id, statusVal) => {
    try { 
      await api.approveAttendance(id, statusVal, approvalComments[id] || ''); 
      fetchAttendanceLogs(true); 
    } catch (err) { 
      alert(err.message); 
    }
  };

  const handleInternClick = (internId, internName) => { 
    setSelectedInternDetail({ id: internId, name: internName }); 
    setSelectedIntern(internId.toString()); 
  };
  
  const handleBackToAllInterns = () => { 
    setSelectedInternDetail(null); 
    setSelectedIntern(''); 
  };

  const handleBackToAllTrainers = () => {
    setSelectedMentor('');
  };

  // Displayed logs strictly cap at today (never show future/next dates)
  const displayedLogs = useMemo(() => {
    let list = logs.filter(l => l.date <= todayStr);
    if (dateFilterMode === 'today' && activeTab === 'Intern' && !isIntern) {
      const copy = [...list];
      filteredInterns.forEach(intern => {
        const exists = copy.some(l => l.intern_id === intern.id);
        if (!exists) {
          copy.push({
            id: `pending-today-${intern.id}`,
            intern_id: intern.id,
            intern_name: intern.name,
            mentor_name: intern.mentor_name,
            technology: intern.technology,
            date: todayStr,
            check_in_time: null,
            check_out_time: null,
            working_hours: 0,
            status: 'Not Checked In',
            comments: 'Pending check-in'
          });
        }
      });
      return copy;
    }
    return list;
  }, [logs, dateFilterMode, activeTab, isIntern, filteredInterns, todayStr]);

  // Intern chart statistics (Single Intern or Aggregate All Interns)
  const chartData = useMemo(() => {
    if (displayedLogs.length === 0) return null;
    const sc = {}; 
    displayedLogs.forEach(l => { sc[l.status] = (sc[l.status] || 0) + 1; });
    const pieData = Object.entries(sc).map(([name, value]) => ({ name, value }));
    const barData = displayedLogs.filter(l => l.working_hours).map(l => ({ 
      date: formatDate(l.date), 
      hours: parseFloat(l.working_hours) || 0 
    })).slice(0, 30).reverse();

    // Timeline Trend grouped by date
    const dateMap = {};
    displayedLogs.forEach(l => {
      if (!dateMap[l.date]) {
        dateMap[l.date] = { 
          date: formatDate(l.date), 
          rawDate: l.date, 
          Present: 0, 
          Late: 0, 
          'Half Day': 0, 
          Absent: 0, 
          Leave: 0, 
          Hours: 0 
        };
      }
      if (l.status === 'Present') dateMap[l.date].Present++;
      else if (l.status === 'Late') dateMap[l.date].Late++;
      else if (l.status === 'Half Day') dateMap[l.date]['Half Day']++;
      else if (l.status === 'Absent') dateMap[l.date].Absent++;
      else if (l.status === 'Leave') dateMap[l.date].Leave++;
      dateMap[l.date].Hours += parseFloat(l.working_hours) || 0;
    });
    const timelineData = Object.values(dateMap).sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    // Comparison grouped by intern
    const internMap = {};
    displayedLogs.forEach(l => {
      const key = l.intern_name || `Intern ${l.intern_id}`;
      if (!internMap[key]) {
        internMap[key] = { name: key, present: 0, late: 0, halfDay: 0, absent: 0, leave: 0, totalHours: 0, count: 0 };
      }
      if (l.status === 'Present') internMap[key].present++;
      else if (l.status === 'Late') internMap[key].late++;
      else if (l.status === 'Half Day') internMap[key].halfDay++;
      else if (l.status === 'Absent') internMap[key].absent++;
      else if (l.status === 'Leave') internMap[key].leave++;
      internMap[key].totalHours += parseFloat(l.working_hours) || 0;
      internMap[key].count++;
    });
    const comparisonData = Object.values(internMap).map(item => ({
      name: item.name.length > 14 ? item.name.slice(0, 12) + '..' : item.name,
      fullName: item.name,
      totalHours: parseFloat(item.totalHours.toFixed(1)),
      attendanceRate: item.count > 0 ? parseFloat((((item.present + item.late) / item.count) * 100).toFixed(1)) : 0
    }));

    const td = displayedLogs.length;
    const p = displayedLogs.filter(l => l.status === 'Present').length;
    const la = displayedLogs.filter(l => l.status === 'Late').length;
    const ab = displayedLogs.filter(l => l.status === 'Absent').length;
    const lv = displayedLogs.filter(l => l.status === 'Leave').length;
    const th = displayedLogs.reduce((s, l) => s + (parseFloat(l.working_hours) || 0), 0);

    return { 
      pieData, 
      barData, 
      timelineData,
      comparisonData,
      totalDays: td, 
      presentDays: p, 
      lateDays: la, 
      absentDays: ab, 
      leaveDays: lv, 
      totalHours: th.toFixed(1), 
      avgHours: td > 0 ? (th / td).toFixed(1) : 0, 
      attendanceRate: td > 0 ? (((p + la) / td) * 100).toFixed(1) : 0 
    };
  }, [displayedLogs]);

  // Mentor chart statistics (Single Trainer or Aggregate All Trainers)
  const mentorChartData = useMemo(() => {
    if (mentorLogs.length === 0) return null;
    const sc = {}; 
    mentorLogs.forEach(l => { sc[l.status] = (sc[l.status] || 0) + 1; });
    const pieData = Object.entries(sc).map(([name, value]) => ({ name, value }));
    const barData = mentorLogs.filter(l => l.working_hours).map(l => ({ 
      date: formatDate(l.date), 
      hours: parseFloat(l.working_hours) || 0 
    })).slice(0, 30).reverse();

    // Timeline Trend grouped by date
    const dateMap = {};
    mentorLogs.forEach(l => {
      if (!dateMap[l.date]) {
        dateMap[l.date] = { 
          date: formatDate(l.date), 
          rawDate: l.date, 
          Present: 0, 
          Late: 0, 
          'Half Day': 0, 
          Absent: 0, 
          Leave: 0, 
          Hours: 0 
        };
      }
      if (l.status === 'Present') dateMap[l.date].Present++;
      else if (l.status === 'Late') dateMap[l.date].Late++;
      else if (l.status === 'Half Day') dateMap[l.date]['Half Day']++;
      else if (l.status === 'Absent') dateMap[l.date].Absent++;
      else if (l.status === 'Leave') dateMap[l.date].Leave++;
      dateMap[l.date].Hours += parseFloat(l.working_hours) || 0;
    });
    const timelineData = Object.values(dateMap).sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    // Comparison grouped by mentor
    const mentorMap = {};
    mentorLogs.forEach(l => {
      const key = l.mentor_name || `Trainer ${l.mentor_id}`;
      if (!mentorMap[key]) {
        mentorMap[key] = { name: key, present: 0, late: 0, halfDay: 0, absent: 0, leave: 0, totalHours: 0, count: 0 };
      }
      if (l.status === 'Present') mentorMap[key].present++;
      else if (l.status === 'Late') mentorMap[key].late++;
      else if (l.status === 'Half Day') mentorMap[key].halfDay++;
      else if (l.status === 'Absent') mentorMap[key].absent++;
      else if (l.status === 'Leave') mentorMap[key].leave++;
      mentorMap[key].totalHours += parseFloat(l.working_hours) || 0;
      mentorMap[key].count++;
    });
    const comparisonData = Object.values(mentorMap).map(item => ({
      name: item.name.length > 14 ? item.name.slice(0, 12) + '..' : item.name,
      fullName: item.name,
      totalHours: parseFloat(item.totalHours.toFixed(1)),
      attendanceRate: item.count > 0 ? parseFloat((((item.present + item.late + item.halfDay) / item.count) * 100).toFixed(1)) : 0
    }));

    const td = mentorLogs.length;
    const p = mentorLogs.filter(l => l.status === 'Present').length;
    const la = mentorLogs.filter(l => l.status === 'Late').length;
    const hd = mentorLogs.filter(l => l.status === 'Half Day').length;
    const ab = mentorLogs.filter(l => l.status === 'Absent').length;
    const lv = mentorLogs.filter(l => l.status === 'Leave').length;
    const th = mentorLogs.reduce((s, l) => s + (parseFloat(l.working_hours) || 0), 0);

    return { 
      pieData, 
      barData, 
      timelineData,
      comparisonData,
      totalDays: td, 
      presentDays: p, 
      lateDays: la, 
      halfDays: hd, 
      absentDays: ab, 
      leaveDays: lv, 
      totalHours: th.toFixed(1), 
      avgHours: td > 0 ? (th / td).toFixed(1) : 0, 
      attendanceRate: td > 0 ? (((p + la + hd) / td) * 100).toFixed(1) : 0 
    };
  }, [mentorLogs]);

  // Per-Trainer Summary Cards for Director when viewing All Trainers
  const trainersSummary = useMemo(() => {
    if (!isDirector && user?.role !== 'HR') return [];
    return mentors.map(m => {
      const tLogs = mentorLogs.filter(l => l.mentor_id === m.user_id);
      const total = tLogs.length;
      const present = tLogs.filter(l => l.status === 'Present').length;
      const late = tLogs.filter(l => l.status === 'Late').length;
      const halfDay = tLogs.filter(l => l.status === 'Half Day').length;
      const absent = tLogs.filter(l => l.status === 'Absent').length;
      const hours = tLogs.reduce((acc, curr) => acc + (parseFloat(curr.working_hours) || 0), 0);

      // Live Today Check - checks todayAllMentorLogs AND m (from getMentors API)
      const todayRecord = todayAllMentorLogs.find(l => l.mentor_id === m.user_id);
      const checkInTime = todayRecord?.check_in_time || m.today_check_in;
      const checkOutTime = todayRecord?.check_out_time || m.today_check_out;
      const status = todayRecord?.status || m.today_status;
      const isOnLeave = status === 'Leave';

      // Trainer is Logged In / Active Now if:
      // 1. checkInTime is recorded and they haven't checked out yet, OR
      // 2. m.is_online is 1 (active authenticated system session)
      const isCheckedInNow = !checkOutTime && (Boolean(checkInTime) || m.is_online === 1);
      const isCompletedToday = Boolean(checkOutTime);

      const computedPresent = present || (isCheckedInNow || isCompletedToday ? 1 : 0);
      const computedTotal = Math.max(total, isCheckedInNow || isCompletedToday ? 1 : 0);
      const rate = computedTotal > 0 ? (((computedPresent + late + halfDay) / computedTotal) * 100).toFixed(1) : '0.0';

      let liveStatus = 'Not Checked In';
      if (isCheckedInNow) {
        liveStatus = `Logged In ${checkInTime ? `(${checkInTime.slice(0, 5)})` : '(Active)'}`;
      } else if (isCompletedToday) {
        liveStatus = `Checked Out (${checkOutTime.slice(0, 5)})`;
      } else if (isOnLeave) {
        liveStatus = 'On Leave';
      } else if (status) {
        liveStatus = status;
      }

      return {
        ...m,
        totalEntries: computedTotal,
        present: computedPresent,
        late,
        halfDay,
        absent,
        leave: tLogs.filter(l => l.status === 'Leave').length,
        totalHours: hours > 0 ? hours.toFixed(1) : (isCheckedInNow ? 'Active' : '0.0'),
        rate,
        liveStatus,
        checkInTime,
        checkOutTime,
        isCheckedInNow,
        isCompletedToday,
        isOnLeave
      };
    });
  }, [mentors, mentorLogs, todayAllMentorLogs, isDirector, user?.role]);

  // Per-HR Summary Cards for Director when viewing All HR Staff
  const hrSummary = useMemo(() => {
    if (!isDirector && user?.role !== 'HR') return [];
    return hrUsers.map(h => {
      const hLogs = hrLogs.filter(l => l.hr_id === h.user_id);
      const total = hLogs.length;
      const present = hLogs.filter(l => l.status === 'Present').length;
      const late = hLogs.filter(l => l.status === 'Late').length;
      const halfDay = hLogs.filter(l => l.status === 'Half Day').length;
      const absent = hLogs.filter(l => l.status === 'Absent').length;
      const leave = hLogs.filter(l => l.status === 'Leave').length;
      const hours = hLogs.reduce((acc, curr) => acc + (parseFloat(curr.working_hours) || 0), 0);

      const todayRecord = todayAllHRLogs.find(l => l.hr_id === h.user_id);
      const checkInTime = todayRecord?.check_in_time || null;
      const checkOutTime = todayRecord?.check_out_time || null;
      const status = todayRecord?.status || null;
      const isOnLeave = status === 'Leave';

      const isCheckedInNow = !checkOutTime && (Boolean(checkInTime) || h.is_online === 1);
      const isCompletedToday = Boolean(checkOutTime);

      const computedPresent = present || (isCheckedInNow || isCompletedToday ? 1 : 0);
      const computedTotal = Math.max(total, isCheckedInNow || isCompletedToday ? 1 : 0);
      const rate = computedTotal > 0 ? (((computedPresent + late + (halfDay * 0.5)) / computedTotal) * 100).toFixed(1) : '100.0';

      let liveStatus = 'Not Checked In';
      if (isCheckedInNow) {
        liveStatus = `Logged In ${checkInTime ? `(${checkInTime.slice(0, 5)})` : '(Active)'}`;
      } else if (isCompletedToday) {
        liveStatus = `Checked Out (${checkOutTime.slice(0, 5)})`;
      } else if (isOnLeave) {
        liveStatus = 'On Leave';
      } else if (status) {
        liveStatus = status;
      }

      return {
        ...h,
        totalEntries: computedTotal,
        present: computedPresent,
        late,
        halfDay,
        absent,
        leave,
        totalHours: hours > 0 ? hours.toFixed(1) : (isCheckedInNow ? 'Active' : '0.0'),
        rate,
        liveStatus,
        checkInTime,
        checkOutTime,
        isCheckedInNow,
        isCompletedToday,
        isOnLeave
      };
    });
  }, [hrUsers, hrLogs, todayAllHRLogs, isDirector, user?.role]);

  // HR Chart Analytics Data
  const hrChartData = useMemo(() => {
    const list = selectedHR ? hrLogs.filter(l => l.hr_id.toString() === selectedHR.toString()) : hrLogs;
    if (list.length === 0) return null;

    let p = 0, la = 0, hd = 0, ab = 0, lv = 0, th = 0;
    list.forEach(r => {
      if (r.status === 'Present') p++;
      else if (r.status === 'Late') la++;
      else if (r.status === 'Half Day') hd++;
      else if (r.status === 'Absent') ab++;
      else if (r.status === 'Leave') lv++;
      th += parseFloat(r.working_hours) || 0;
    });

    const statusBreakdown = [
      { name: 'Present', value: p, color: '#10b981' },
      { name: 'Late', value: la, color: '#f59e0b' },
      { name: 'Half Day', value: hd, color: '#8b5cf6' },
      { name: 'Absent', value: ab, color: '#ef4444' },
      { name: 'Leave', value: lv, color: '#3b82f6' }
    ].filter(d => d.value > 0);

    const comparisonData = [
      { category: 'Present', count: p, color: '#10b981' },
      { category: 'Late', count: la, color: '#f59e0b' },
      { category: 'Half Day', count: hd, color: '#8b5cf6' },
      { category: 'Leave', count: lv, color: '#3b82f6' },
      { category: 'Absent', count: ab, color: '#ef4444' }
    ];

    const td = list.length;
    return {
      statusBreakdown,
      comparisonData,
      totalDays: td,
      presentDays: p,
      lateDays: la,
      halfDays: hd,
      absentDays: ab,
      leaveDays: lv,
      totalHours: th.toFixed(1),
      avgHours: td > 0 ? (th / td).toFixed(1) : 0,
      attendanceRate: td > 0 ? (((p + la + (hd * 0.5)) / td) * 100).toFixed(1) : 0
    };
  }, [hrLogs, selectedHR]);

  // Live Summary Pulse for Today
  const todayLiveMetrics = useMemo(() => {
    let targetLogs = todayAllLogs;
    let totalHeadcount = interns.length;
    if (activeTab === 'Mentor') {
      targetLogs = todayAllMentorLogs;
      totalHeadcount = mentors.length;
    } else if (activeTab === 'HR') {
      targetLogs = todayAllHRLogs;
      totalHeadcount = hrUsers.length;
    }

    let activeCheckedInNow = 0;
    let completedCheckedOut = 0;
    let lateToday = 0;
    let onLeaveToday = 0;
    let presentTotal = 0;

    if (activeTab === 'Intern') {
      activeCheckedInNow = targetLogs.filter(l => l.check_in_time && !l.check_out_time).length;
      completedCheckedOut = targetLogs.filter(l => l.check_out_time).length;
      lateToday = targetLogs.filter(l => l.status === 'Late').length;
      onLeaveToday = targetLogs.filter(l => l.status === 'Leave').length;
      presentTotal = targetLogs.filter(l => l.status === 'Present' || l.status === 'Late' || l.status === 'Half Day').length;
    } else if (activeTab === 'Mentor') {
      activeCheckedInNow = trainersSummary.filter(t => t.isCheckedInNow).length;
      completedCheckedOut = trainersSummary.filter(t => t.isCompletedToday).length;
      lateToday = trainersSummary.filter(t => t.late > 0).length;
      onLeaveToday = trainersSummary.filter(t => t.isOnLeave).length;
      presentTotal = trainersSummary.filter(t => t.isCheckedInNow || t.isCompletedToday).length;
    } else if (activeTab === 'HR') {
      activeCheckedInNow = hrSummary.filter(h => h.isCheckedInNow).length;
      completedCheckedOut = hrSummary.filter(h => h.isCompletedToday).length;
      lateToday = hrSummary.filter(h => h.late > 0).length;
      onLeaveToday = hrSummary.filter(h => h.isOnLeave).length;
      presentTotal = hrSummary.filter(h => h.isCheckedInNow || h.isCompletedToday).length;
    }

    const notInYet = Math.max(0, totalHeadcount - (presentTotal + onLeaveToday));

    return {
      totalHeadcount,
      activeCheckedInNow,
      completedCheckedOut,
      lateToday,
      onLeaveToday,
      presentTotal,
      notInYet
    };
  }, [activeTab, todayAllLogs, todayAllMentorLogs, todayAllHRLogs, interns.length, mentors.length, hrUsers.length, trainersSummary, hrSummary]);

  const alreadyLoggedIn = todayStatus?.check_in_time;
  const alreadyLoggedOut = todayStatus?.check_out_time;

  // Director Real-Time Pulse & Oversight Panel
  const DirectorLivePanel = () => (
    <div className="card" style={{ flex: 1, height: 'fit-content' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} color="var(--color-primary)" /> Director Live Monitor
        </h3>
        <span style={{ fontSize: '0.75rem', background: '#10b98122', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span> Live
        </span>
      </div>

      <LiveClock />

      <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Today's {activeTab === 'Intern' ? 'Intern' : (activeTab === 'HR' ? 'HR Staff' : 'Employee')} Floor Status
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'var(--bg-color)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #10b98144' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{todayLiveMetrics.activeCheckedInNow}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Currently Inside</div>
          </div>
          <div style={{ background: 'var(--bg-color)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>{todayLiveMetrics.presentTotal}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total In Today</div>
          </div>
          <div style={{ background: 'var(--bg-color)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #f59e0b44' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{todayLiveMetrics.lateToday}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Late Marked</div>
          </div>
          <div style={{ background: 'var(--bg-color)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #0ea5e944' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0ea5e9' }}>{todayLiveMetrics.onLeaveToday}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>On Leave</div>
          </div>
          <div style={{ background: 'var(--bg-color)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #ef444444' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{todayLiveMetrics.notInYet}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Not Checked In</div>
          </div>
        </div>
      </div>
    </div>
  );

  // HR Standard Mark Panel
  const HRMarkPanel = ({ title }) => (
    <div className="card" style={{ flex: 1, height: 'fit-content' }}>
      <h3 style={{ marginBottom: '1.25rem', textAlign: 'center' }}>{title}</h3>
      <LiveClock />
      <StatusPreview />

      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
        {activeTab === 'Intern' ? (
          <>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Filter by Assigned Trainer</label>
              <select 
                className="form-control" 
                value={selectedMentor} 
                onChange={e => handleMentorFilterChange(e.target.value)}
              >
                <option value="">All Trainers</option>
                {mentors.filter(m => m.role === 'Mentor').map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.name}</option>
                ))}
              </select>
            </div>

            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Select Intern *</label>
            <select 
              className="form-control" 
              value={selectedIntern} 
              onChange={e => { setSelectedIntern(e.target.value); setSelectedInternDetail(null); setTodayStatus(null); }}
            >
              <option value="">-- Choose Intern {selectedMentor ? `(Filtered by Trainer)` : ''} --</option>
              {filteredInterns.map(i => (
                <option key={i.id} value={i.id}>{i.name} ({i.technology})</option>
              ))}
            </select>
            {selectedMentor && filteredInterns.length === 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '4px' }}>
                No interns assigned to this trainer.
              </div>
            )}
          </>
        ) : activeTab === 'Mentor' ? (
          <>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Select Employee *</label>
            <select className="form-control" value={selectedMentor} onChange={e => { setSelectedMentor(e.target.value); setTodayStatus(null); }}>
              <option value="">-- Choose Employee --</option>
              {mentors.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
            </select>
          </>
        ) : (
          <>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>HR Staff Member *</label>
            {isDirector ? (
              <select 
                className="form-control" 
                value={selectedHR} 
                onChange={e => { setSelectedHR(e.target.value); setTodayStatus(null); }}
              >
                <option value="">-- Choose HR Staff Member --</option>
                {hrUsers.map(h => (
                  <option key={h.user_id} value={h.user_id.toString()}>
                    {h.name} {h.is_online ? '(Online)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {user?.name} (HR Manager)
              </div>
            )}
          </>
        )}
      </div>

      {((activeTab === 'Intern' && selectedIntern) || (activeTab === 'Mentor' && selectedMentor) || (activeTab === 'HR' && (selectedHR || user?.role === 'HR'))) && todayStatus && (
        <div style={{ 
          background: todayStatus.status === 'Leave' ? '#0ea5e915' : 'var(--bg-secondary)', 
          borderRadius: '10px', 
          padding: '0.85rem', 
          marginBottom: '1rem', 
          border: `1px solid ${todayStatus.status === 'Leave' ? '#0ea5e955' : 'var(--border-color)'}`, 
          fontSize: '0.85rem' 
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Today's Status</span>
            {todayStatus.status === 'Leave' && (
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>On Approved Leave</span>
            )}
          </div>
          <div>🕐 Login: <strong>{todayStatus.check_in_time || '—'}</strong></div>
          <div>🕐 Logout: <strong>{todayStatus.check_out_time || '—'}</strong></div>
          <div>Status: <strong>{todayStatus.status || '—'}</strong></div>
          {todayStatus.comments && (
            <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Note: {todayStatus.comments}
            </div>
          )}
        </div>
      )}

      {actionMsg && (
        <div style={{ padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', background: actionMsg.type === 'error' ? '#ef444422' : '#10b98122', color: actionMsg.type === 'error' ? '#ef4444' : '#10b981', border: `1px solid ${actionMsg.type === 'error' ? '#ef4444' : '#10b981'}` }}>
          {actionMsg.type === 'success' ? '✅ ' : '❌ '}{actionMsg.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.75rem' }}
          disabled={
            (activeTab === 'Intern' ? !selectedIntern : (activeTab === 'Mentor' ? !selectedMentor : (isDirector && !selectedHR && hrUsers.length > 1))) || 
            loginLoading || !!alreadyLoggedIn || todayStatus?.status === 'Leave'
          }
          onClick={handleLogin}
        >
          <LogIn size={18} />
          {loginLoading ? 'Marking...' : alreadyLoggedIn ? `Logged In (${todayStatus?.check_in_time})` : todayStatus?.status === 'Leave' ? 'On Approved Leave' : 'Mark Login'}
        </button>
        <button
          className="btn btn-secondary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.75rem' }}
          disabled={
            (activeTab === 'Intern' ? !selectedIntern : (activeTab === 'Mentor' ? !selectedMentor : (isDirector && !selectedHR && hrUsers.length > 1))) || 
            logoutLoading || !alreadyLoggedIn || !!alreadyLoggedOut
          }
          onClick={handleLogout}
        >
          <LogOut size={18} />
          {logoutLoading ? 'Marking...' : alreadyLoggedOut ? `Logged Out (${todayStatus?.check_out_time})` : 'Mark Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Header & Role Specific Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${activeTab === 'Intern' ? 'btn-primary' : 'btn-secondary'} btn-sm`} 
            onClick={() => { handleTabChange('Intern'); handleBackToAllInterns(); }}
          >
            <Users size={16} /> Intern Attendance
          </button>
          {(isHR || isMentor) && (
            <button 
              className={`btn ${activeTab === 'Mentor' ? 'btn-primary' : 'btn-secondary'} btn-sm`} 
              onClick={() => { handleTabChange('Mentor'); handleBackToAllTrainers(); }}
            >
              <UserCheck size={16} /> Employee Attendance
            </button>
          )}
          {(isDirector || user?.role === 'HR') && (
            <button 
              className={`btn ${activeTab === 'HR' ? 'btn-primary' : 'btn-secondary'} btn-sm`} 
              onClick={() => { handleTabChange('HR'); setSelectedHR(''); }}
            >
              <UserCog size={16} /> {isDirector ? 'HR Attendance' : 'My HR Attendance'}
            </button>
          )}
          <button 
            className={`btn ${activeTab === 'Leave' ? 'btn-primary' : 'btn-secondary'} btn-sm`} 
            onClick={() => handleTabChange('Leave')}
          >
            <CalendarDays size={16} /> Leave Records & Approvals
          </button>
        </div>

        {/* Live Refresh Status Pill */}
        {activeTab !== 'Leave' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Radio size={14} color="#10b981" /> Live Sync (Updated: {lastUpdated})
            </span>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => fetchAttendanceLogs(true)} 
              disabled={isRefreshing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Refresh Attendance Logs"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        )}
      </div>

      {/* Date Filter & Period Bar (Weekly / Monthly / Date Range / Today) */}
      {activeTab !== 'Leave' && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={16} /> Period:
            </span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button 
                className={`btn btn-sm ${dateFilterMode === 'today' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDateFilterMode('today')}
              >
                Today
              </button>
              <button 
                className={`btn btn-sm ${dateFilterMode === 'week' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDateFilterMode('week')}
              >
                Weekly
              </button>
              <button 
                className={`btn btn-sm ${dateFilterMode === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDateFilterMode('month')}
              >
                Monthly
              </button>
              <button 
                className={`btn btn-sm ${dateFilterMode === 'range' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDateFilterMode('range')}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Conditional Inputs for Date Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {dateFilterMode === 'month' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Month:</span>
                <input 
                  type="month" 
                  max={todayStr.slice(0, 7)}
                  className="form-control btn-sm" 
                  style={{ width: '150px' }} 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)} 
                />
              </div>
            )}

            {dateFilterMode === 'range' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From:</span>
                  <input 
                    type="date" 
                    max={todayStr}
                    className="form-control btn-sm" 
                    style={{ width: '140px' }} 
                    value={dateFrom} 
                    onChange={e => setDateFrom(e.target.value)} 
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To:</span>
                  <input 
                    type="date" 
                    max={todayStr}
                    className="form-control btn-sm" 
                    style={{ width: '140px' }} 
                    value={dateTo} 
                    onChange={e => setDateTo(e.target.value)} 
                  />
                </div>
              </div>
            )}

            {dateFilterMode === 'week' && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
                Showing Week to Date ({formatDate(defaultWeekRange.start)} to {formatDate(defaultWeekRange.end)})
              </div>
            )}
            
            {dateFilterMode === 'today' && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
                Showing Records for Today ({formatDate(todayStr)})
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'Intern' ? (
        <div className="grid-split">
          <div className="card" style={{ flex: 2 }}>
            
            {/* Intern Controls Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              {selectedInternDetail ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={handleBackToAllInterns} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ArrowLeft size={16} /> Back to All Interns
                  </button>
                  <h3 style={{ margin: 0 }}>
                    <BarChart3 size={18} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />
                    {selectedInternDetail.name} — Attendance Report
                  </h3>
                </div>
              ) : (
                <h3 style={{ margin: 0 }}>
                  Intern Attendance {selectedIntern ? `— ${interns.find(i => i.id.toString() === selectedIntern)?.name || 'Selected Intern'}` : '— All Interns'}
                </h3>
              )}

              {!isIntern && !selectedInternDetail && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {!isMentor && (
                    <select 
                      className="form-control btn-sm" 
                      style={{ width: '160px' }} 
                      value={selectedMentor} 
                      onChange={e => handleMentorFilterChange(e.target.value)}
                    >
                      <option value="">All Trainers</option>
                      {mentors.filter(m => m.role === 'Mentor').map(m => (
                        <option key={m.user_id} value={m.user_id}>{m.name}</option>
                      ))}
                    </select>
                  )}

                  <select 
                    className="form-control btn-sm" 
                    style={{ width: '200px' }} 
                    value={selectedIntern} 
                    onChange={e => { 
                      setSelectedIntern(e.target.value); 
                      setSelectedInternDetail(null); 
                    }}
                  >
                    <option value="">All Interns {selectedMentor ? `(Filtered)` : ''}</option>
                    {filteredInterns.map(i => <option key={i.id} value={i.id}>{i.name} ({i.technology})</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Attendance Analytics Charts */}
            {chartData && (
              <AttendanceCharts 
                data={chartData} 
                title={selectedInternDetail ? `${selectedInternDetail.name}'s Attendance Analytics` : (selectedIntern ? 'Individual Intern Analytics' : 'Cumulative Interns Performance')}
              />
            )}

            {/* Log Records Table */}
            {loading ? (
              <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>Loading attendance records...</div>
            ) : user?.role === 'Mentor' && !selectedInternDetail && !selectedIntern && dateFilterMode === 'month' ? (
              <TrainerMonthlyGrid monthStr={selectedMonth} logs={logs} interns={filteredInterns} todayStr={todayStr} />
            ) : displayedLogs.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                No intern attendance logs found for the selected period.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      {!isIntern && <th>Intern Name</th>}
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Notes</th>
                      {isHR && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLogs.map(log => {
                      const isLiveInside = log.check_in_time && !log.check_out_time && log.date === todayStr;
                      return (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 600 }}>{formatDate(log.date)}</td>
                          {!isIntern && (
                            <td>
                              <div 
                                style={{ 
                                  fontWeight: 600, 
                                  cursor: 'pointer', 
                                  color: 'var(--color-primary)', 
                                  textDecoration: 'underline',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem'
                                }}
                                onClick={() => handleInternClick(log.intern_id, log.intern_name)}
                              >
                                {log.intern_name}
                                {isLiveInside && (
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} title="Currently On Campus"></span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {log.mentor_name ? `${log.mentor_name} • ` : ''}{log.technology}
                              </div>
                            </td>
                          )}
                          <td>
                            {log.check_in_time ? (
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.check_in_time}</span>
                            ) : '-'}
                          </td>
                          <td>
                            {log.check_out_time ? (
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.check_out_time}</span>
                            ) : (
                              isLiveInside ? (
                                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>🟢 Active Now</span>
                              ) : '-'
                            )}
                          </td>
                          <td>{log.working_hours ? `${log.working_hours} hrs` : '-'}</td>
                          <td>
                            <span className={`badge ${
                              log.status === 'Present' ? 'badge-success' : 
                              log.status === 'Leave' ? 'badge-info' : 
                              log.status === 'Late' || log.status === 'Half Day' ? 'badge-warning' : 
                              log.status === 'Not Checked In' || log.status === 'Pending' ? 'badge-secondary' : 'badge-danger'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{log.comments || '-'}</td>
                          {isHR && (
                            <td>
                              {log.status === 'Leave' && !log.approved_by ? (
                                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                  <input 
                                    type="text" 
                                    className="form-control btn-sm" 
                                    style={{ width: '130px', height: '28px', fontSize: '0.75rem' }} 
                                    placeholder="Notes..." 
                                    value={approvalComments[log.id] || ''} 
                                    onChange={e => setApprovalComments({ ...approvalComments, [log.id]: e.target.value })} 
                                  />
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => handleApprove(log.id, 'Present')}>Approve</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleApprove(log.id, 'Absent')}>Deny</button>
                                  </div>
                                </div>
                              ) : log.approved_by ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <CheckCircle size={12} color="var(--color-success)" /> {log.approved_by_name}
                                </span>
                              ) : (
                                <button className="btn btn-secondary btn-sm" onClick={() => handleApprove(log.id, 'Present')}>Verify</button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column Widget: Director Live Oversight OR HR Mark Panel OR Intern Leave Form */}
          {isDirector ? (
            <DirectorLivePanel />
          ) : isIntern ? (
            <div className="card" style={{ flex: 1, height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.05rem' }}>
                  <CalendarDays size={18} color="var(--color-primary)" />
                  Leave Records
                </h3>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => handleTabChange('Leave')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                >
                  + Request Leave
                </button>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Submit time-off requests, track approval decisions from your Trainer & HR, and view your full leaves history.
              </p>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                onClick={() => handleTabChange('Leave')}
              >
                Open Leave Records & Approvals →
              </button>
            </div>
          ) : isHR ? (
            <HRMarkPanel title="Mark Intern Attendance" />
          ) : null}
        </div>
      ) : activeTab === 'Mentor' ? (
        /* Employee Attendance Tab */
        <div className="grid-split">
          <div className="card" style={{ flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {selectedMentor && (
                  <button className="btn btn-secondary btn-sm" onClick={handleBackToAllTrainers} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ArrowLeft size={16} /> All Employees
                  </button>
                )}
                <h3 style={{ margin: 0 }}>
                  Employee Attendance {selectedMentor ? `— ${mentors.find(m => m.user_id.toString() === selectedMentor)?.name || 'Selected Employee'}` : '— All Employees'}
                </h3>
              </div>

              {isHR && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select 
                    className="form-control btn-sm" 
                    style={{ width: '200px' }} 
                    value={selectedMentor} 
                    onChange={e => setSelectedMentor(e.target.value)}
                  >
                    <option value="">All Employees at a Time</option>
                    {mentors.map(m => (
                      <option key={m.user_id} value={m.user_id.toString()}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* If All Employees is selected by Director/HR, show Employee Summary Cards */}
            {!selectedMentor && trainersSummary.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Employee Performance Summary ({dateFilterMode === 'month' ? selectedMonth : dateFilterMode})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  {trainersSummary.map(tr => (
                    <div 
                      key={tr.user_id} 
                      className="card" 
                      style={{ 
                        padding: '1rem', 
                        cursor: 'pointer', 
                        border: '1px solid var(--border-color)', 
                        transition: 'all 0.2s',
                        background: 'var(--bg-secondary)' 
                      }}
                      onClick={() => setSelectedMentor(tr.user_id.toString())}
                      title="Click to view detailed attendance history"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{tr.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tr.department || 'Employee'}</div>
                        </div>
                        {tr.isCheckedInNow ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#ecfdf5', padding: '0.2rem 0.55rem', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                            <span className="pulse-dot" style={{ width: '7px', height: '7px', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
                            Logged In {tr.checkInTime ? `(${tr.checkInTime.slice(0, 5)})` : ''}
                          </span>
                        ) : tr.isOnLeave ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f0f9ff', padding: '0.2rem 0.5rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0ea5e9' }}></span>
                            On Leave
                          </span>
                        ) : tr.isCompletedToday ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94a3b8' }}></span>
                            Checked Out {tr.checkOutTime ? `(${tr.checkOutTime.slice(0, 5)})` : ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#cbd5e1' }}></span>
                            Logged Out
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.8rem' }}>
                        <div>Present: <strong>{tr.present}</strong></div>
                        <div>Rate: <strong style={{ color: 'var(--color-primary)' }}>{tr.rate}%</strong></div>
                        <div>Hours: <strong>{tr.totalHours} hrs</strong></div>
                        <div>Leave: <strong style={{ color: '#0ea5e9' }}>{tr.leave}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Employee Analytics Charts */}
            {mentorChartData && (
              <AttendanceCharts 
                data={mentorChartData} 
                title={selectedMentor ? `${mentors.find(m => m.user_id.toString() === selectedMentor)?.name || 'Employee'}'s Attendance Analytics` : 'All Employees Cumulative Performance'}
              />
            )}

            {/* Employee Table Records */}
            {loading ? (
              <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>Loading employee records...</div>
            ) : mentorLogs.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                No employee attendance logs found for the selected period.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      {isHR && <th>Employee</th>}
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Notes</th>
                      {isHR && <th>Audited By</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {mentorLogs.map(log => {
                      const isLiveInside = log.check_in_time && !log.check_out_time && log.date === todayStr;
                      return (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 600 }}>{formatDate(log.date)}</td>
                          {isHR && (
                            <td 
                              style={{ fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer' }}
                              onClick={() => setSelectedMentor(log.mentor_id.toString())}
                            >
                              {log.mentor_name}
                              {isLiveInside && (
                                <span style={{ marginLeft: '0.4rem', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} title="Active in Campus Now"></span>
                              )}
                            </td>
                          )}
                          <td>
                            {log.check_in_time ? (
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.check_in_time}</span>
                            ) : '-'}
                          </td>
                          <td>
                            {log.check_out_time ? (
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.check_out_time}</span>
                            ) : (
                              isLiveInside ? (
                                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>🟢 Active Now</span>
                              ) : '-'
                            )}
                          </td>
                          <td>{log.working_hours ? `${log.working_hours} hrs` : '-'}</td>
                          <td>
                            <span className={`badge ${
                              log.status === 'Present' ? 'badge-success' : 
                              log.status === 'Leave' ? 'badge-info' : 
                              log.status === 'Late' || log.status === 'Half Day' ? 'badge-warning' : 
                              log.status === 'Not Checked In' || log.status === 'Pending' ? 'badge-secondary' : 'badge-danger'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{log.comments || '-'}</td>
                          {isHR && <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.approved_by_name || 'System / Auto'}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Director Live Oversight OR HR Employee Mark Panel */}
          {isDirector ? (
            <DirectorLivePanel />
          ) : isHR ? (
            <HRMarkPanel title="Mark Employee Attendance" />
          ) : null}
        </div>
      ) : activeTab === 'HR' ? (
        /* HR Attendance Tab */
        <div className="grid-split">
          <div className="card" style={{ flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {selectedHR && isDirector && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedHR('')} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ArrowLeft size={16} /> All HR Staff
                  </button>
                )}
                <h3 style={{ margin: 0 }}>
                  HR Attendance {selectedHR ? `— ${hrUsers.find(h => h.user_id.toString() === selectedHR)?.name || 'Selected HR'}` : (isDirector ? '— All HR Staff' : `— ${user?.name}`)}
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {isDirector && hrUsers.length > 1 && (
                  <select 
                    className="form-control btn-sm" 
                    style={{ width: '200px' }} 
                    value={selectedHR} 
                    onChange={e => setSelectedHR(e.target.value)}
                  >
                    <option value="">All HR Staff at a Time</option>
                    {hrUsers.map(h => (
                      <option key={h.user_id} value={h.user_id.toString()}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                )}
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setHrForm({
                      hr_id: selectedHR || (hrUsers[0]?.user_id ? hrUsers[0].user_id.toString() : (user?.id ? user.id.toString() : '')),
                      date: todayStr,
                      check_in_time: '09:30:00',
                      check_out_time: '18:00:00',
                      status: 'Present',
                      comments: ''
                    });
                    setShowHRModal(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={15} /> Add / Adjust HR Record
                </button>
              </div>
            </div>

            {/* If All HR is selected by Director, show HR Summary Cards */}
            {!selectedHR && hrSummary.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  HR Staff Overview & Performance ({dateFilterMode === 'month' ? selectedMonth : dateFilterMode})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                  {hrSummary.map(hr => (
                    <div 
                      key={hr.user_id} 
                      className="card" 
                      style={{ 
                        padding: '1rem', 
                        cursor: 'pointer', 
                        border: '1px solid var(--border-color)', 
                        transition: 'all 0.2s',
                        background: 'var(--bg-secondary)' 
                      }}
                      onClick={() => isDirector && setSelectedHR(hr.user_id.toString())}
                      title={isDirector ? "Click to view detailed attendance history" : ""}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{hr.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{hr.department || hr.designation || 'Human Resources (HR)'}</div>
                        </div>
                        {hr.isCheckedInNow ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#ecfdf5', padding: '0.2rem 0.55rem', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                            <span className="pulse-dot" style={{ width: '7px', height: '7px', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
                            Logged In {hr.checkInTime ? `(${hr.checkInTime.slice(0, 5)})` : ''}
                          </span>
                        ) : hr.isOnLeave ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f0f9ff', padding: '0.2rem 0.5rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0ea5e9' }}></span>
                            On Leave
                          </span>
                        ) : hr.isCompletedToday ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94a3b8' }}></span>
                            Checked Out {hr.checkOutTime ? `(${hr.checkOutTime.slice(0, 5)})` : ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#cbd5e1' }}></span>
                            Logged Out
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.8rem' }}>
                        <div>Present: <strong>{hr.present}</strong></div>
                        <div>Attendance: <strong style={{ color: 'var(--color-primary)' }}>{hr.rate}%</strong></div>
                        <div>Total Hours: <strong>{hr.totalHours} hrs</strong></div>
                        <div>Leaves: <strong style={{ color: '#0ea5e9' }}>{hr.leave}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HR Analytics Charts */}
            {hrChartData && (
              <AttendanceCharts 
                data={hrChartData} 
                title={selectedHR ? `${hrUsers.find(h => h.user_id.toString() === selectedHR)?.name || 'HR'}'s Attendance Analytics` : 'HR Cumulative Performance Analytics'}
              />
            )}

            {/* HR Table Records */}
            {loading ? (
              <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>Loading HR records...</div>
            ) : hrLogs.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2.5rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                No HR attendance logs found for the selected period.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      {isDirector && <th>HR Name</th>}
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th>Audited By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hrLogs.map(log => {
                      const isLiveInside = log.check_in_time && !log.check_out_time && log.date === todayStr;
                      return (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 600 }}>{formatDate(log.date)}</td>
                          {isDirector && (
                            <td 
                              style={{ fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer' }}
                              onClick={() => setSelectedHR(log.hr_id.toString())}
                            >
                              {log.hr_name}
                              {isLiveInside && (
                                <span style={{ marginLeft: '0.4rem', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} title="Active in Campus Now"></span>
                              )}
                            </td>
                          )}
                          <td>
                            {log.check_in_time ? (
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.check_in_time}</span>
                            ) : '-'}
                          </td>
                          <td>
                            {log.check_out_time ? (
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.check_out_time}</span>
                            ) : (
                              isLiveInside ? (
                                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>🟢 Active Now</span>
                              ) : '-'
                            )}
                          </td>
                          <td>{log.working_hours ? `${log.working_hours} hrs` : '-'}</td>
                          <td>
                            <span className={`badge ${
                              log.status === 'Present' ? 'badge-success' : 
                              log.status === 'Leave' ? 'badge-info' : 
                              log.status === 'Late' || log.status === 'Half Day' ? 'badge-warning' : 
                              log.status === 'Not Checked In' || log.status === 'Pending' ? 'badge-secondary' : 'badge-danger'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{log.comments || '-'}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.approved_by_name || 'System / Auto'}</td>
                          <td>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              onClick={() => {
                                setHrForm({
                                  hr_id: log.hr_id.toString(),
                                  date: log.date,
                                  check_in_time: log.check_in_time || '09:30:00',
                                  check_out_time: log.check_out_time || '18:00:00',
                                  status: log.status,
                                  comments: log.comments || ''
                                });
                                setShowHRModal(true);
                              }}
                              title="Edit HR Attendance Record"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Director Live Oversight OR HR Self Mark Panel */}
          {isDirector ? (
            <DirectorLivePanel />
          ) : (
            <HRMarkPanel title="My HR Attendance" />
          )}
        </div>
      ) : activeTab === 'Leave' ? (
        <LeaveRequests user={user} />
      ) : null}

      {/* Modal: Add or Adjust HR Attendance Record */}
      {showHRModal && (
        <div className="modal-backdrop" onClick={() => setShowHRModal(false)}>
          <div className="modal-card card" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCog size={18} color="var(--color-primary)" />
                Add / Adjust HR Attendance
              </h3>
              <button 
                onClick={() => setShowHRModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHRLog} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>HR Staff Member *</label>
                <select 
                  className="form-control" 
                  value={hrForm.hr_id} 
                  onChange={e => setHrForm({ ...hrForm, hr_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose HR Staff Member --</option>
                  {hrUsers.map(h => (
                    <option key={h.user_id} value={h.user_id.toString()}>
                      {h.name} ({h.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Date *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={hrForm.date} 
                  max={todayStr}
                  onChange={e => setHrForm({ ...hrForm, date: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Check In Time</label>
                  <input 
                    type="time" 
                    step="1"
                    className="form-control" 
                    value={hrForm.check_in_time} 
                    onChange={e => setHrForm({ ...hrForm, check_in_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Check Out Time</label>
                  <input 
                    type="time" 
                    step="1"
                    className="form-control" 
                    value={hrForm.check_out_time} 
                    onChange={e => setHrForm({ ...hrForm, check_out_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Attendance Status *</label>
                <select 
                  className="form-control" 
                  value={hrForm.status} 
                  onChange={e => setHrForm({ ...hrForm, status: e.target.value })}
                  required
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Comments / Notes</label>
                <textarea 
                  className="form-control" 
                  rows={2} 
                  placeholder="Reason for adjustment, regular workday, audit note..."
                  value={hrForm.comments}
                  onChange={e => setHrForm({ ...hrForm, comments: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowHRModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save HR Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
