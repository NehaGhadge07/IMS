import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { 
  LayoutDashboard, 
  Users, 
  User,
  Calendar, 
  BookOpen, 
  CheckSquare, 
  FileText, 
  IndianRupee, 
  ShieldAlert, 
  Bell, 
  LogOut,
  FolderLock,
  Download,
  ShieldCheck,
  Briefcase,
  PhoneCall,
  CalendarDays,
  HelpCircle,
  CheckCircle2,
  X,
  ExternalLink,
  Trash2,
  CheckCheck,
  Sparkles
} from 'lucide-react';

import iicetLogo from '../assets/iicet_logo.png';

const getInitials = (name) => {
  if (!name) return <User size={16} />;
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Subtle Web Audio API chime tone
const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch (e) {
    // silently ignore browser audio restrictions
  }
};

export default function DashboardLayout({ children, user, onUserUpdate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [company, setCompany] = useState({ name: 'IICET Services Private Limited' });

  const seenNotificationIdsRef = useRef(new Set());
  const isFirstCheckRef = useRef(true);
  const notificationContainerRef = useRef(null);

  // Trigger floating on-screen toast popup
  const triggerToast = (notif) => {
    const toastId = `${notif.id}-${Date.now()}`;
    const newToast = {
      toastId,
      notifId: notif.id,
      title: notif.title || 'New Notification Alert',
      message: notif.message || '',
      created_at: notif.created_at || new Date().toISOString()
    };

    setToasts(prev => [newToast, ...prev.filter(t => t.notifId !== notif.id).slice(0, 2)]);
    playNotificationChime();

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, 10000);
  };

  const dismissToast = (toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  };

  // Navigate to appropriate section based on notification content
  const navigateNotificationRoute = (title = '', message = '') => {
    const text = `${title} ${message}`.toLowerCase();
    if (text.includes('task') || text.includes('mock') || text.includes('interview')) {
      navigate('/tasks');
    } else if (text.includes('attendance') || text.includes('check-in') || text.includes('absent')) {
      navigate('/attendance');
    } else if (text.includes('leave')) {
      navigate('/attendance?tab=leave');
    } else if (text.includes('training') || text.includes('session')) {
      navigate('/dashboard');
    } else if (text.includes('help desk') || text.includes('query') || text.includes('ticket')) {
      navigate('/helpdesk');
    } else if (text.includes('daily log') || text.includes('log')) {
      navigate('/daily-logs');
    } else if (text.includes('fee') || text.includes('payment') || text.includes('receipt')) {
      navigate('/fees');
    } else if (text.includes('document') || text.includes('resume') || text.includes('letter')) {
      navigate('/documents');
    } else if (text.includes('enquiry') || text.includes('lead')) {
      navigate('/enquiries');
    } else {
      navigate('/dashboard');
    }
  };

  const handleToastView = async (toast) => {
    dismissToast(toast.toastId);
    try {
      await api.markNotificationRead(toast.notifId);
      setNotifications(prev => prev.filter(n => n.id !== toast.notifId));
    } catch (e) {}
    navigateNotificationRoute(toast.title, toast.message);
  };

  const handleToastMarkRead = async (toast) => {
    dismissToast(toast.toastId);
    try {
      await api.markNotificationRead(toast.notifId);
      setNotifications(prev => prev.filter(n => n.id !== toast.notifId));
    } catch (e) {}
  };

  // Fetch notifications with real-time detection of new alerts
  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications({ unread: true });
      if (!Array.isArray(data)) return;

      const unreadList = data.filter(n => !n.is_read || Number(n.is_read) === 0);

      if (isFirstCheckRef.current) {
        isFirstCheckRef.current = false;
        // If there are unread notifications upon opening the app, pop up the most recent one!
        if (unreadList.length > 0) {
          const latest = unreadList[0];
          seenNotificationIdsRef.current.add(latest.id);
          triggerToast(latest);
        }
        // Remember existing unread items so we don't spam multiple old toasts
        unreadList.forEach(item => seenNotificationIdsRef.current.add(item.id));
      } else {
        // Subsequent polling or real-time event:
        // Any unread notification not yet displayed as a toast pops up immediately!
        const newlyReceived = [];
        unreadList.forEach(item => {
          if (!seenNotificationIdsRef.current.has(item.id)) {
            seenNotificationIdsRef.current.add(item.id);
            newlyReceived.push(item);
          }
        });

        if (newlyReceived.length > 0) {
          newlyReceived.slice(0, 2).forEach(item => triggerToast(item));
        }
      }

      setNotifications(unreadList);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  // Fetch company info
  const fetchCompany = async () => {
    try {
      const data = await api.getCompany();
      setCompany(data);
    } catch (err) {
      console.error('Failed to load company info:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchCompany();
    // Fast 3.5-second polling for real-time notification alerts
    const interval = setInterval(() => {
      fetchNotifications();
      fetchCompany();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Listen to cross-component notification-refresh custom events
  useEffect(() => {
    const handleRefresh = () => fetchNotifications();
    window.addEventListener('notification-refresh', handleRefresh);
    return () => window.removeEventListener('notification-refresh', handleRefresh);
  }, []);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationContainerRef.current && !notificationContainerRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-mark notifications as read when visiting respective tab
  useEffect(() => {
    const p = location.pathname;
    let cat = null;
    if (p.startsWith('/tasks')) cat = 'tasks';
    else if (p.startsWith('/attendance')) cat = 'attendance';
    else if (p.startsWith('/helpdesk')) cat = 'helpdesk';
    else if (p.startsWith('/documents')) cat = 'documents';
    else if (p.startsWith('/training')) cat = 'training';

    if (cat) {
      api.markCategoryNotificationsRead(cat).then(() => {
        fetchNotifications();
      }).catch(() => {});
    }
  }, [location.pathname]);

  // When user toggles notification bell:
  const handleToggleNotifications = () => {
    setShowNotifications(prev => !prev);
    // Dismiss any active floating on-screen toasts
    setToasts([]);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    onUserUpdate(null);
    navigate('/login');
  };

  // Mark single notification as read and remove from recent notifications immediately
  const handleMarkSingleRead = async (e, notifId) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(notifId);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      setToasts(prev => prev.filter(t => t.notifId !== notifId));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read and remove all from recent notifications immediately
  const handleMarkAllRead = async (e) => {
    if (e) e.stopPropagation();
    try {
      await api.markAllNotificationsRead();
      setNotifications([]);
      setToasts([]);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleClearAll = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    try {
      await api.clearAllNotifications();
      setNotifications([]);
      setToasts([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const handleSendTestAlert = async (e) => {
    e.stopPropagation();
    try {
      await api.sendTestNotification();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to trigger test notification:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await api.markNotificationRead(notif.id);
        setNotifications(prev => prev.filter(item => item.id !== notif.id));
        setToasts(prev => prev.filter(t => t.notifId !== notif.id));
      }
      setShowNotifications(false);
      navigateNotificationRoute(notif.title, notif.message);
    } catch (err) {
      console.error(err);
    }
  };




  // Check roles permissions
  const showLink = (allowedRoles) => {
    return allowedRoles.includes(user?.role);
  };

  const currentPath = location.pathname;

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'Interns', path: '/interns', icon: Users, show: showLink(['HR', 'Director', 'Mentor']) },
    { name: 'Trainers', path: '/team-leads', icon: ShieldCheck, show: showLink(['HR', 'Director']) },
    { name: 'Profile', path: '/profile', icon: User, show: true },
    { name: 'Attendance', path: '/attendance', icon: Calendar, show: true },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare, show: true },
    { name: 'Daily Logs', path: '/daily-logs', icon: FileText, show: showLink(['HR', 'Director', 'Mentor']) },
    { name: 'Help Desk', path: '/helpdesk', icon: HelpCircle, show: showLink(['Intern', 'Mentor', 'HR', 'Director']) },
    { name: 'Placement Record', path: '/placements', icon: Briefcase, show: showLink(['Mentor', 'HR', 'Director']) },
    { name: 'Fee Collection', path: '/fees', icon: IndianRupee, show: showLink(['HR', 'Director', 'Intern']) },
    { name: 'Documents', path: '/documents', icon: FolderLock, show: showLink(['HR', 'Director', 'Intern']) },
    { name: 'Reports', path: '/reports', icon: Download, show: showLink(['HR', 'Director', 'Mentor']) },
    { name: 'Enquiries', path: '/enquiries', icon: PhoneCall, show: showLink(['HR', 'Director']) }
  ];

  // Only display unread notifications - once marked as read, they are removed from the list
  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => !n.is_read || Number(n.is_read) === 0);
  }, [notifications]);

  const unreadCount = unreadNotifications.length;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <img src={iicetLogo} alt="IICET Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>IICET</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>SERVICES PRIVATE LIMITED</span>
          </div>
        </div>
        
        <nav className="nav-links">
          {menuItems.filter(item => item.show).map(item => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <a
                key={item.name}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </a>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1px solid var(--border-color)',
              marginBottom: '0.65rem', 
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              boxShadow: 'var(--shadow-xs)'
            }} 
            onClick={() => navigate('/profile')} 
            title="View Profile & Settings"
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            {user?.profile_photo ? (
              <img src={`/uploads/${user.profile_photo}`} alt="Avatar" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${varIconColor(user?.role)}`, boxShadow: `0 0 10px ${varIconColor(user?.role)}33` }} />
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: varIconColor(user?.role), border: `2px solid ${varIconColor(user?.role)}`, boxShadow: `0 0 10px ${varIconColor(user?.role)}33` }}>
                {getInitials(user?.name)}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', overflow: 'hidden' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: varIconColor(user?.role) }}></span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {user?.role === 'Director' ? 'Director' : (user?.role === 'HR' ? 'HR Manager' : (user?.role === 'Mentor' ? 'Trainer' : 'Intern'))}
                </span>
              </div>
            </div>
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ width: '100%', gap: '0.4rem', fontSize: '0.82rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, borderRadius: 'var(--radius-md)' }} 
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="main-content">
        <header className="top-header">
          <div className="header-title">
            {currentPath === '/dashboard' ? (
              <div>
                <h1 style={{ marginBottom: '0.15rem', fontSize: '1.9rem', fontWeight: '800', lineHeight: 1.15, letterSpacing: '-0.03em' }}>
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour < 12) return 'Good Morning';
                    if (hour < 18) return 'Good Afternoon';
                    return 'Good Evening';
                  })()}, <span style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>{user?.name || 'User'}</span>
                </h1>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600', margin: 0, lineHeight: 1.3 }}>
                  {user?.role === 'Director' ? 'Managing Director' : user?.role === 'HR' ? 'Human Resources (HR)' : user?.role === 'Mentor' ? (user?.details?.department ? (user.details.department.toLowerCase().includes('trainer') ? user.details.department : `${user.details.department} Trainer`) : 'Trainer') : 'Intern Associate'} — IICET Services Private Limited
                </p>
              </div>
            ) : (
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>{menuItems.find(i => i.path === currentPath)?.name || 'Platform'}</h1>
            )}
          </div>

          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Live Status & Date Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.85rem',
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-full)',
              boxShadow: 'var(--shadow-xs)',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-secondary)'
            }}>
              <span className="pulse-dot" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            {/* Notification Bell */}
            <div className="notification-bell-container" ref={notificationContainerRef}>
              <button 
                className="notification-bell" 
                onClick={handleToggleNotifications}
                title="Notifications & Updates"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="notifications-dropdown card" style={{ width: '380px', maxHeight: '480px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Notifications</h3>
                      <span style={{ 
                        fontSize: '0.68rem', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        background: unreadCount > 0 ? '#fee2e2' : '#ecfdf5', 
                        color: unreadCount > 0 ? '#b91c1c' : '#047857', 
                        fontWeight: 700 
                      }}>
                        {unreadCount > 0 ? `${unreadCount} Unread` : '0 Pending'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {unreadCount > 0 && (
                        <button 
                          style={{ 
                            background: 'rgba(16, 185, 129, 0.1)', 
                            border: '1px solid rgba(16, 185, 129, 0.3)', 
                            color: '#059669', 
                            fontSize: '0.72rem', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={handleMarkAllRead}
                          title="Mark all notifications as read and clear list"
                        >
                          <CheckCheck size={12} />
                          <span>Mark all read</span>
                        </button>
                      )}

                      <button 
                        style={{ 
                          background: 'rgba(79, 70, 229, 0.08)', 
                          border: '1px solid rgba(79, 70, 229, 0.25)', 
                          color: 'var(--color-primary)', 
                          fontSize: '0.72rem', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '3px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                        onClick={handleSendTestAlert}
                        title="Send a sample notification to test pop-up"
                      >
                        <Sparkles size={12} />
                        <span>Test</span>
                      </button>

                      {unreadCount > 0 && (
                        <button 
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#64748b', 
                            fontSize: '0.74rem', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '3px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                          onClick={handleClearAll}
                          title="Clear all notifications"
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {unreadCount === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={32} style={{ color: '#10b981', opacity: 0.85 }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>No unread notifications</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All notifications have been marked as read!</span>
                    </div>
                  ) : (
                    unreadNotifications.map(n => {
                      const mod = getNotificationModule(n.title, n.message);
                      return (
                        <div 
                          key={n.id} 
                          className="notification-item notification-item-unread"
                          style={{ 
                            cursor: 'pointer', 
                            position: 'relative',
                            borderRadius: '8px',
                            border: '1px solid #e0e7ff',
                            background: '#ffffff',
                            padding: '0.75rem',
                            marginBottom: '0.45rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => handleNotificationClick(n)}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#6366f1';
                            e.currentTarget.style.background = '#faf5ff';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#e0e7ff';
                            e.currentTarget.style.background = '#ffffff';
                          }}
                          title="Click to view module details"
                        >
                          {/* Top Badges & Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ 
                                fontSize: '0.68rem', 
                                fontWeight: 700, 
                                padding: '2px 7px', 
                                borderRadius: '4px',
                                color: mod.color,
                                background: mod.bg,
                                border: `1px solid ${mod.border}`
                              }}>
                                {mod.name}
                              </span>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} title="Unread notification" />
                            </div>

                            {/* Per-item Mark as read button */}
                            <button
                              onClick={(e) => handleMarkSingleRead(e, n.id)}
                              style={{
                                background: '#f0fdf4',
                                border: '1px solid #86efac',
                                color: '#15803d',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s ease'
                              }}
                              title="Mark as read and remove from recent notifications"
                              onMouseEnter={e => {
                                e.currentTarget.style.background = '#15803d';
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = '#f0fdf4';
                                e.currentTarget.style.color = '#15803d';
                              }}
                            >
                              <CheckCheck size={12} />
                              <span>Mark as read</span>
                            </button>
                          </div>

                          {/* Title & Message */}
                          <div className="notification-item-title" style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                            {n.title}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.4, marginBottom: '0.35rem' }}>
                            {n.message}
                          </div>

                          {/* Footer Info */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: '0.25rem', borderTop: '1px dashed #f1f5f9' }}>
                            <span>{formatTime(n.created_at)}</span>
                            <span style={{ color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                              Open update <ExternalLink size={11} />
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <div style={{ padding: '0 1.75rem 1.75rem 1.75rem', flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </main>

      {/* On-Screen Floating Notification Pop-up Alerts */}
      {toasts.length > 0 && (
        <div className="notification-toast-container">
          {toasts.map(toast => (
            <div key={toast.toastId} className="notification-toast">
              <div className="notification-toast-header">
                <span className="notification-toast-badge">
                  <span className="pulse-dot" style={{ backgroundColor: '#ef4444', width: 8, height: 8 }} />
                  New Notification Alert
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Just Now</span>
                  <button 
                    className="notification-toast-close"
                    onClick={() => dismissToast(toast.toastId)}
                    title="Dismiss alert"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
              
              <div className="notification-toast-body" onClick={() => handleToastView(toast)}>
                <div className="notification-toast-icon">
                  <Bell size={20} />
                </div>
                <div className="notification-toast-content">
                  <div className="notification-toast-title">{toast.title}</div>
                  <div className="notification-toast-message">{toast.message}</div>
                </div>
              </div>

              <div className="notification-toast-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem', borderRadius: '6px', gap: '0.3rem' }}
                  onClick={() => handleToastMarkRead(toast)}
                >
                  <CheckCheck size={13} />
                  <span>Mark Read</span>
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.74rem', padding: '0.35rem 0.85rem', borderRadius: '6px', gap: '0.35rem', fontWeight: 700 }}
                  onClick={() => handleToastView(toast)}
                >
                  <span>View Update</span>
                  <ExternalLink size={13} />
                </button>
              </div>

              <div className="notification-toast-progress" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helpers
function varIconColor(role) {
  if (role === 'Director') return '#ef4444';
  if (role === 'HR') return '#a855f7';
  if (role === 'Mentor') return '#0ea5e9';
  return '#10b981';
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function getNotificationModule(title = '', message = '') {
  const text = `${title} ${message}`.toLowerCase();
  if (text.includes('task') || text.includes('mock') || text.includes('interview')) {
    return { name: 'Tasks', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' };
  } else if (text.includes('leave')) {
    return { name: 'Leave', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' };
  } else if (text.includes('attendance') || text.includes('check-in') || text.includes('absent')) {
    return { name: 'Attendance', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
  } else if (text.includes('help desk') || text.includes('ticket') || text.includes('query')) {
    return { name: 'Help Desk', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  } else if (text.includes('daily log') || text.includes('log')) {
    return { name: 'Daily Logs', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  } else if (text.includes('fee') || text.includes('payment') || text.includes('receipt')) {
    return { name: 'Fees', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
  } else if (text.includes('document') || text.includes('resume') || text.includes('letter')) {
    return { name: 'Documents', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' };
  } else if (text.includes('train') || text.includes('session')) {
    return { name: 'Training', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
  } else if (text.includes('enquiry') || text.includes('lead')) {
    return { name: 'Enquiries', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
  }
  return { name: 'Updates', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };
}
