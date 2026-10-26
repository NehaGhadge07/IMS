import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Briefcase, Building, Save, CheckCircle } from 'lucide-react';

export default function CompanyProfile() {
  const [profile, setProfile] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    gstin: '',
    about: ''
  });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchCompanyProfile = async () => {
    try {
      const data = await api.getCompany();
      setProfile(data);
    } catch (err) {
      setError('Failed to load company profile details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setMessage('');
    setError('');

    try {
      await api.updateCompany(profile);
      setMessage('Company Profile details updated successfully!');
      
      // Auto clear message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
      fetchCompanyProfile();
    } catch (err) {
      setError(err.message || 'Failed to update company profile details.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading company configuration...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
      <div className="card">
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building size={20} color="var(--color-primary)" />
          Corporate Company Profile Settings
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Manage your company details below. These values are used globally across client brand headers, printable payment receipts, and automated notifications.
        </p>

        {message && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-success)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.5rem'
          }}>
            <CheckCircle size={16} />
            {message}
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Company Display Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={profile.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                disabled={saveLoading}
              />
            </div>
            <div className="form-group">
              <label>Corporate website</label>
              <input
                type="text"
                className="form-control"
                value={profile.website || ''}
                onChange={(e) => handleFieldChange('website', e.target.value)}
                placeholder="e.g. www.nooralworks.com"
                disabled={saveLoading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Contact Email Address</label>
              <input
                type="email"
                className="form-control"
                value={profile.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="e.g. contact@nooralworks.com"
                disabled={saveLoading}
              />
            </div>
            <div className="form-group">
              <label>Contact Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={profile.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="e.g. +91 98765 43210"
                disabled={saveLoading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>GSTIN / Tax Identification Code</label>
              <input
                type="text"
                className="form-control"
                value={profile.gstin || ''}
                onChange={(e) => handleFieldChange('gstin', e.target.value)}
                placeholder="e.g. 27AAAAA1111A1Z1"
                disabled={saveLoading}
              />
            </div>
            <div className="form-group" style={{ flex: 1.5 }}>
              <label>Corporate Address</label>
              <input
                type="text"
                className="form-control"
                value={profile.address || ''}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="e.g. 123 Corporate Ave, Mumbai, Maharashtra"
                disabled={saveLoading}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label>About Description / Company Profile overview</label>
            <textarea
              className="form-control"
              style={{ minHeight: '100px', resize: 'vertical' }}
              value={profile.about || ''}
              onChange={(e) => handleFieldChange('about', e.target.value)}
              placeholder="Describe the company services..."
              disabled={saveLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '1rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            disabled={saveLoading}
          >
            <Save size={16} />
            {saveLoading ? 'Saving Company Settings...' : 'Save Corporate Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
