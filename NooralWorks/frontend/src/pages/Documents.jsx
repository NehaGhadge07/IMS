import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { 
  Upload, AlertCircle, UserCheck, FileText, X, 
  Eye, CheckCircle, ShieldCheck, Filter, Search, Clock, Check, RefreshCw,
  FileCheck
} from 'lucide-react';

const REQUIRED_DOCS = ['Resume', 'ID Proof', 'Offer Letter', 'Completion Certificate'];
const ALL_DOC_TYPES = [
  'Resume', 
  'ID Proof', 
  'Offer Letter', 
  'Completion Certificate', 
  'College Marksheet', 
  'Aadhar Card', 
  'Last Sem Result', 
  'Bonafide Certificate', 
  'ID Photo'
];

const CORE_CHECKLIST = [
  { 
    type: 'Resume', 
    label: 'Resume / Curriculum Vitae', 
    desc: 'Mandatory profile document used for training evaluations and placement drives.',
    matchTypes: ['Resume']
  },
  { 
    type: 'ID Proof', 
    label: 'Identity Proof Document', 
    desc: 'Government photo ID (Aadhaar Card, PAN Card, Voter ID, or Passport).',
    matchTypes: ['ID Proof', 'Aadhar Card']
  },
  { 
    type: 'Offer Letter', 
    label: 'Signed Offer Letter', 
    desc: 'Countersigned official internship offer and terms acceptance.',
    matchTypes: ['Offer Letter']
  },
  { 
    type: 'Completion Certificate', 
    label: 'Academic / Completion Certificate', 
    desc: 'Degree completion, marksheet, or college bonafide letter.',
    matchTypes: ['Completion Certificate', 'College Marksheet', 'Last Sem Result', 'Bonafide Certificate']
  }
];

const badgeStatus = (status) =>
  status === 'Approved' ? 'badge-success' : status === 'Rejected' ? 'badge-danger' : 'badge-warning';

export default function Documents({ user }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [selectedInternId, setSelectedInternId] = useState('');
  const [filterDocType, setFilterDocType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  // Intern self-upload state
  const [selfDocType, setSelfDocType] = useState('Resume');
  const [selfFile, setSelfFile] = useState(null);
  const [selfComments, setSelfComments] = useState('');
  const [selfUploading, setSelfUploading] = useState(false);

  // HR upload state (Director cannot upload)
  const [interns, setInterns] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [hrDocType, setHrDocType] = useState('Resume');
  const [hrInternId, setHrInternId] = useState('');
  const [hrFile, setHrFile] = useState(null);
  const [hrUploading, setHrUploading] = useState(false);

  // HR verify state
  const [auditFeedback, setAuditFeedback] = useState({});

  const isIntern = user?.role === 'Intern';
  const isDirector = user?.role === 'Director';
  const isHR = user?.role === 'HR'; // Strictly HR
  const isStaff = isHR || isDirector; // Management / Oversight

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchDocuments = async (internId = '', trainerId = '') => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (internId) params.intern_id = internId;
      else if (trainerId) params.mentor_id = trainerId;
      const data = await api.getDocuments(params);
      setDocuments(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInterns = async () => {
    try {
      const data = await api.getInterns();
      setInterns(Array.isArray(data) ? data : data.interns || []);
    } catch {
      // non-fatal
    }
  };

  const fetchMentors = async () => {
    try {
      const data = await api.getMentors();
      setMentors(Array.isArray(data) ? data : []);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    fetchDocuments(selectedInternId, selectedTrainerId);
  }, [selectedInternId, selectedTrainerId]);

  useEffect(() => {
    if (isStaff) {
      fetchInterns();
      fetchMentors();
    }
  }, [isStaff]);

  const filteredInterns = useMemo(() => {
    if (!selectedTrainerId) return interns;
    return interns.filter(i => (
      String(i.mentor_id) === String(selectedTrainerId) ||
      String(i.mentor_user_id) === String(selectedTrainerId)
    ));
  }, [interns, selectedTrainerId]);

  // ── Pending documents computation ─────────────────────────────────────────
  const pendingInterns = useMemo(() => {
    if (!isStaff || interns.length === 0) return [];
    let list = interns;
    if (selectedTrainerId) {
      list = list.filter(i => String(i.mentor_id) === String(selectedTrainerId) || String(i.mentor_user_id) === String(selectedTrainerId));
    }
    return list
      .map((intern) => {
        const internDocs = documents.filter(
          (d) =>
            String(d.intern_id) === String(intern.id) &&
            (d.status === 'Uploaded' || d.status === 'Approved')
        );
        const submitted = internDocs.map((d) => d.doc_type);
        const hasResume = submitted.includes('Resume');
        const hasIdProof = submitted.includes('ID Proof') || submitted.includes('Aadhar Card');
        const hasOfferLetter = submitted.includes('Offer Letter');
        const hasCertificate = submitted.includes('Completion Certificate') || 
                               submitted.includes('College Marksheet') || 
                               submitted.includes('Last Sem Result') || 
                               submitted.includes('Bonafide Certificate');

        const missing = [];
        if (!hasResume) missing.push('Resume');
        if (!hasIdProof) missing.push('ID Proof');
        if (!hasOfferLetter) missing.push('Offer Letter');
        if (!hasCertificate) missing.push('Completion Certificate');

        return { ...intern, missing, submittedCount: submitted.length };
      })
      .filter((intern) => intern.missing.length > 0);
  }, [interns, documents, isStaff]);

  // ── Intern self-upload ────────────────────────────────────────────────────
  const handleSelfUpload = async (e) => {
    e.preventDefault();
    if (!selfFile) return;
    setSelfUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selfFile);
      formData.append('doc_type', selfDocType);
      formData.append('comments', selfComments || 'Uploaded by Intern from portal');
      await api.uploadDocument(formData);
      setSelfFile(null);
      setSelfComments('');
      const input = document.getElementById('docs-file-input');
      if (input) input.value = '';
      fetchDocuments();
      alert(`Document (${selfDocType}) uploaded successfully! It is now pending HR verification.`);
    } catch (err) {
      alert(err.message || 'Failed to upload document.');
    } finally {
      setSelfUploading(false);
    }
  };

  // ── HR upload for intern (Blocked for Director) ─────────────────────────────
  const handleHrUpload = async (e) => {
    e.preventDefault();
    if (isDirector) {
      alert('Director has view-only access. Only HR and Interns can upload documents.');
      return;
    }
    if (!hrInternId) return alert('Please select an intern.');
    if (!hrFile) return alert('Please choose a file.');
    setHrUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', hrFile);
      formData.append('doc_type', hrDocType);
      formData.append('intern_id', hrInternId);
      formData.append('comments', 'Uploaded by HR on behalf of intern');
      await api.uploadDocumentForIntern(formData);
      setHrFile(null);
      setHrInternId('');
      const input = document.getElementById('hr-file-input');
      if (input) input.value = '';
      setShowUploadPanel(false);
      fetchDocuments(selectedInternId);
    } catch (err) {
      alert(err.message);
    } finally {
      setHrUploading(false);
    }
  };

  // ── HR verify (Audit) ─────────────────────────────────────────────────────
  const handleVerify = async (docId, status) => {
    try {
      const fb = auditFeedback[docId] || '';
      await api.verifyDocument(docId, status, fb);
      setAuditFeedback({ ...auditFeedback, [docId]: '' });
      fetchDocuments(selectedInternId);
    } catch (err) {
      alert(err.message);
    }
  };

  // Filtered documents list
  const filteredDocuments = documents.filter((doc) => {
    if (filterDocType !== 'all' && doc.doc_type !== filterDocType) return false;
    if (filterStatus !== 'all' && doc.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (doc.intern_name || '').toLowerCase().includes(q);
      const matchType = (doc.doc_type || '').toLowerCase().includes(q);
      if (!matchName && !matchType) return false;
    }
    return true;
  });

  // KPI Metrics (for Director / HR)
  const totalDocsCount = documents.length;
  const approvedDocsCount = documents.filter((d) => d.status === 'Approved').length;
  const pendingDocsCount = documents.filter((d) => d.status === 'Uploaded').length;
  const rejectedDocsCount = documents.filter((d) => d.status === 'Rejected').length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={26} color="var(--color-primary)" /> Syllabus &amp; Verification Paperwork
            </h1>
            {isDirector && (
              <span className="badge badge-warning" style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Eye size={13} /> Director View (Read-Only)
              </span>
            )}
          </div>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)' }}>
            {isDirector
              ? 'Director executive audit view — View and inspect official documents uploaded by HR and Interns. Uploading is managed exclusively by HR and Interns.'
              : isHR
              ? 'Verify official documentation (Resume, ID Proof, Offer Letter, Certificates), audit submissions, and upload records for interns.'
              : 'Submit and track your verified internship credentials (Resume, ID Proof, and Signed Offer Letters).'}
          </p>
        </div>

        {isStaff && (
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => fetchDocuments(selectedInternId)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        )}
      </div>

      {/* ── Director Executive Read-Only Notice ── */}
      {isDirector && (
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.08)', 
          borderLeft: '4px solid var(--color-primary)', 
          borderRadius: 'var(--radius-md)', 
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} color="var(--color-primary)" />
          <div>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Read-Only Document Oversight</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
              As Director, you have view-only access to inspect all submitted credentials. 
              Documents can only be uploaded by <strong>HR</strong> and <strong>Interns</strong> (Trainers and Director cannot upload documents).
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Stats Cards (Director & HR) ── */}
      {isStaff && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Uploaded</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-primary)' }}>{totalDocsCount}</div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Verified & Approved</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#059669' }}>{approvedDocsCount}</div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>Awaiting Verification</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#d97706' }}>{pendingDocsCount}</div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>Incomplete Interns</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#dc2626' }}>{pendingInterns.length}</div>
          </div>
        </div>
      )}

      {/* ── KPI Stats Cards (Intern) ── */}
      {isIntern && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Documents Submitted</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-primary)' }}>{documents.length}</div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Approved &amp; Verified</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#059669' }}>{approvedDocsCount}</div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>Awaiting HR Review</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#d97706' }}>{pendingDocsCount}</div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #6366f1' }}>
            <div style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 600, textTransform: 'uppercase' }}>Pending Requirements</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#4f46e5' }}>
              {CORE_CHECKLIST.filter(item => !documents.some(d => item.matchTypes.includes(d.doc_type) && (d.status === 'Approved' || d.status === 'Uploaded'))).length}
            </div>
          </div>
        </div>
      )}

      {/* ── Mandatory Verification Checklist & Status Cards (Intern only) ── */}
      {isIntern && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={22} color="var(--color-primary)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Mandatory Verification Credentials Checklist</h3>
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Verified by HR &bull; Reflected on Placement Dossier
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
            All admitted interns must submit the 4 institutional verification credentials below. Once verified by HR, your verified status is reflected across your student dossier, mentor evaluations, and placement records.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {CORE_CHECKLIST.map((item) => {
              const doc = documents.find(d => item.matchTypes.includes(d.doc_type));
              const isApproved = doc?.status === 'Approved';
              const isUploaded = doc?.status === 'Uploaded';
              const isRejected = doc?.status === 'Rejected';

              return (
                <div 
                  key={item.type} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    borderTop: `4px solid ${isApproved ? '#10b981' : isUploaded ? '#f59e0b' : isRejected ? '#ef4444' : 'var(--border-color)'}`,
                    background: 'var(--bg-hover)',
                    padding: '1.1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.label}
                      </h4>
                      {isApproved ? (
                        <span className="badge badge-success" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle size={11} /> Approved
                        </span>
                      ) : isUploaded ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={11} /> In Review
                        </span>
                      ) : isRejected ? (
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <AlertCircle size={11} /> Rejected
                        </span>
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                          Pending
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.6rem 0', lineHeight: 1.4 }}>
                      {item.desc}
                    </p>

                    {doc && doc.comments && (
                      <div style={{ fontSize: '0.75rem', background: 'var(--bg-color)', padding: '0.4rem 0.6rem', borderRadius: '4px', marginBottom: '0.6rem', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        <strong>Note:</strong> {doc.comments}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.4rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-color)' }}>
                    {doc ? (
                      <>
                        <a
                          href={`/uploads/${doc.file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }}
                        >
                          <Eye size={12} /> View File
                        </a>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }}
                          onClick={() => {
                            setSelfDocType(item.type);
                            const el = document.getElementById('docs-self-upload-card');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <Upload size={12} /> Update
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', width: '100%', justifyContent: 'center' }}
                        onClick={() => {
                          setSelfDocType(item.type);
                          const el = document.getElementById('docs-self-upload-card');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <Upload size={12} /> Upload Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main card ── */}
      <div className="card">

        {/* Header row & Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Submitted Document Repository</h3>
          </div>

          {/* Toolbar (Intern Filter, Search, and HR-only Upload Button) */}
          {isStaff && (
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Assigned Trainer filter */}
              <select
                className="form-control form-control-sm"
                style={{ minWidth: '160px' }}
                value={selectedTrainerId}
                onChange={(e) => {
                  setSelectedTrainerId(e.target.value);
                  setSelectedInternId('');
                }}
              >
                <option value="">All Trainers</option>
                {mentors.filter(m => m.role === 'Mentor').map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.name}</option>
                ))}
              </select>

              {/* Intern filter dropdown */}
              <select
                className="form-control form-control-sm"
                style={{ minWidth: '180px' }}
                value={selectedInternId}
                onChange={(e) => setSelectedInternId(e.target.value)}
              >
                <option value="">All Interns {selectedTrainerId ? '(Filtered)' : ''}</option>
                {filteredInterns.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}{i.technology ? ` (${i.technology})` : ''}
                  </option>
                ))}
              </select>

              {/* Doc Type filter */}
              <select
                className="form-control form-control-sm"
                style={{ width: '150px' }}
                value={filterDocType}
                onChange={(e) => setFilterDocType(e.target.value)}
              >
                <option value="all">All Document Types</option>
                {REQUIRED_DOCS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* Status filter */}
              <select
                className="form-control form-control-sm"
                style={{ width: '130px' }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Uploaded">Uploaded</option>
                <option value="Rejected">Rejected</option>
              </select>

              {/* Upload button (STRICTLY HR ONLY - Director is NOT able to upload) */}
              {isHR && (
                <button
                  className={`btn btn-sm ${showUploadPanel ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontWeight: 600 }}
                  onClick={() => setShowUploadPanel((v) => !v)}
                  title="Upload official document on behalf of an intern"
                >
                  {showUploadPanel ? <X size={15} /> : <Upload size={15} />}
                  {showUploadPanel ? 'Cancel' : 'Upload Document'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* HR-only upload panel (Strictly hidden for Director) */}
        {isHR && showUploadPanel && (
          <form
            onSubmit={handleHrUpload}
            style={{
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.25rem',
            }}
          >
            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              <Upload size={16} /> Upload Document on Behalf of Intern (HR Action)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Select Intern <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <select
                  required
                  className="form-control"
                  value={hrInternId}
                  onChange={(e) => setHrInternId(e.target.value)}
                >
                  <option value="">— choose intern —</option>
                  {interns.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}{i.technology ? ` (${i.technology})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Document Type <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <select
                  required
                  className="form-control"
                  value={hrDocType}
                  onChange={(e) => setHrDocType(e.target.value)}
                >
                  {ALL_DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Attach File (PDF / Image) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  required
                  type="file"
                  id="hr-file-input"
                  className="form-control"
                  onChange={(e) => setHrFile(e.target.files[0])}
                  disabled={hrUploading}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowUploadPanel(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={hrUploading} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontWeight: 600 }}>
                <Upload size={14} />
                {hrUploading ? 'Uploading…' : 'Save & Upload Document'}
              </button>
            </div>
          </form>
        )}

        {/* Documents table */}
        {loading ? (
          <div style={{ color: 'var(--text-secondary)', padding: '2.5rem 0', textAlign: 'center' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <div>Loading documents…</div>
          </div>
        ) : error ? (
          <div style={{ color: 'var(--color-danger)', padding: '1rem 0' }}>{error}</div>
        ) : filteredDocuments.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3.5rem 1rem' }}>
            <FileText size={36} style={{ marginBottom: '.5rem', opacity: .3 }} />
            <p style={{ fontWeight: 600 }}>No documents found matching the filter criteria.</p>
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '950px', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th>Document Type</th>
                  {!isIntern && <th>Intern Profile</th>}
                  <th>File Document</th>
                  <th>Source / Added By</th>
                  <th>Uploaded Date</th>
                  <th>Status</th>
                  <th>Remarks / Comments</th>
                  {isStaff && <th>Audit Verification</th>}
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => {
                  const isUploadedByHR = doc.uploader_role === 'HR' || (doc.comments && doc.comments.includes('HR'));

                  return (
                    <tr key={doc.id}>
                      {/* Document Type */}
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {doc.doc_type}
                      </td>

                      {/* Intern */}
                      {!isIntern && (
                        <td>
                          <div style={{ fontWeight: 600 }}>{doc.intern_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {doc.mentor_name ? `${doc.mentor_name} • ` : ''}{doc.technology || ''}
                          </div>
                        </td>
                      )}

                      {/* File Link */}
                      <td>
                        <a
                          href={`/uploads/${doc.file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ 
                            color: 'var(--color-primary)', 
                            textDecoration: 'none', 
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(59, 130, 246, 0.08)',
                            padding: '3px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          <FileText size={13} /> View File
                        </a>
                      </td>

                      {/* Added By: HR or Intern */}
                      <td>
                        {isUploadedByHR ? (
                          <span className="badge badge-purple" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            Added by HR {doc.uploader_name ? `(${doc.uploader_name})` : ''}
                          </span>
                        ) : (
                          <span className="badge badge-info" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            Added by Intern
                          </span>
                        )}
                      </td>

                      {/* Uploaded Date */}
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${badgeStatus(doc.status)}`}>{doc.status}</span>
                      </td>

                      {/* Remarks */}
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                        {doc.comments || '—'}
                      </td>

                      {/* Audit Verification */}
                      {isStaff && (
                        <td>
                          {isDirector ? (
                            /* Director: Read-Only Audit Inspection (No buttons, no inputs) */
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {doc.status === 'Approved' ? (
                                <span style={{ color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <CheckCircle size={13} /> Verified by {doc.verified_by_name || 'HR'}
                                </span>
                              ) : doc.status === 'Rejected' ? (
                                <span style={{ color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  ✕ Rejected by {doc.verified_by_name || 'HR'}
                                </span>
                              ) : (
                                <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={12} /> Pending HR Verification
                                </span>
                              )}
                            </div>
                          ) : (
                            /* HR: Verification Controls */
                            doc.status === 'Uploaded' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  style={{ height: '28px', fontSize: '0.75rem' }}
                                  placeholder="Verification feedback…"
                                  value={auditFeedback[doc.id] || ''}
                                  onChange={(e) => setAuditFeedback({ ...auditFeedback, [doc.id]: e.target.value })}
                                />
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleVerify(doc.id, 'Approved')}>Approve</button>
                                  <button className="btn btn-danger btn-sm" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleVerify(doc.id, 'Rejected')}>Reject</button>
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Audited by {doc.verified_by_name || 'HR'}
                              </span>
                            )
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

      {/* ── Pending Documents Section (Director & HR) ── */}
      {isStaff && !loading && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <AlertCircle size={18} color="var(--color-warning)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Interns with Pending Documents</h3>
            {pendingInterns.length > 0 && (
              <span className="badge badge-warning" style={{ marginLeft: '4px' }}>{pendingInterns.length}</span>
            )}
          </div>

          {pendingInterns.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 1rem' }}>
              <UserCheck size={28} style={{ marginBottom: '.5rem', color: 'var(--color-success)' }} />
              <p style={{ fontWeight: 600 }}>All interns have completed their required documentation! ✓</p>
            </div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th>Intern</th>
                    <th>Assigned Trainer</th>
                    <th>Technology</th>
                    <th>Missing Documents</th>
                    <th>Status / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInterns.map((intern) => (
                    <tr key={intern.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{intern.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{intern.email}</div>
                      </td>
                      <td>{intern.mentor_name || '—'}</td>
                      <td>{intern.technology || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {intern.missing.map((m) => (
                            <span key={m} className="badge badge-danger" style={{ fontSize: '0.72rem' }}>{m}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {isDirector ? (
                          /* Director View: Read-Only Status Badge (NO Upload Button) */
                          <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                            Awaiting {intern.missing.length} Doc{intern.missing.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          /* HR View: Upload Action Button */
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '.3rem', whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '3px 8px' }}
                            onClick={() => {
                              setHrInternId(String(intern.id));
                              setShowUploadPanel(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <Upload size={12} /> Upload Doc
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Intern Self-Upload Panel (Interns only) ── */}
      {isIntern && (
        <div id="docs-self-upload-card" className="card" style={{ maxWidth: '640px' }}>
          <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
            <Upload size={18} color="var(--color-primary)" /> Submit Verification Document
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Upload your official credentials for institutional verification. Supported file formats: PDF, PNG, JPG (maximum 5MB).
          </p>
          <form onSubmit={handleSelfUpload}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Document Category <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <select className="form-control" value={selfDocType} onChange={(e) => setSelfDocType(e.target.value)}>
                  {ALL_DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Attach File (PDF / Image) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  type="file"
                  id="docs-file-input"
                  className="form-control"
                  required
                  accept=".pdf, .png, .jpg, .jpeg"
                  onChange={(e) => setSelfFile(e.target.files[0])}
                  disabled={selfUploading}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Remarks / Note (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Updated resume with latest semester credentials"
                value={selfComments}
                onChange={(e) => setSelfComments(e.target.value)}
                disabled={selfUploading}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 600 }} 
              disabled={selfUploading}
            >
              <Upload size={15} />
              {selfUploading ? 'Uploading Document…' : 'Submit Document for Verification'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
