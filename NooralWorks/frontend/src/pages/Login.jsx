import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import iicetLogo from '../assets/iicet_logo.png';
import { Eye, EyeOff } from 'lucide-react';

const ROLES = [
  { value: 'Intern', label: 'Intern' },
  { value: 'Mentor', label: 'Trainer' },
  { value: 'HR', label: 'HR' },
  { value: 'Director', label: 'Director' },
];

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password || !selectedRole) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.loginPassword(email.trim().toLowerCase(), password, selectedRole.value);
      api.setToken(data.token);
      api.setUser(data.user);
      onLoginSuccess(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.1; transform: scale(1); }
            50% { opacity: 0.15; transform: scale(1.05); }
          }
          .login-info-panel {
            flex: 1.2;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 4rem;
            background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
            color: #fff;
            position: relative;
            overflow: hidden;
          }
          .login-form-panel {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background: #f8fafc;
            position: relative;
          }
          .login-form-panel::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
            background-size: 24px 24px;
            opacity: 0.4;
            pointer-events: none;
          }
          @media (max-width: 900px) {
            .login-info-panel { display: none; }
          }
          .role-card {
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            background: white;
          }
          .role-card:hover {
            border-color: var(--color-primary);
            background: #f1f5f9;
          }
          .role-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }
        `}
      </style>

      {/* Left Column: System Info & Doodles */}
      <div className="login-info-panel">
        <svg style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60%', animation: 'pulse-slow 8s infinite' }} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,89.1,-0.5C88.1,15.3,83.5,30.6,74.2,43.3C64.9,56,50.8,66,35.3,71.5C19.8,77,2.8,78,-13.4,75.4C-29.7,72.8,-45.3,66.6,-58.5,56.2C-71.8,45.8,-82.7,31.2,-87.4,14.6C-92.1,-2,-90.6,-20.5,-83.1,-36.2C-75.6,-51.9,-62,-64.7,-46.6,-71.4C-31.2,-78.1,-15.6,-78.7,0.7,-79.9C17,-81.1,34,-82.9,44.7,-76.4Z" transform="translate(100 100)" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '70%', animation: 'pulse-slow 10s infinite' }} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="#FFFFFF" d="M60.1,-63.3C76.9,-53.4,88.7,-34.5,91.8,-14.8C95,4.9,89.5,25.4,77.3,42.4C65.2,59.3,46.5,72.6,26,79.5C5.4,86.5,-16.8,87.1,-36,79.7C-55.2,72.2,-71.3,56.7,-81.1,38.3C-91,19.9,-94.6,-1.3,-88.9,-20.3C-83.3,-39.3,-68.3,-56.1,-50.2,-65.4C-32,-74.7,-16,-76.6,2.1,-79.1C20.3,-81.6,40.5,-84.7,60.1,-63.3Z" transform="translate(100 100)" />
        </svg>
        <svg style={{ position: 'absolute', top: '20%', right: '15%', width: '90px', opacity: 0.8, animation: 'float 6s ease-in-out infinite' }} viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          <path d="M2 12h20"></path>
        </svg>
        <svg style={{ position: 'absolute', bottom: '25%', left: '10%', width: '70px', opacity: 0.9, animation: 'float 5s ease-in-out infinite reverse' }} viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        
        <div style={{ position: 'relative', zIndex: 10, paddingLeft: '2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: '20px', display: 'inline-block', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Nooral Works Management System
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.15 }}>
            Empower Your <br/><span style={{ color: '#fcd34d' }}>Professional Journey</span>
          </h1>
          <p style={{ fontSize: '1.15rem', opacity: 0.9, marginBottom: '3rem', maxWidth: '420px', lineHeight: 1.6 }}>
            The all-in-one console designed to seamlessly track attendance, manage tasks, and streamline your professional growth.
          </p>
        </div>
      </div>
      
      {/* Right Column: Login Card */}
      <div className="login-form-panel">
        <div className="card login-card" style={{ width: '100%', maxWidth: '420px', zIndex: 10, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div className="brand" style={{ justifyContent: 'center', marginBottom: '0.75rem', flexDirection: 'column', gap: '0.5rem' }}>
              <img src={iicetLogo} alt="IICET Logo" style={{ height: '70px', width: 'auto', marginBottom: '0.5rem', objectFit: 'contain' }} />
              <div className="brand-name" style={{ fontSize: '1.25rem', fontWeight: 800 }}>IICET Services Pvt. Ltd.</div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Unified Operations Console</p>
          </div>

          {error && (
            <div className="badge badge-danger" style={{ width: '100%', padding: '0.65rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: '0.83rem' }}>
              {error}
            </div>
          )}

          {!selectedRole ? (
            <div>
              <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Select Your Role</h3>
              <div className="role-grid">
                {ROLES.map(r => (
                  <div key={r.value} className="role-card" onClick={() => setSelectedRole(r)}>
                    <h4 style={{ margin: 0 }}>{r.label}</h4>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} autoComplete="off">
              <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>{selectedRole.label} Login</h3>
              
              <div className="form-group">
                <label>Email Address / Username</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="off"
                  name="email_login"
                />
              </div>
              
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    name="password_login"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                onClick={() => { setSelectedRole(null); setEmail(''); setPassword(''); setError(null); }}
                disabled={loading}
              >
                Back to Role Selection
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
