import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import iicetLogo from '../assets/iicet_logo.png';
import { 
  User, 
  Briefcase, 
  Award, 
  Users, 
  CheckCircle, 
  Mail,
  Camera,
  Trash2,
  Building2,
  Building,
  MapPin,
  Shield,
  ShieldCheck,
  FileText,
  FileCheck,
  Phone,
  Calendar,
  GraduationCap,
  Code,
  Clock,
  Globe,
  ExternalLink,
  CheckCircle2,
  Hash,
  Copy,
  Check,
  Edit3,
  Send,
  AlertCircle
} from 'lucide-react';

export default function UserProfile({ user, setUser }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ internCount: 0 });
  const [uploading, setUploading] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ name: '', email: '' });
  const [updatePhoto, setUpdatePhoto] = useState(null);
  const fileInputRef = useRef(null);
  const updateFileInputRef = useRef(null);

  // Company Profile State (for Director)
  const [company, setCompany] = useState({
    name: 'IICET Services Private Limited',
    cin: 'U85306PN2024PTC227572',
    gstin: '27AAAAA1111A1Z1',
    pan: 'AACCI8530P',
    email: 'enquiry@iicet.com',
    phone: '+91 84858 19119, +91 77578 98255',
    address: '1st Floor, HB Tower, near Bata Showroom, Powai Naka, Satara, Maharashtra 415001, India',
    website: 'https://iicet.com',
    director_name: 'Director',
    logo_url: '/iicet_logo.png'
  });
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: 'IICET Services Private Limited',
    cin: 'U85306PN2024PTC227572',
    gstin: '27AAAAA1111A1Z1',
    pan: 'AACCI8530P',
    email: 'enquiry@iicet.com',
    phone: '+91 84858 19119, +91 77578 98255',
    address: '1st Floor, HB Tower, near Bata Showroom, Powai Naka, Satara, Maharashtra 415001, India',
    website: 'https://iicet.com',
    director_name: 'Director'
  });
  const [companySaving, setCompanySaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // SMTP Protocol State (for HR & Director)
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [testEmailAddr, setTestEmailAddr] = useState('neha.12ghadge@gmail.com');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);

  useEffect(() => {
    if (user?.role === 'HR' || user?.role === 'Director') {
      api.getSmtpStatus().then(setSmtpStatus).catch(() => {});
    }
  }, [user]);

  const handleSendTestEmail = async () => {
    if (!testEmailAddr) return;
    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const res = await api.sendTestEmail(testEmailAddr);
      setTestEmailResult({ type: 'success', message: res.message });
      api.getSmtpStatus().then(setSmtpStatus).catch(() => {});
    } catch (err) {
      setTestEmailResult({ type: 'error', message: err.message || 'Failed to dispatch test email.' });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getValidUrl = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  };

  const getInitials = (name) => {
    if (!name) return <User size={48} />;
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const fetchProfile = async () => {
    try {
      const me = await api.getMe();
      setProfileData(me.user);
      if (setUser) {
        setUser(prev => ({ ...prev, ...me.user }));
      }

      if (me.user.role === 'Mentor') {
        const mentorsList = await api.getMentors();
        const myStats = mentorsList.find(m => m.user_id === me.user.id);
        if (myStats) {
          setStats({ internCount: myStats.intern_count });
        }
      }

      if (me.user.role === 'Director') {
        fetchCompany(me.user.name);
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompany = async (directorFallbackName) => {
    try {
      const data = await api.getCompany();
      if (data) {
        setCompany(data);
        setCompanyForm({
          name: data.name || 'IICET Services Private Limited',
          cin: data.cin || 'U85306PN2024PTC227572',
          gstin: data.gstin || '27AAAAA1111A1Z1',
          pan: data.pan || 'AACCI8530P',
          email: data.email || 'enquiry@iicet.com',
          phone: data.phone || '+91 84858 19119, +91 77578 98255',
          address: data.address || '1st Floor, HB Tower, near Bata Showroom, Powai Naka, Satara, Maharashtra 415001, India',
          website: data.website || 'https://iicet.com',
          director_name: data.director_name || directorFallbackName || 'Director'
        });
      }
    } catch (e) {
      console.warn('Failed to fetch company profile:', e);
    }
  };

  const handleUpdateCompanySubmit = async (e) => {
    e.preventDefault();
    setCompanySaving(true);
    try {
      await api.updateCompany(companyForm);
      await fetchCompany();
      setShowCompanyModal(false);
      alert('Company Profile details updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update company profile');
    } finally {
      setCompanySaving(false);
    }
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    fetchProfile();
    fetchCompany();
  }, []);

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      await api.uploadProfilePhoto(formData);
      await fetchProfile();
    } catch (err) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    setUploading(true);
    try {
      await api.removeProfilePhoto();
      await fetchProfile();
    } catch (err) {
      alert(err.message || 'Failed to remove photo');
    } finally {
      setUploading(false);
    }
  };

  const openUpdateModal = () => {
    const details = profileData.details || {};
    setUpdateForm({ 
      name: profileData.name || '', 
      email: profileData.email || '', 
      mobile_number: details.mobile_number || profileData.mobile_number || '', 
      dob: details.dob || '', 
      college_name: details.college_name || '', 
      qualifications: details.qualifications || '', 
      linkedin_url: details.linkedin_url || '', 
      github_url: details.github_url || '',
      department: details.department || profileData.department || '',
      designation: details.designation || profileData.designation || '',
      joining_date: details.joining_date || profileData.joining_date || ''
    });
    setUpdatePhoto(null);
    setShowUpdateModal(true);
  };

  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData();
    formData.append('name', updateForm.name);
    formData.append('email', updateForm.email);
    formData.append('mobile_number', updateForm.mobile_number || '');
    formData.append('dob', updateForm.dob || '');
    formData.append('college_name', updateForm.college_name || '');
    formData.append('qualifications', updateForm.qualifications || '');
    formData.append('linkedin_url', updateForm.linkedin_url || '');
    formData.append('github_url', updateForm.github_url || '');
    formData.append('department', updateForm.department || '');
    formData.append('designation', updateForm.designation || '');
    formData.append('joining_date', updateForm.joining_date || '');

    if (updatePhoto) {
      formData.append('photo', updatePhoto);
    }

    try {
      await api.updateProfile(formData);
      setShowUpdateModal(false);
      await fetchProfile();
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Loading profile information...</div>;
  if (error) return <div style={{ color: 'var(--color-danger)', padding: '2rem' }}>{error}</div>;
  if (!profileData) return null;

  const { details } = profileData;

  const getRoleBadgeClass = (role) => {
    if (role === 'Director') return 'badge-danger';
    if (role === 'HR') return 'badge-warning';
    if (role === 'Mentor') return 'badge-info';
    return 'badge-success';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1200px' }}>
      
      {/* Hero Profile Card with Banner */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        
        {/* Banner with modern colorful gradient artwork */}
        <div className="profile-hero-banner">
          <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ 
              background: 'rgba(255, 255, 255, 0.22)', 
              backdropFilter: 'blur(8px)', 
              color: '#ffffff', 
              padding: '0.35rem 0.85rem', 
              borderRadius: 'var(--radius-full)', 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <CheckCircle2 size={14} /> Official Profile
            </span>
          </div>
        </div>

        {/* Profile Details Header Section */}
        <div style={{ padding: '0 2rem 2rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', marginTop: '-55px', marginBottom: '1.5rem' }}>
            
            {/* Elevated Overlapping Avatar */}
            <div style={{ position: 'relative' }}>
              <div 
                style={{ 
                  width: '125px', 
                  height: '125px', 
                  borderRadius: '50%', 
                  backgroundColor: '#ffffff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '3rem',
                  color: 'var(--color-primary)',
                  fontWeight: 800,
                  flexShrink: 0,
                  overflow: 'hidden',
                  border: '4px solid #ffffff',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => setShowPhotoModal(true)}
                title="Click to view or change photo"
              >
                {uploading ? (
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Uploading...</span>
                ) : profileData.profile_photo ? (
                  <img 
                    src={`/uploads/${profileData.profile_photo}`} 
                    alt="Profile" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <>
                    {getInitials(profileData.name)}
                  </>
                )}
              </div>
              
              <button 
                onClick={() => setShowPhotoModal(true)}
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  background: 'var(--primary-gradient)',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(79, 70, 229, 0.35)'
                }}
                title="Edit Photo"
              >
                <Camera size={16} />
              </button>

              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Quick Action Button */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={openUpdateModal} style={{ boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)' }}>
                Update Profile Info
              </button>
            </div>
          </div>

          {/* User Name and Role line */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                {profileData.name}
              </h1>
              <span className={`badge ${getRoleBadgeClass(profileData.role)}`} style={{ padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}>
                {profileData.role === 'Mentor' 
                  ? (details?.department ? (details.department.toLowerCase().includes('trainer') ? details.department : `${details.department} Trainer`) : 'Technical Trainer') 
                  : (profileData.role === 'Intern' ? 'Intern Trainee' : profileData.role)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid #a7f3d0' }}>
                <span className="pulse-dot" /> Active Member
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={16} color="var(--color-primary)" />
                <span style={{ fontWeight: 500 }}>{profileData.email}</span>
              </div>
              <span style={{ color: 'var(--border-color)' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building2 size={16} color="var(--color-primary)" />
                <span>IICET Services Private Limited</span>
              </div>
            </div>
          </div>

          {/* Clean 2/3-Column Modern Grid for Profile Fields */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '1rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)'
          }}>

            {/* Phone / Mobile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
                <Phone size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Mobile Number</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {details?.mobile_number || profileData.mobile_number || 'N/A'}
                </div>
              </div>
            </div>

            {/* Intern Specific Fields */}
            {profileData.role === 'Intern' && (
              <>
                {/* DOB & Age */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Date of Birth (Age)</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {details?.dob ? `${details.dob} (${calculateAge(details.dob)} yrs)` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* College Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 }}>
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>College / University</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {details?.college_name || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Qualification */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
                    <Award size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Qualifications</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {details?.qualifications || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Technology Track */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0 }}>
                    <Code size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Technology Track</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {details?.technology || 'Full Stack Development'}
                    </div>
                  </div>
                </div>

                {/* Batch & Timing */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48', flexShrink: 0 }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Batch & Training Schedule</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {details?.batch || 'Batch A'} ({details?.training_time || '09:00 AM - 01:00 PM'})
                    </div>
                  </div>
                </div>

                {/* LinkedIn */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a66c2', flexShrink: 0 }}>
                    <Globe size={18} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>LinkedIn Profile</div>
                    <div style={{ fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {details?.linkedin_url ? (
                        <a href={getValidUrl(details.linkedin_url)} target="_blank" rel="noreferrer" style={{ color: '#0a66c2', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          View LinkedIn <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Not provided</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* GitHub */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', flexShrink: 0 }}>
                    <Code size={18} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>GitHub Profile</div>
                    <div style={{ fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {details?.github_url ? (
                        <a href={getValidUrl(details.github_url)} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          View GitHub <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Not provided</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resume / CV Document */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #c7d2fe' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0, boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)' }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase' }}>Resume / CV Document</div>
                    <div style={{ fontWeight: 700, marginTop: '2px' }}>
                      {details?.resume_url ? (
                        <a href={details.resume_url} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', marginTop: '3px', textDecoration: 'none' }}>
                          View Resume (PDF) <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No resume uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Department (for all roles) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0 }}>
                <Briefcase size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Department</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {(() => {
                    const current = details?.department || profileData?.department;
                    if (current && current !== 'General') return current;
                    if (profileData?.role === 'Intern') return 'Intern';
                    if (profileData?.role === 'HR') return 'Human Resources';
                    if (profileData?.role === 'Mentor') return 'Employee';
                    if (profileData?.role === 'Director') return 'Director';
                    return 'Intern';
                  })()}
                </div>
              </div>
            </div>

            {/* Director specifics */}
            {profileData.role === 'Director' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Headquarters</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>Satara Head Office, Maharashtra</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
                    <Shield size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Administrative Oversight</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>Academic Governance & Operational Leadership</div>
                  </div>
                </div>
              </>
            )}

            {/* HR specifics */}
            {profileData.role === 'HR' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 }}>
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Designation</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{details?.designation || 'HR Operations Manager'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Joining Date</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{details?.joining_date || 'N/A'}</div>
                  </div>
                </div>
              </>
            )}

            {/* Mentor specifics */}
            {profileData.role === 'Mentor' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d', flexShrink: 0 }}>
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Interns</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{stats.internCount} Active Interns Supervised</div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Corporate Company Profile Section (Director Only) */}
      {profileData.role === 'Director' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)' }}>
          {/* Executive Header Banner */}
          <div style={{
            padding: '1.75rem 2rem',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '14px',
                background: '#ffffff',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                flexShrink: 0
              }}>
                <img 
                  src={iicetLogo} 
                  alt="Company Logo" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                    {company?.name || 'IICET Services Private Limited'}
                  </h2>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                    padding: '0.2rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircle2 size={12} /> Active Corporate Entity
                  </span>
                </div>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.86rem', color: '#cbd5e1' }}>
                  Statutory & corporate credentials registered under the Ministry of Corporate Affairs (MCA), Government of India
                </p>
              </div>
            </div>

            <button 
              className="btn btn-sm"
              onClick={() => setShowCompanyModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 600,
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            >
              <Edit3 size={15} /> Edit Corporate Details
            </button>
          </div>

          {/* 10 Required Fields Grid */}
          <div style={{ padding: '2rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem'
            }}>

              {/* 1. Company Logo Asset */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '2px solid #e2e8f0',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                }}>
                  <img src={iicetLogo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Company Logo
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', fontSize: '0.98rem' }}>
                    IICET Brand Emblem
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Official Trademark
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#475569', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      PNG High-Res
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Company Name */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                  <Building2 size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Company Name
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', fontSize: '1.05rem' }}>
                    {company?.name || 'IICET Services Private Limited'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Private Limited Company (Registered in India)
                  </div>
                </div>
              </div>

              {/* 3. Company Registration Number (CIN) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 }}>
                  <Hash size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Company Registration Number (CIN)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                    <span style={{ fontWeight: 800, color: '#4338ca', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                      {company?.cin || 'U85306PN2024PTC227572'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(company?.cin || 'U85306PN2024PTC227572', 'cin')}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: copiedKey === 'cin' ? '#10b981' : 'var(--text-muted)' }}
                      title="Copy CIN"
                    >
                      {copiedKey === 'cin' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Ministry of Corporate Affairs (RoC Pune)
                  </div>
                </div>
              </div>

              {/* 4. GSTIN Number */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
                  <ShieldCheck size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    GSTIN Number
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                    <span style={{ fontWeight: 800, color: '#047857', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                      {company?.gstin || '27AAAAA1111A1Z1'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(company?.gstin || '27AAAAA1111A1Z1', 'gstin')}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: copiedKey === 'gstin' ? '#10b981' : 'var(--text-muted)' }}
                      title="Copy GSTIN"
                    >
                      {copiedKey === 'gstin' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Goods & Services Tax Network (Maharashtra - 27)
                  </div>
                </div>
              </div>

              {/* 5. PAN Number */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
                  <FileCheck size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    PAN Number
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                    <span style={{ fontWeight: 800, color: '#b45309', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                      {company?.pan || 'AACCI8530P'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(company?.pan || 'AACCI8530P', 'pan')}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: copiedKey === 'pan' ? '#10b981' : 'var(--text-muted)' }}
                      title="Copy PAN"
                    >
                      {copiedKey === 'pan' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Income Tax Department, Government of India
                  </div>
                </div>
              </div>

              {/* 6. Company Email */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0 }}>
                  <Mail size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Company Email
                  </div>
                  <div style={{ fontWeight: 700, marginTop: '2px', fontSize: '0.96rem' }}>
                    <a href={`mailto:${company?.email || 'enquiry@iicet.com'}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                      {company?.email || 'enquiry@iicet.com'}
                    </a>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Official Corporate Correspondence Inbox
                  </div>
                </div>
              </div>

              {/* 7. Contact Number */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
                  <Phone size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Contact Number
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', fontSize: '0.96rem' }}>
                    {company?.phone || '+91 84858 19119, +91 77578 98255'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Customer Support & Operational Desk
                  </div>
                </div>
              </div>

              {/* 8. Official Website */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', flexShrink: 0 }}>
                  <Globe size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Official Website
                  </div>
                  <div style={{ fontWeight: 700, marginTop: '2px', fontSize: '0.96rem' }}>
                    <a 
                      href={getValidUrl(company?.website || 'https://iicet.com')} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {company?.website || 'https://iicet.com'} <ExternalLink size={13} />
                    </a>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Verified Institutional Web Portal
                  </div>
                </div>
              </div>

              {/* 9. Director Name */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db2777', flexShrink: 0 }}>
                  <User size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Director Name
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', fontSize: '1.05rem' }}>
                    {company?.director_name || profileData.name || 'Director'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#db2777', background: '#fdf2f8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Executive Managing Director • Authorized Signatory
                    </span>
                  </div>
                </div>
              </div>

              {/* 10. Registered Office Address (Spanning full width or 2 columns) */}
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.35rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0, marginTop: '2px' }}>
                  <MapPin size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Registered Office Address
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', fontSize: '0.98rem', lineHeight: '1.6' }}>
                    {company?.address || '1st Floor, HB Tower, near Bata Showroom, Powai Naka, Satara, Maharashtra 415001, India'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#b91c1c', background: '#fef2f2', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Principal Corporate Headquarters
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Satara District, Maharashtra, PIN: 415001
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Mentor Performance Card */}
      {profileData.role === 'Mentor' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
            <Award size={22} color="var(--color-primary)" /> Mentor Performance Review
          </h2>
          
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Current Rating</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>
                  {details?.performance_rating ? details.performance_rating.toFixed(1) : '4.8'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '1.1rem' }}>/ 5.0</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>HR Feedback & Notes</div>
              <p style={{ margin: 0, padding: '1.2rem', background: '#ffffff', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-primary)', fontStyle: 'italic', color: 'var(--text-primary)', boxShadow: 'var(--shadow-xs)' }}>
                {details?.performance_notes || 'Consistent high quality mentoring and excellent technical guidance provided to the interns.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time SMTP Protocol & Email Gateway Card (HR & Director only) */}
      {(profileData?.role === 'HR' || profileData?.role === 'Director') && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
              <Mail size={22} color="var(--color-primary)" /> SMTP Protocol & Email Gateway
            </h2>
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '0.3rem 0.75rem', 
              borderRadius: '20px', 
              fontWeight: 700,
              background: smtpStatus?.verified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: smtpStatus?.verified ? '#059669' : '#d97706',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              {smtpStatus?.verified ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {smtpStatus?.verified ? 'SMTP Active & Connected' : smtpStatus?.hasPassword ? 'Verifying...' : 'App Password Needed in .env'}
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            The system sends real-time transactional emails via Google SMTP (<code>smtp.gmail.com:465</code> SSL) for OTP logins, intern onboarding credentials, and fee payment receipts.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>SMTP Sender Email</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {smtpStatus?.senderEmail || 'neha.12ghadge@gmail.com'}
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>SMTP Server & Port</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                smtp.gmail.com:465 (SSL)
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>App Password Status</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: smtpStatus?.hasPassword ? 'var(--color-success)' : 'var(--color-warning)', marginTop: '4px' }}>
                {smtpStatus?.hasPassword ? 'Configured in backend/.env' : 'Missing in backend/.env'}
              </div>
            </div>
          </div>

          {/* Test Email Dispatch Form */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Send Live Test Email
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              Test your Gmail SMTP connection by sending a real-time verification email to any Gmail ID.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input 
                type="email" 
                className="form-control" 
                style={{ maxWidth: '320px' }} 
                value={testEmailAddr} 
                onChange={e => setTestEmailAddr(e.target.value)} 
                placeholder="Enter recipient Gmail ID"
              />
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={handleSendTestEmail} 
                disabled={testEmailLoading || !testEmailAddr}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
              >
                <Send size={15} />
                {testEmailLoading ? 'Dispatching...' : 'Send Test Email'}
              </button>
            </div>

            {testEmailResult && (
              <div style={{ 
                marginTop: '0.85rem', 
                padding: '0.65rem 0.85rem', 
                borderRadius: '6px', 
                fontSize: '0.82rem',
                background: testEmailResult.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: testEmailResult.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${testEmailResult.type === 'success' ? '#a7f3d0' : '#fecaca'}`
              }}>
                {testEmailResult.type === 'success' ? '✅ ' : '❌ '}
                {testEmailResult.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="modal-overlay" onClick={() => setShowPhotoModal(false)}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Profile Photo</h2>
              <button className="modal-close" onClick={() => setShowPhotoModal(false)}>&times;</button>
            </div>
            
            <div style={{ width: '160px', height: '160px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', color: 'var(--color-primary)', fontWeight: 'bold', overflow: 'hidden', border: '3px solid var(--border-color)', margin: '0 auto 1.5rem', boxShadow: 'var(--shadow-md)' }}>
              {profileData.profile_photo ? (
                <img src={`/uploads/${profileData.profile_photo}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getInitials(profileData.name)
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setShowPhotoModal(false); handlePhotoClick(); }}>
                <Camera size={16} /> Edit / Upload Photo
              </button>
              {profileData.profile_photo && (
                <button className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setShowPhotoModal(false); handleRemovePhoto(); }}>
                  <Trash2 size={16} /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Profile Modal */}
      {showUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Profile</h2>
              <button className="modal-close" onClick={() => setShowUpdateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateProfileSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={updateForm.name} 
                  onChange={e => setUpdateForm({...updateForm, name: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  required 
                  value={updateForm.email} 
                  onChange={e => setUpdateForm({...updateForm, email: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <input type="text" className="form-control" value={updateForm.mobile_number || ''} onChange={e => setUpdateForm({...updateForm, mobile_number: e.target.value})} />
              </div>
              
              {(profileData?.role === 'HR' || profileData?.role === 'Director' || profileData?.role === 'Mentor') && (
                <>
                  <div className="form-group">
                    <label>Department</label>
                    <input type="text" className="form-control" value={updateForm.department || ''} onChange={e => setUpdateForm({...updateForm, department: e.target.value})} />
                  </div>
                  {profileData?.role !== 'Mentor' && (
                    <>
                      <div className="form-group">
                        <label>Designation</label>
                        <input type="text" className="form-control" value={updateForm.designation || ''} onChange={e => setUpdateForm({...updateForm, designation: e.target.value})} />
                      </div>
                      {profileData?.role !== 'Director' && (
                        <div className="form-group">
                          <label>Joining Date</label>
                          <input type="date" className="form-control" value={updateForm.joining_date || ''} onChange={e => setUpdateForm({...updateForm, joining_date: e.target.value})} />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {profileData?.role === 'Intern' && (
                <>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input type="date" className="form-control" value={updateForm.dob || ''} onChange={e => setUpdateForm({...updateForm, dob: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>College Name</label>
                    <input type="text" className="form-control" value={updateForm.college_name || ''} onChange={e => setUpdateForm({...updateForm, college_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Qualifications</label>
                    <input type="text" className="form-control" value={updateForm.qualifications || ''} onChange={e => setUpdateForm({...updateForm, qualifications: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn URL</label>
                    <input type="text" className="form-control" value={updateForm.linkedin_url || ''} onChange={e => setUpdateForm({...updateForm, linkedin_url: e.target.value})} placeholder="https://linkedin.com/in/username" />
                  </div>
                  <div className="form-group">
                    <label>GitHub URL</label>
                    <input type="text" className="form-control" value={updateForm.github_url || ''} onChange={e => setUpdateForm({...updateForm, github_url: e.target.value})} placeholder="https://github.com/username" />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Profile Photo</label>
                <input 
                  type="file" 
                  className="form-control" 
                  accept="image/*"
                  onChange={e => setUpdatePhoto(e.target.files[0])} 
                />
                <small style={{color: 'var(--text-muted)'}}>Leave empty to keep current photo.</small>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem' }} disabled={uploading}>
                {uploading ? 'Updating Profile...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Corporate Company Profile Modal (Director Only) */}
      {showCompanyModal && (
        <div className="modal-overlay" onClick={() => setShowCompanyModal(false)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 800 }}>
                <Building2 size={20} color="var(--color-primary)" /> Edit Company Profile Details
              </h2>
              <button className="modal-close" onClick={() => setShowCompanyModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateCompanySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Company Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={companyForm.name} 
                  onChange={e => setCompanyForm({...companyForm, name: e.target.value})} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Company Registration Number (CIN) *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={companyForm.cin} 
                    onChange={e => setCompanyForm({...companyForm, cin: e.target.value})} 
                    placeholder="e.g. U85306PN2024PTC227572" 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>GSTIN Number *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={companyForm.gstin} 
                    onChange={e => setCompanyForm({...companyForm, gstin: e.target.value})} 
                    placeholder="e.g. 27AAAAA1111A1Z1" 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>PAN Number *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={companyForm.pan} 
                    onChange={e => setCompanyForm({...companyForm, pan: e.target.value})} 
                    placeholder="e.g. AACCI8530P" 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Director Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={companyForm.director_name} 
                    onChange={e => setCompanyForm({...companyForm, director_name: e.target.value})} 
                    placeholder="Director Name" 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Company Email *</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    required 
                    value={companyForm.email} 
                    onChange={e => setCompanyForm({...companyForm, email: e.target.value})} 
                    placeholder="enquiry@iicet.com" 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Contact Number *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={companyForm.phone} 
                    onChange={e => setCompanyForm({...companyForm, phone: e.target.value})} 
                    placeholder="+91 84858 19119" 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Official Website *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={companyForm.website} 
                  onChange={e => setCompanyForm({...companyForm, website: e.target.value})} 
                  placeholder="https://iicet.com" 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Registered Office Address *</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  required 
                  value={companyForm.address} 
                  onChange={e => setCompanyForm({...companyForm, address: e.target.value})} 
                  placeholder="Full registered address" 
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '0.5rem', fontWeight: 700 }} 
                disabled={companySaving}
              >
                {companySaving ? 'Saving Corporate Details...' : 'Save Corporate Details'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
