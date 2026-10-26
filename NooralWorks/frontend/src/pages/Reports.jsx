import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { 
  Download, 
  FileSpreadsheet, 
  Eye, 
  Search, 
  FileText, 
  CheckCircle, 
  Clock, 
  Users, 
  DollarSign, 
  Briefcase, 
  Award, 
  HelpCircle, 
  RefreshCw, 
  X, 
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Reports({ user }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Preview Modal state
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    loading: false,
    data: null,
    report: null,
    search: '',
    currentPage: 1,
    rowsPerPage: 10
  });

  const isMentor = user?.role === 'Mentor';
  const isDirector = user?.role === 'Director';
  const isHR = user?.role === 'HR';

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const res = await api.getReportsCatalog();
      setCatalog(res || []);
    } catch (err) {
      console.error('Error fetching reports catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Handle direct download for any report
  const handleDownload = async (reportId, isMentorReport = false, format = 'csv') => {
    const actionKey = `${reportId}-${format}`;
    setDownloading(prev => ({ ...prev, [actionKey]: true }));
    try {
      const baseEndpoint = isMentorReport 
        ? `/api/reports/mentor/${reportId}` 
        : `/api/reports/export/${reportId}`;
      
      if (format === 'csv') {
        const response = await fetch(baseEndpoint, {
          headers: { 'Authorization': `Bearer ${api.getToken()}` }
        });
        if (!response.ok) {
          throw new Error('Download failed. Ensure you have authorized clearance.');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `${reportId}_report_${dateStr}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        const response = await fetch(`${baseEndpoint}?format=json`, {
          headers: { 'Authorization': `Bearer ${api.getToken()}` }
        });
        if (!response.ok) throw new Error('Download failed.');
        const data = await response.json();
        
        if (!data || data.length === 0) {
          alert('No data available to generate PDF.');
          return;
        }

        const doc = new jsPDF();
        const headers = Object.keys(data[0]);
        const rows = data.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? String(row[h]) : ''));
        
        doc.text(`Report: ${reportId.replace('-', ' ').toUpperCase()}`, 14, 15);
        doc.autoTable({
          startY: 20,
          head: [headers],
          body: rows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [79, 70, 229] }
        });
        
        doc.save(`${reportId}_report_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (err) {
      alert('Report Export Error: ' + err.message);
    } finally {
      setDownloading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Open interactive preview modal
  const handleOpenPreview = async (report) => {
    setPreviewModal({
      isOpen: true,
      loading: true,
      data: null,
      report,
      search: '',
      currentPage: 1,
      rowsPerPage: 10
    });

    try {
      const res = await api.getReportPreview(report.id, 100);
      setPreviewModal(prev => ({
        ...prev,
        loading: false,
        data: res
      }));
    } catch (err) {
      alert('Failed to load report preview: ' + err.message);
      setPreviewModal(prev => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(catalog.map(item => item.category));
    return ['All', ...Array.from(set)];
  }, [catalog]);

  // Filtered reports
  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        item.title.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.columns && item.columns.some(col => col.toLowerCase().includes(q)));
      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCategory, searchQuery]);

  // Total records across catalog
  const totalRecordsCount = useMemo(() => {
    return catalog.reduce((acc, curr) => acc + (curr.recordCount || 0), 0);
  }, [catalog]);

  // Icon mapping
  const getCategoryIcon = (category, reportId) => {
    if (reportId === 'fees' || reportId === 'payments') {
      return <DollarSign size={20} className="text-amber-500" />;
    }
    if (reportId === 'attendance' || reportId === 'staff-attendance') {
      return <Clock size={20} className="text-emerald-500" />;
    }
    if (reportId === 'placements' || reportId === 'mock-interviews') {
      return <Award size={20} className="text-purple-500" />;
    }
    if (reportId === 'tasks') {
      return <Briefcase size={20} className="text-blue-500" />;
    }
    if (reportId === 'leaves') {
      return <Calendar size={20} className="text-rose-500" />;
    }
    if (reportId === 'helpdesk') {
      return <HelpCircle size={20} className="text-teal-500" />;
    }
    return <FileSpreadsheet size={20} className="text-indigo-500" />;
  };

  // Preview Modal filtered rows and pagination
  const modalRows = useMemo(() => {
    if (!previewModal.data || !previewModal.data.rows) return [];
    if (!previewModal.search) return previewModal.data.rows;
    const q = previewModal.search.toLowerCase();
    return previewModal.data.rows.filter(row => 
      Object.values(row).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(q))
    );
  }, [previewModal.data, previewModal.search]);

  const totalPages = Math.ceil(modalRows.length / previewModal.rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (previewModal.currentPage - 1) * previewModal.rowsPerPage;
    return modalRows.slice(start, start + previewModal.rowsPerPage);
  }, [modalRows, previewModal.currentPage, previewModal.rowsPerPage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner & KPI Header */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)',
        border: '1px solid rgba(79, 70, 229, 0.2)',
        padding: '1.5rem',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                backgroundColor: 'rgba(79, 70, 229, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5'
              }}>
                <FileSpreadsheet size={22} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Reports & Analytics Hub
              </h2>
            </div>
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={loadCatalog} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Reports'}
          </button>
        </div>

        {/* Quick KPI stats strip */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginTop: '1.25rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{catalog.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generated Report Types</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{totalRecordsCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Tracked Live Rows</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>Excel UTF-8 BOM</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Format Compatibility</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{user?.role || 'Staff'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clearance Role</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trainer Weekly Section (Only for Mentors) */}
      {isMentor && (
        <div className="card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Briefcase size={20} color="#4f46e5" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Trainer Assigned Intern Logs</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Weekly data extracts strictly scoped to interns under your technical mentorship.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {/* Weekly Attendance */}
            <div className="card" style={{ background: 'var(--bg-hover)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} color="#6366f1" /> Weekly Attendance Log
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Daily punches, hours, and status of your interns for the past 7 days.
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }} 
                onClick={() => handleDownload('weekly-attendance', true, 'csv')}
                disabled={downloading['weekly-attendance-csv']}
              >
                <Download size={15} /> 
                {downloading['weekly-attendance-csv'] ? 'Generating...' : 'Export Excel (.CSV)'}
              </button>
            </div>

            {/* Weekly Tasks */}
            <div className="card" style={{ background: 'var(--bg-hover)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Briefcase size={16} color="#10b981" /> Weekly Task Status Report
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Tasks assigned or modified in the last 7 days for your interns.
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }} 
                onClick={() => handleDownload('weekly-tasks', true, 'csv')}
                disabled={downloading['weekly-tasks-csv']}
              >
                <Download size={15} /> 
                {downloading['weekly-tasks-csv'] ? 'Generating...' : 'Export Excel (.CSV)'}
              </button>
            </div>

            {/* Weekly Logs */}
            <div className="card" style={{ background: 'var(--bg-hover)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={16} color="#f59e0b" /> Weekly Daily Logs Report
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Work log submissions and mentor reviews recorded over the last 7 days.
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }} 
                onClick={() => handleDownload('weekly-logs', true, 'csv')}
                disabled={downloading['weekly-logs-csv']}
              >
                <Download size={15} /> 
                {downloading['weekly-logs-csv'] ? 'Generating...' : 'Export Excel (.CSV)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Reports Hub (Director, HR & Master Reports) */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              Master Institutional Reports
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Select any report below to inspect a live preview table or trigger an instant Excel (.CSV) download.
            </span>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search reports or fields..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '34px', fontSize: '0.85rem', height: '38px', borderRadius: '8px' }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {categories.map(cat => {
            const count = cat === 'All' 
              ? catalog.length 
              : catalog.filter(c => c.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #4f46e5' : '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: isSelected ? '#4f46e5' : 'var(--bg-hover, #f8fafc)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary, #475569)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{cat}</span>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                  fontSize: '0.7rem'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Reports Grid */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Gathering all generated Excel reports from the database...</p>
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileSpreadsheet size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>No reports matched your search criteria.</p>
            <button className="btn btn-sm btn-secondary" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}>
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {filteredCatalog.map(report => (
              <div 
                key={report.id} 
                className="card" 
                style={{ 
                  background: 'var(--bg-surface, #ffffff)', 
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '10px',
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ 
                        width: 36, 
                        height: 36, 
                        borderRadius: '8px', 
                        backgroundColor: 'rgba(79, 70, 229, 0.08)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        {getCategoryIcon(report.category, report.id)}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {report.title}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {report.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px' }}>
                      {report.recordCount} records
                    </span>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '1rem', minHeight: '38px' }}>
                    {report.description}
                  </p>

                  {/* Included Columns pill tags */}
                  {report.columns && report.columns.length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                        Included Fields ({report.columns.length}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {report.columns.slice(0, 5).map(col => (
                          <span 
                            key={col} 
                            style={{ 
                              fontSize: '0.68rem', 
                              backgroundColor: 'var(--bg-hover, #f1f5f9)', 
                              color: 'var(--text-secondary, #475569)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(0,0,0,0.05)'
                            }}
                          >
                            {col.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {report.columns.length > 5 && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center', padding: '2px 4px' }}>
                            +{report.columns.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '0.6rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-color, #e2e8f0)'
                }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '7px 10px' }}
                    onClick={() => handleOpenPreview(report)}
                  >
                    <Eye size={14} />
                    Preview
                  </button>

                  <button 
                    className="btn btn-primary" 
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '7px 10px' }}
                    onClick={() => handleDownload(report.id, false, 'csv')}
                    disabled={downloading[`${report.id}-csv`]}
                  >
                    <Download size={14} />
                    {downloading[`${report.id}-csv`] ? 'Exporting...' : 'Excel (.CSV)'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Report Preview Modal */}
      {previewModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '12px',
            width: '95%',
            maxWidth: '1100px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface, #ffffff)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(79, 70, 229, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#4f46e5'
                }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {previewModal.report?.title || 'Report Preview'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>{previewModal.report?.category}</span>
                    <span>•</span>
                    <span>{previewModal.data ? `${previewModal.data.totalCount} total entries` : 'Loading...'}</span>
                    <span>•</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>Showing live data sample</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button 
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  onClick={() => handleDownload(previewModal.report.id, false, 'csv')}
                  disabled={downloading[`${previewModal.report?.id}-csv`]}
                >
                  <Download size={14} />
                  {downloading[`${previewModal.report?.id}-csv`] ? 'Exporting...' : 'Download Complete Excel (.CSV)'}
                </button>
                <button 
                  onClick={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: 'var(--text-muted)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Subheader with Search & Info */}
            <div style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--bg-hover, #f8fafc)',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Filter records in this preview..." 
                  value={previewModal.search}
                  onChange={(e) => setPreviewModal(prev => ({ ...prev, search: e.target.value, currentPage: 1 }))}
                  className="form-control"
                  style={{ paddingLeft: '32px', height: '34px', fontSize: '0.82rem', borderRadius: '6px' }}
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing {modalRows.length === 0 ? 0 : (previewModal.currentPage - 1) * previewModal.rowsPerPage + 1} - {Math.min(previewModal.currentPage * previewModal.rowsPerPage, modalRows.length)} of {modalRows.length} previewed records
              </div>
            </div>

            {/* Modal Body / Table View */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
              {previewModal.loading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
                  <p>Extracting records from database...</p>
                </div>
              ) : !previewModal.data || previewModal.data.columns.length === 0 || modalRows.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FileText size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <p>No records found matching this preview.</p>
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead style={{ backgroundColor: 'var(--bg-hover, #f1f5f9)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--border-color, #cbd5e1)', color: 'var(--text-secondary)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          #
                        </th>
                        {previewModal.data.columns.map(col => (
                          <th 
                            key={col} 
                            style={{ 
                              padding: '10px 12px', 
                              borderBottom: '2px solid var(--border-color, #cbd5e1)', 
                              color: 'var(--text-secondary)', 
                              fontWeight: 700, 
                              whiteSpace: 'nowrap',
                              textTransform: 'capitalize'
                            }}
                          >
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((row, idx) => (
                        <tr 
                          key={idx} 
                          style={{ 
                            borderBottom: '1px solid var(--border-color, #f1f5f9)',
                            backgroundColor: idx % 2 === 0 ? 'var(--bg-surface, #ffffff)' : 'rgba(0,0,0,0.015)'
                          }}
                        >
                          <td style={{ padding: '9px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {(previewModal.currentPage - 1) * previewModal.rowsPerPage + idx + 1}
                          </td>
                          {previewModal.data.columns.map(col => {
                            const val = row[col];
                            const isStatus = typeof val === 'string' && ['paid', 'pending', 'present', 'absent', 'approved', 'active', 'completed'].includes(val.toLowerCase());
                            return (
                              <td key={col} style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>
                                {isStatus ? (
                                  <span className={`badge ${
                                    ['paid', 'present', 'approved', 'active', 'completed'].includes(val.toLowerCase()) ? 'badge-success' : 'badge-warning'
                                  }`} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}>
                                    {val}
                                  </span>
                                ) : (
                                  val !== null && val !== undefined ? String(val) : <span style={{ color: 'var(--text-muted)' }}>-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer with Pagination */}
            <div style={{
              padding: '0.9rem 1.5rem',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface, #ffffff)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rows per page:</span>
                <select 
                  className="form-control" 
                  value={previewModal.rowsPerPage}
                  onChange={(e) => setPreviewModal(prev => ({ ...prev, rowsPerPage: Number(e.target.value), currentPage: 1 }))}
                  style={{ height: '30px', padding: '2px 8px', fontSize: '0.8rem', width: '70px', borderRadius: '4px' }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={previewModal.currentPage <= 1}
                  onClick={() => setPreviewModal(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.8rem', padding: '0 6px', fontWeight: 600 }}>
                  Page {previewModal.currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={previewModal.currentPage >= totalPages}
                  onClick={() => setPreviewModal(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                >
                  Next
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
