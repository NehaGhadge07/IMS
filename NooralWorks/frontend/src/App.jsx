import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './services/api';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InternsList from './pages/InternsList';
import InternDetail from './pages/InternDetail';
import Attendance from './pages/Attendance';
import Tasks from './pages/Tasks';
import DailyLogs from './pages/DailyLogs';
import FeeManagement from './pages/FeeManagement';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import TeamLeads from './pages/TeamLeads';
import Enquiries from './pages/Enquiries';
import LeaveRequests from './pages/LeaveRequests';
import UserProfile from './pages/UserProfile';
import HelpDesk from './pages/HelpDesk';
import Placements from './pages/Placements';
import PlacementDetail from './pages/PlacementDetail';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('UI Render Error caught by boundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem', maxWidth: '600px', margin: '4rem auto', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.4rem' }}>Something went wrong loading this view</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{this.state.error?.message || 'Unexpected application error.'}</p>
          <button 
            onClick={() => { window.location.href = '/dashboard'; }}
            style={{ padding: '0.6rem 1.4rem', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const activeUser = api.getUser();
      const token = api.getToken();
      if (activeUser && token) {
        try {
          // Verify token is still valid
          const me = await api.getMe();
          setUser({ ...activeUser, ...me.user });
        } catch (err) {
          api.logout();
          setUser(null);
        }
      }
      setCheckingAuth(false);
    };
    initAuth();
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  if (checkingAuth) {
    return <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Verifying security session...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route 
          path="/login" 
          element={!user ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard" replace />} 
        />

        {/* Private Layout Protected Routes */}
        <Route 
          path="/*" 
          element={
            user ? (
              <ErrorBoundary>
                <DashboardLayout user={user} onUserUpdate={setUser}>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard user={user} />} />
                  
                  {/* Intern management routes */}
                  <Route path="/interns" element={
                    ['HR', 'Director', 'Mentor'].includes(user.role) 
                      ? <InternsList user={user} /> 
                      : <Navigate to="/dashboard" />
                  } />
                  
                  <Route path="/team-leads" element={
                    ['HR', 'Director'].includes(user.role) 
                      ? <TeamLeads user={user} /> 
                      : <Navigate to="/dashboard" />
                  } />
                  
                  <Route path="/profile" element={<UserProfile user={user} setUser={setUser} />} />
                  
                  <Route path="/interns/:id" element={<InternDetail user={user} />} />
                  
                  {/* General modules */}
                  <Route path="/attendance" element={<Attendance user={user} />} />
                  <Route path="/tasks" element={<Tasks user={user} />} />
                  <Route path="/daily-logs" element={
                    ['HR', 'Director', 'Mentor'].includes(user.role) 
                      ? <DailyLogs user={user} /> 
                      : <Navigate to="/dashboard" replace />
                  } />
                  <Route path="/leave" element={<Navigate to="/attendance?tab=leave" replace />} />
                  <Route path="/helpdesk" element={<HelpDesk user={user} />} />
                  <Route path="/placements" element={
                    ['HR', 'Director', 'Mentor'].includes(user.role) 
                      ? <Placements user={user} /> 
                      : <Navigate to="/dashboard" />
                  } />
                  <Route path="/placements/:id" element={
                    ['HR', 'Director', 'Mentor'].includes(user.role) 
                      ? <PlacementDetail user={user} /> 
                      : <Navigate to="/dashboard" />
                  } />
                  
                  {/* Fee collection and documents (restricted) */}
                  <Route path="/fees" element={
                    ['HR', 'Director', 'Intern'].includes(user.role)
                      ? <FeeManagement user={user} />
                      : <Navigate to="/dashboard" />
                  } />
                  
                  <Route path="/documents" element={
                    ['HR', 'Director', 'Intern'].includes(user.role)
                      ? <Documents user={user} />
                      : <Navigate to="/dashboard" />
                  } />

                  {/* Reports export */}
                  <Route path="/reports" element={
                    ['HR', 'Director', 'Mentor'].includes(user.role)
                      ? <Reports user={user} />
                      : <Navigate to="/dashboard" />
                  } />

                  <Route path="/enquiries" element={
                    ['HR', 'Director'].includes(user.role)
                      ? <Enquiries user={user} />
                      : <Navigate to="/dashboard" />
                  } />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </ErrorBoundary>
            </DashboardLayout>
          </ErrorBoundary>
        ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
