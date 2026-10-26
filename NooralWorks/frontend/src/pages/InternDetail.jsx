import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  User, 
  Calendar, 
  IndianRupee, 
  FileText, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Upload,
  UserCheck,
  Link,
  Award,
  Plus,
  X,
  Download,
  Eye,
  EyeOff,
  Printer,
  Clock,
  CreditCard,
  Briefcase,
  FileCheck,
  Key,
  Edit3,
  Star,
  CheckSquare,
  CalendarCheck
} from 'lucide-react';

export default function InternDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Admin password reset modal state
  const [internPwdModal, setInternPwdModal] = useState(false);
  const [newInternPwd, setNewInternPwd] = useState('');
  const [internPwdLoading, setInternPwdLoading] = useState(false);

  const handleAdminUpdateInternPassword = async (e) => {
    e.preventDefault();
    if (!newInternPwd || newInternPwd.trim().length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }
    setInternPwdLoading(true);
    try {
      await api.adminUpdateUserPassword(data.intern.user_id, newInternPwd.trim());
      alert(`Password for ${data.intern.name} successfully updated to: ${newInternPwd.trim()}`);
      setData(prev => ({
        ...prev,
        intern: { ...prev.intern, plain_password: newInternPwd.trim() }
      }));
      setNewInternPwd('');
      setInternPwdModal(false);
    } catch (err) {
      alert('Failed to update password: ' + err.message);
    } finally {
      setInternPwdLoading(false);
    }
  };

  // Edit Intern Form
  const [editMode, setEditMode] = useState(false);
  const [mentorId, setMentorId] = useState('');
  const [status, setStatus] = useState('');
  const [dept, setDept] = useState('');
  const [tech, setTech] = useState('');
  const [trainingTime, setTrainingTime] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [dob, setDob] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  // Fee payment form
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('UPI');
  const [payComments, setPayComments] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Document upload form
  const [uploadDocType, setUploadDocType] = useState('Resume');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Document feedback comments
  const [docFeedback, setDocFeedback] = useState({});
  const [showOfferLetterModal, setShowOfferLetterModal] = useState(false);
  const [showExperienceLetterModal, setShowExperienceLetterModal] = useState(false);
  const [company, setCompany] = useState({ name: 'nooral.ai', address: '123 Corporate Ave, Mumbai', email: 'hr@nooral.ai', website: 'www.nooral.ai' });

  // HR Attendance Punching
  const [hrPunchLoading, setHrPunchLoading] = useState(false);

  // HR Document Upload on behalf of Intern
  const [hrDocType, setHrDocType] = useState('Resume');
  const [hrUploadFile, setHrUploadFile] = useState(null);
  const [hrDocComments, setHrDocComments] = useState('');
  const [hrUploadLoading, setHrUploadLoading] = useState(false);

  // Payment Receipt Voucher Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'overview', 'attendance', 'tasks', 'dailylogs', 'mock', 'documents', 'fees'

  // Mock Assessment state (Mock Interviews & Mock Tests)
  const [mockInterviews, setMockInterviews] = useState([]);
  const [showMockForm, setShowMockForm] = useState(false);
  const [mockForm, setMockForm] = useState({
    type: 'Mock Interview',
    interviewer_name: user?.name || '',
    scheduled_at: new Date().toISOString().split('T')[0],
    focus_areas: '',
    score: '',
    feedback: '',
    status: 'Scheduled'
  });

  // Score Evaluation Modal state
  const [evaluatingMock, setEvaluatingMock] = useState(null);
  const [evalScore, setEvalScore] = useState('');
  const [evalFeedback, setEvalFeedback] = useState('');
  const [evalLoading, setEvalLoading] = useState(false);

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!evaluatingMock) return;
    if (evalScore === '' || isNaN(evalScore) || parseFloat(evalScore) < 0 || parseFloat(evalScore) > 10) {
      alert('Please enter a valid score between 0 and 10.');
      return;
    }
    setEvalLoading(true);
    try {
      await api.updateMockInterview(evaluatingMock.id, {
        score: parseFloat(evalScore),
        feedback: evalFeedback || 'Evaluation completed by trainer.',
        status: 'Completed'
      });
      setEvaluatingMock(null);
      setEvalScore('');
      setEvalFeedback('');
      fetchMockInterviews();
      alert('Mock assessment score recorded successfully! Score is now reflected on institutional reports.');
    } catch (err) {
      alert(err.message || 'Failed to update score.');
    } finally {
      setEvalLoading(false);
    }
  };

  const fetchCompanyDetails = async () => {
    try {
      const comp = await api.getCompany();
      setCompany(comp);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInternDetails = async () => {
    try {
      const details = await api.getIntern(id);
      setData(details);
      
      // Seed edit form values
      setMentorId(details.intern.mentor_id ? details.intern.mentor_id.toString() : '');
      setStatus(details.intern.status);
      setDept(details.intern.department);
      setTech(details.intern.technology);
      setTrainingTime(details.intern.training_time || '09:00 AM - 01:00 PM');
      setMobileNumber(details.intern.mobile_number || '');
      setDob(details.intern.dob || '');
      setCollegeName(details.intern.college_name || '');
      setQualifications(details.intern.qualifications || '');
      setLinkedinUrl(details.intern.linkedin_url || '');
      setGithubUrl(details.intern.github_url || '');
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMentors = async () => {
    try {
      const data = await api.getMentors();
      setMentors(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMockInterviews = async () => {
    try {
      const data = await api.getMockInterviews(id);
      setMockInterviews(data);
    } catch (err) {
      console.error('Could not load mock interviews:', err);
    }
  };

  const handleAddMockInterview = async (e) => {
    e.preventDefault();
    try {
      const isScored = mockForm.score !== '' && mockForm.score !== null;
      await api.createMockInterview(id, {
        ...mockForm,
        interviewer_name: mockForm.interviewer_name || user?.name || 'Trainer',
        score: isScored ? parseFloat(mockForm.score) : null,
        status: isScored ? 'Completed' : (mockForm.status || 'Scheduled')
      });
      setShowMockForm(false);
      setMockForm({
        type: 'Mock Interview',
        interviewer_name: user?.name || '',
        scheduled_at: new Date().toISOString().split('T')[0],
        focus_areas: '',
        score: '',
        feedback: '',
        status: 'Scheduled'
      });
      fetchMockInterviews();
      alert(`${mockForm.type || 'Mock Assessment'} scheduled successfully!`);
    } catch (err) {
      alert(err.message || 'Failed to schedule assessment.');
    }
  };

  useEffect(() => {
    fetchInternDetails();
    fetchCompanyDetails();
    fetchMockInterviews();
    if (user?.role === 'HR' || user?.role === 'Director') {
      fetchMentors();
    }
  }, [id, user]);

  const handleUpdateIntern = async (e) => {
    e.preventDefault();
    try {
      await api.updateIntern(id, {
        mentor_id: mentorId ? parseInt(mentorId) : null,
        status,
        department: dept,
        technology: tech,
        training_time: trainingTime,
        mobile_number: mobileNumber ? mobileNumber.trim() : '',
        dob: dob || null,
        college_name: collegeName ? collegeName.trim() : '',
        qualifications: qualifications ? qualifications.trim() : '',
        linkedin_url: linkedinUrl ? linkedinUrl.trim() : '',
        github_url: githubUrl ? githubUrl.trim() : ''
      });
      setEditMode(false);
      fetchInternDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRazorpayPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0) return;
    setPayLoading(true);

    const loadRazorpay = () => {
      return new Promise((resolve) => {
        window.Razorpay = function(options) {
          this.options = options;
          this.onFailedCallback = null;
          this.open = function() {
            // Enhanced Interactive UI
            const backdrop = document.createElement('div');
            backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);opacity:0;transition:opacity 0.3s ease;';
            
            const modal = document.createElement('div');
            modal.style.cssText = 'background:#fff;width:380px;border-radius:12px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);transform:translateY(20px);transition:transform 0.3s ease;font-family:system-ui,-apple-system,sans-serif;';
            
            const amountStr = (this.options.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
            const themeColor = this.options.theme?.color || '#3b82f6';
            
            modal.innerHTML = `
              <div style="background: linear-gradient(135deg, ${themeColor}, #1e3a8a); padding: 24px; color: white; position: relative;">
                <button id="rzp-close" style="position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;">✕</button>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <div style="font-weight: 700; font-size: 1.15rem; letter-spacing: -0.5px;">${this.options.name || 'Test Merchant'}</div>
                  <span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">TEST MODE</span>
                </div>
                <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 8px;">${this.options.description || 'Payment'}</div>
                <div style="font-size: 2.2rem; font-weight: 800; display: flex; align-items: baseline; gap: 4px;">
                  <span style="font-size: 1.4rem; opacity: 0.9;">₹</span>${amountStr}
                </div>
              </div>
              
              <div style="padding: 24px;">
                <div id="rzp-methods" style="display: flex; flex-direction: column; gap: 12px;">
                  <div style="font-size: 0.85rem; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Select Payment Method</div>
                  
                  <button class="rzp-btn" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 14px;">
                      <div style="width: 36px; height: 36px; background: #eff6ff; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #3b82f6; font-size: 1.1rem;">U</div>
                      <div style="text-align: left;">
                        <div style="font-weight: 600; color: #0f172a; font-size: 0.95rem;">UPI</div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Google Pay, PhonePe, Paytm</div>
                      </div>
                    </div>
                    <div style="color: #cbd5e1;">➔</div>
                  </button>
                  
                  <button class="rzp-btn" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 14px;">
                      <div style="width: 36px; height: 36px; background: #f8fafc; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #475569; font-size: 1.1rem;">C</div>
                      <div style="text-align: left;">
                        <div style="font-weight: 600; color: #0f172a; font-size: 0.95rem;">Card</div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Visa, MasterCard, RuPay</div>
                      </div>
                    </div>
                    <div style="color: #cbd5e1;">➔</div>
                  </button>
                </div>
                
                <div id="rzp-loader" style="display: none; text-align: center; padding: 32px 0;">
                  <div style="width: 40px; height: 40px; border: 3px solid #f1f5f9; border-top: 3px solid ${themeColor}; border-radius: 50%; animation: rzp-spin 1s linear infinite; margin: 0 auto 16px;"></div>
                  <div style="font-size: 0.95rem; color: #334155; font-weight: 600;">Processing Payment...</div>
                  <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px;">Please do not close this window</div>
                </div>
                
                <div id="rzp-success" style="display: none; text-align: center; padding: 32px 0;">
                  <div style="width: 48px; height: 48px; background: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin: 0 auto 16px; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">✓</div>
                  <div style="font-size: 1.1rem; color: #0f172a; font-weight: 700;">Payment Successful!</div>
                </div>
              </div>
              <style>
                @keyframes rzp-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .rzp-btn:hover { border-color: ${themeColor} !important; background: #f8fafc !important; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) !important; }
                #rzp-close:hover { background: rgba(255,255,255,0.3) !important; transform: scale(1.1); }
              </style>
            `;
            
            backdrop.appendChild(modal);
            document.body.appendChild(backdrop);
            
            requestAnimationFrame(() => {
              backdrop.style.opacity = '1';
              modal.style.transform = 'translateY(0)';
            });

            const cleanup = () => {
              backdrop.style.opacity = '0';
              modal.style.transform = 'translateY(20px)';
              setTimeout(() => { if (document.body.contains(backdrop)) document.body.removeChild(backdrop); }, 300);
            };

            modal.querySelector('#rzp-close').onclick = () => {
              cleanup();
              if (this.onFailedCallback) this.onFailedCallback({ error: { description: 'Payment cancelled by user' } });
            };

            modal.querySelectorAll('.rzp-btn').forEach(btn => {
              btn.onclick = () => {
                modal.querySelector('#rzp-methods').style.display = 'none';
                modal.querySelector('#rzp-loader').style.display = 'block';
                
                setTimeout(() => {
                  modal.querySelector('#rzp-loader').style.display = 'none';
                  modal.querySelector('#rzp-success').style.display = 'block';
                  
                  setTimeout(() => {
                    cleanup();
                    if (this.options.handler) {
                      this.options.handler({ razorpay_payment_id: 'pay_dummy_' + Math.random().toString(36).substring(2, 12).toUpperCase() });
                    }
                  }, 800);
                }, 1800);
              };
            });
          };
          this.on = function(event, cb) {
            if (event === 'payment.failed') this.onFailedCallback = cb;
          };
        };
        resolve(true);
      });
    };

    const res = await loadRazorpay();
    if (!res) {
      alert('Razorpay SDK failed to load. Please check your connection.');
      setPayLoading(false);
      return;
    }

    const options = {
      key: 'rzp_test_YOUR_KEY_HERE', // Dummy test key for dummy transactions
      amount: parseFloat(payAmount) * 100, // Amount in paise
      currency: 'INR',
      name: 'NooralWorks',
      description: 'Internship Fee Payment',
      handler: async function (response) {
        try {
          await api.recordPayment(data.intern.id, {
            amount_paid: parseFloat(payAmount),
            payment_mode: 'UPI',
            comments: `Razorpay Payment ID: ${response.razorpay_payment_id}`
          });
          setPayAmount('');
          fetchInternDetails();
          alert('Payment Successful!');
        } catch (err) {
          alert(err.message);
        } finally {
          setPayLoading(false);
        }
      },
      prefill: {
        name: data.intern.name,
        email: data.intern.email,
      },
      theme: {
        color: '#6366f1'
      }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.on('payment.failed', function (response) {
      alert('Payment Failed: ' + response.error.description);
      setPayLoading(false);
    });
    paymentObject.open();
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0) return;
    setPayLoading(true);
    try {
      await api.recordPayment(data.intern.id, {
        amount_paid: parseFloat(payAmount),
        payment_mode: payMode,
        comments: payComments
      });
      setPayAmount('');
      setPayComments('');
      fetchInternDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('doc_type', uploadDocType);
      formData.append('comments', `Uploaded from profile`);

      await api.uploadDocument(formData);
      setUploadFile(null);
      // Reset input element
      document.getElementById('file-upload-input').value = '';
      fetchInternDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleVerifyDoc = async (docId, dec) => {
    try {
      const fb = docFeedback[docId] || '';
      await api.verifyDocument(docId, dec, fb);
      fetchInternDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHRPunchIn = async () => {
    if (!data?.intern?.id) return;
    setHrPunchLoading(true);
    try {
      const res = await api.hrLoginIntern(data.intern.id);
      alert(res.message || 'Check-in marked successfully.');
      fetchInternDetails();
    } catch (err) {
      alert(err.message || 'Failed to record check-in.');
    } finally {
      setHrPunchLoading(false);
    }
  };

  const handleHRPunchOut = async () => {
    if (!data?.intern?.id) return;
    setHrPunchLoading(true);
    try {
      const res = await api.hrLogoutIntern(data.intern.id);
      alert(res.message || 'Check-out marked successfully.');
      fetchInternDetails();
    } catch (err) {
      alert(err.message || 'Failed to record check-out.');
    } finally {
      setHrPunchLoading(false);
    }
  };

  const handleHRUploadDoc = async (e) => {
    e.preventDefault();
    if (!hrUploadFile || !data?.intern?.id) return;
    setHrUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('intern_id', data.intern.id);
      formData.append('doc_type', hrDocType);
      formData.append('file', hrUploadFile);
      if (hrDocComments) {
        formData.append('comments', hrDocComments);
      }

      await api.uploadDocumentForIntern(formData);
      setHrUploadFile(null);
      setHrDocComments('');
      const inputEl = document.getElementById('hr-file-upload-input');
      if (inputEl) inputEl.value = '';
      alert('Document uploaded successfully on behalf of intern.');
      fetchInternDetails();
    } catch (err) {
      alert(err.message || 'Failed to upload document.');
    } finally {
      setHrUploadLoading(false);
    }
  };

  const handleDownloadOfferLetterPDF = async () => {
    // Load html2canvas
    if (!window.html2canvas) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }

    // Load jsPDF
    if (!window.jspdf) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }

    const modalContent = document.getElementById('offer-letter-content');
    if (!modalContent) return;

    // Temporarily apply white background just in case
    const originalBg = modalContent.style.background;
    modalContent.style.background = '#ffffff';

    const canvas = await window.html2canvas(modalContent, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    modalContent.style.background = originalBg;

    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;

    const pdfWidth  = canvas.width;
    const pdfHeight = canvas.height;
    const pdf = new jsPDF({
      unit: 'px',
      format: [pdfWidth, pdfHeight],
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Offer_Letter_${intern.user_name.replace(/\\s+/g, '_')}.pdf`);
  };

  const handleDownloadExperienceLetterPDF = async () => {
    if (!window.html2canvas) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }

    if (!window.jspdf) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }

    const modalContent = document.getElementById('experience-letter-content');
    if (!modalContent) return;

    const originalBg = modalContent.style.background;
    modalContent.style.background = '#ffffff';

    const canvas = await window.html2canvas(modalContent, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    modalContent.style.background = originalBg;

    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;

    const pdfWidth  = canvas.width;
    const pdfHeight = canvas.height;
    const pdf = new jsPDF({
      unit: 'px',
      format: [pdfWidth, pdfHeight],
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    const internUserName = data?.intern?.user_name || data?.intern?.name || 'Intern';
    pdf.save(`Experience_Letter_${internUserName.replace(/\\s+/g, '_')}.pdf`);
  };

  const isHR = user?.role === 'HR' || user?.role === 'Director';
  const isInternSelf = user?.role === 'Intern';

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading intern profile...</div>;
  if (error) return <div style={{ color: 'var(--color-danger)' }}>{error}</div>;

  const { intern, attendanceSummary, tasksSummary, feeDetail, documents } = data;
  const recentAttendance = data.recentAttendance || [];
  const recentTasks = data.recentTasks || [];
  const paymentHistory = data.paymentHistory || [];
  const recentDailyLogs = data.recentDailyLogs || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ gap: '0.25rem' }}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {/* Top Banner for Trainer View */}
      {user?.role === 'Mentor' && (
        <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(59, 130, 246, 0.08))', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Trainer Module • Assigned Intern Profile Dossier</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                You are mentoring <strong>{intern.name}</strong> ({intern.technology} • {intern.training_time || '09:00 AM - 01:00 PM'}). Manage attendance, daily work logs, milestones, and mock tests/interviews.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setActiveTab('mock');
                setShowMockForm(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={13} /> Schedule Mock Assessment
            </button>
          </div>
        </div>
      )}

      {/* Profile Dossier Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('all')}
          style={{ borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
        >
          All Dossier
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('overview')}
          style={{ borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
        >
          Overview
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('attendance')}
          style={{ borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
        >
          Attendance ({recentAttendance.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('tasks')}
          style={{ borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
        >
          Tasks ({recentTasks.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'dailylogs' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('dailylogs')}
          style={{ borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
        >
          Daily Work Logs ({recentDailyLogs.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'mock' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('mock')}
          style={{ borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
        >
          Mock Assessments ({mockInterviews.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'documents' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('documents')}
          style={{ borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
        >
          Documents ({documents?.length || 0})
        </button>
        {isHR && (
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'fees' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('fees')}
            style={{ borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
          >
            Fee Ledger
          </button>
        )}
      </div>

      <div className={activeTab === 'all' ? 'grid-split' : ''} style={activeTab === 'all' ? undefined : { display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        {/* Left / Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
          {(activeTab === 'all' || activeTab === 'overview') && (
            <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {intern.profile_photo ? (
                  <img src={`http://localhost:5000/uploads/${intern.profile_photo}`} alt="Profile" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={24} />
                  </div>
                )}
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{intern.name}</h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{intern.email}</div>
                </div>
              </div>

              <span className={`badge ${intern.status === 'Active' ? 'badge-success' : intern.status === 'Completed' ? 'badge-info' : 'badge-danger'}`} style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem' }}>
                {intern.status}
              </span>
            </div>

            {!editMode ? (
              <div className="detail-section">
                <div className="detail-grid">
                  <div className="info-item">
                    <span className="info-label">Assigned Trainer</span>
                    <span className="info-value">{intern.mentor_name || 'Not Assigned'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Training Slot</span>
                    <span className="info-value">{intern.training_time || '09:00 AM - 01:00 PM'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Technology</span>
                    <span className="info-value"><span className="badge badge-info">{intern.technology}</span></span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Joining Date</span>
                    <span className="info-value">{intern.joining_date}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Registration Password</span>
                    <span className="info-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      <span>
                        {showRegPassword 
                          ? (intern.plain_password || 'intern123') 
                          : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          padding: '2px',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        title={showRegPassword ? 'Hide password' : 'View password'}
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>

                      {(user?.role === 'HR' || user?.role === 'Director') && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '0.35rem' }}
                          onClick={() => setInternPwdModal(true)}
                          title="Change Intern Login Password"
                        >
                          <Key size={12} color="var(--color-primary)" /> Change
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Mobile Number</span>
                    <span className="info-value">{intern.mobile_number || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">DOB (Age)</span>
                    <span className="info-value">{intern.dob ? `${intern.dob} (${new Date().getFullYear() - new Date(intern.dob).getFullYear()} yrs)` : 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">College Name</span>
                    <span className="info-value">{intern.college_name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Qualifications</span>
                    <span className="info-value">{intern.qualifications || 'N/A'}</span>
                  </div>
                </div>

                {/* Profile Links */}
                <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Profile Links</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {intern.linkedin_url ? (
                      <a href={intern.linkedin_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0a66c2', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                        <Link size={16} /> LinkedIn Profile
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Link size={16} /> LinkedIn not added</span>
                    )}
                    {intern.github_url ? (
                      <a href={intern.github_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#333', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                        <Link size={16} /> GitHub Profile
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Link size={16} /> GitHub not added</span>
                    )}
                    {intern.resume_url ? (
                      <a href={intern.resume_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                        <Link size={16} /> View Resume
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Link size={16} /> Resume not added</span>
                    )}
                  </div>
                </div>

                {isHR && (
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', width: '100%', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => setEditMode(true)} style={{ flex: 1, minWidth: '180px' }}>
                      Edit Profile Details
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowOfferLetterModal(true)} style={{ flex: 1, minWidth: '180px' }}>
                      Generate Offer Letter
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowExperienceLetterModal(true)} style={{ flex: 1, minWidth: '180px' }}>
                      Generate Experience Letter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleUpdateIntern} className="detail-section">
                <div className="form-row">
                  <div className="form-group">
                    <label>Training Slot</label>
                    <select className="form-control" value={trainingTime} onChange={(e) => setTrainingTime(e.target.value)}>
                      <option value="09:00 AM - 01:00 PM">09:00 AM - 01:00 PM</option>
                      <option value="02:00 PM - 06:00 PM">02:00 PM - 06:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Assign Trainer</label>
                    <select className="form-control" value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
                      <option value="">No Trainer</option>
                      {mentors.map(m => (
                        <option key={m.user_id} value={m.user_id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input type="text" className="form-control" value={dept} onChange={(e) => setDept(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Technology Track</label>
                    <select className="form-control" value={tech} onChange={(e) => setTech(e.target.value)}>
                      <option value="Software Development">Software Development</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Web Development">Web Development</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Enrollment Status</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Mobile Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={mobileNumber} 
                      onChange={(e) => setMobileNumber(e.target.value)} 
                      placeholder="e.g. +91 9876543210"
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={dob} 
                      onChange={(e) => setDob(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>College Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={collegeName} 
                      onChange={(e) => setCollegeName(e.target.value)} 
                      placeholder="e.g. Shivaji University / Pune Institute"
                    />
                  </div>
                  <div className="form-group">
                    <label>Qualifications</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={qualifications} 
                      onChange={(e) => setQualifications(e.target.value)} 
                      placeholder="e.g. MCA / B.Tech Computer Engineering"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>LinkedIn Profile URL</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={linkedinUrl} 
                      onChange={(e) => setLinkedinUrl(e.target.value)} 
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div className="form-group">
                    <label>GitHub Profile URL</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={githubUrl} 
                      onChange={(e) => setGithubUrl(e.target.value)} 
                      placeholder="https://github.com/username"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)} style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
          )}

          {/* Attendance and Task Summary */}
          {(activeTab === 'all' || activeTab === 'overview') && (
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem' }}>Engagement Summary</h3>
              <div className="detail-grid">
                <div className="info-item" style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <span className="info-label">Attendance Rate</span>
                  <span className="info-value" style={{ fontSize: '1.5rem', color: 'var(--color-success)', fontWeight: 700 }}>
                    {attendanceSummary.total_days > 0 
                      ? Math.round(((attendanceSummary.present_days + attendanceSummary.late_days) / attendanceSummary.total_days) * 100) 
                      : 0}%
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Present: {attendanceSummary.present_days + attendanceSummary.late_days} / {attendanceSummary.total_days} days
                  </span>
                </div>

                <div className="info-item" style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <span className="info-label">Tasks Finished</span>
                  <span className="info-value" style={{ fontSize: '1.5rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                    {tasksSummary.completed || 0}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Active pending: {(tasksSummary.total_tasks || 0) - (tasksSummary.completed || 0)} tasks
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Attendance History & Real-Time HR Quick-Punch */}
          {(activeTab === 'all' || activeTab === 'attendance') && (
            <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Clock size={18} color="var(--color-info)" />
                Attendance Punch Log ({recentAttendance.length})
              </h3>
              {isHR && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={hrPunchLoading}
                    onClick={handleHRPunchIn}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                    title="Mark attendance check-in for today with current system timestamp"
                  >
                    <Clock size={13} /> {hrPunchLoading ? 'Punching...' : 'HR Check-In'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={hrPunchLoading}
                    onClick={handleHRPunchOut}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                    title="Mark attendance check-out for today with current system timestamp"
                  >
                    <Clock size={13} /> HR Check-Out
                  </button>
                </div>
              )}
            </div>

            {recentAttendance.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                No attendance punch logs recorded yet.
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAttendance.map((att) => (
                      <tr key={att.id}>
                        <td style={{ fontWeight: 600 }}>{att.date}</td>
                        <td>{att.check_in_time || '—'}</td>
                        <td>{att.check_out_time || '—'}</td>
                        <td>{att.working_hours ? `${att.working_hours} hrs` : '—'}</td>
                        <td>
                          <span className={`badge ${
                            att.status === 'Present' ? 'badge-success' :
                            att.status === 'Late' ? 'badge-warning' :
                            att.status === 'Half Day' ? 'badge-info' :
                            att.status === 'Leave' ? 'badge-danger' : 'badge-secondary'
                          }`} style={{ fontSize: '0.75rem' }}>
                            {att.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {att.approved_by_name || 'System / Auto'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {/* Assigned Tasks & Milestone Tracker */}
          {(activeTab === 'all' || activeTab === 'tasks') && (
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Briefcase size={18} color="var(--color-primary)" />
                Assigned Tasks & Progress ({recentTasks.length})
              </h3>
              {recentTasks.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                  No tasks assigned yet.
                </div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <table className="table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Task Title</th>
                        <th>Priority</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Assigned By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTasks.map((tsk) => (
                        <tr key={tsk.id}>
                          <td style={{ fontWeight: 600 }}>{tsk.title}</td>
                          <td>
                            <span className={`badge ${
                              tsk.priority === 'High' ? 'badge-danger' : 
                              tsk.priority === 'Medium' ? 'badge-warning' : 'badge-info'
                            }`} style={{ fontSize: '0.7rem' }}>
                              {tsk.priority || 'Normal'}
                            </span>
                          </td>
                          <td>{tsk.due_date || 'No deadline'}</td>
                          <td>
                            <span className={`badge ${
                              tsk.status === 'Completed' ? 'badge-success' : 
                              tsk.status === 'Review' ? 'badge-info' : 'badge-warning'
                            }`} style={{ fontSize: '0.75rem' }}>
                              {tsk.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {tsk.assigned_by_name || 'Trainer'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Daily Work Logs History */}
          {(activeTab === 'all' || activeTab === 'dailylogs') && (
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <FileCheck size={18} color="var(--color-success)" />
                Daily Work Logs History ({recentDailyLogs.length})
              </h3>
              {recentDailyLogs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                  No daily work logs submitted yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
                  {recentDailyLogs.map((log) => (
                    <div key={log.id} style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)' }}>{log.date}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {log.hours_spent ? `${log.hours_spent} hrs logged` : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        <strong>Work / Tasks:</strong> {log.tasks_completed || log.work_description || '—'}
                      </div>
                      {log.learnings_blockers && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <strong>Learnings & Blockers:</strong> {log.learnings_blockers}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mock Assessments Performance (Interviews & Tests) */}
          {(activeTab === 'all' || activeTab === 'mock') && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Award size={18} color="var(--color-primary)" />
                  Mock Tests & Interviews ({mockInterviews.length})
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Evaluations and performance log for assigned technical tests & interview rounds.
                </span>
              </div>
              {(user?.role === 'Mentor' || user?.role === 'HR') && (
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => setShowMockForm(!showMockForm)} 
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> Schedule Assessment
                </button>
              )}
            </div>

            {showMockForm && (
              <form onSubmit={handleAddMockInterview} style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Schedule Mock Test or Interview
                </div>
                
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Assessment Type <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <select
                      className="form-control"
                      value={mockForm.type || 'Mock Interview'}
                      onChange={e => setMockForm({ ...mockForm, type: e.target.value })}
                    >
                      <option value="Mock Interview">Mock Interview</option>
                      <option value="Mock Test">Mock Test</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Date <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input 
                      type="date" 
                      className="form-control" 
                      required 
                      value={mockForm.scheduled_at} 
                      onChange={e => setMockForm({ ...mockForm, scheduled_at: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Interviewer / Examiner Name</label>
                    <input 
                      className="form-control" 
                      required 
                      value={mockForm.interviewer_name} 
                      onChange={e => setMockForm({ ...mockForm, interviewer_name: e.target.value })} 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Topics / Focus Areas</label>
                    <input 
                      className="form-control" 
                      placeholder="e.g. JavaScript, DSA, System Design" 
                      value={mockForm.focus_areas} 
                      onChange={e => setMockForm({ ...mockForm, focus_areas: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Initial Score (Optional, 0-10)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      step="0.5" 
                      placeholder="Leave blank if pending"
                      className="form-control" 
                      value={mockForm.score} 
                      onChange={e => setMockForm({ ...mockForm, score: e.target.value })} 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Status</label>
                    <select
                      className="form-control"
                      value={mockForm.score !== '' ? 'Completed' : (mockForm.status || 'Scheduled')}
                      onChange={e => setMockForm({ ...mockForm, status: e.target.value })}
                    >
                      <option value="Scheduled">Scheduled (Pending)</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Evaluation Feedback / Observations</label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    placeholder="Candidate strengths, areas of improvement, remarks..."
                    value={mockForm.feedback} 
                    onChange={e => setMockForm({ ...mockForm, feedback: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowMockForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm">Save Assessment</button>
                </div>
              </form>
            )}

            {mockInterviews.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                <Award size={28} style={{ opacity: 0.4, margin: '0 auto 0.5rem', display: 'block' }} />
                No mock assessments scheduled or recorded yet for this intern.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {mockInterviews.map((mi, i) => {
                  const isTest = (mi.type || '').toLowerCase().includes('test');
                  const isCompleted = mi.status === 'Completed' || (mi.score !== null && mi.score !== undefined && mi.score !== '');
                  return (
                    <div key={mi.id} style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span className={`badge ${isTest ? 'badge-info' : 'badge-primary'}`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                            {mi.type || 'Mock Interview'}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Round #{i + 1} — {mi.scheduled_at}
                          </span>
                          <span className={`badge ${isCompleted ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                            {isCompleted ? 'Completed' : 'Scheduled'}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Interviewer/Mentor: <strong>{mi.interviewer_name || 'Assigned Trainer'}</strong>
                        </div>
                        {mi.focus_areas && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Focus Topics: <em>{mi.focus_areas}</em>
                          </div>
                        )}
                        {mi.feedback && (
                          <div style={{ fontSize: '0.85rem', marginTop: '4px', color: 'var(--text-primary)', background: 'var(--bg-card)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                            <strong>Feedback:</strong> {mi.feedback}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'center', minWidth: '70px' }}>
                          <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1, color: mi.score >= 7 ? 'var(--color-success)' : mi.score >= 5 ? 'var(--color-warning)' : mi.score ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                            {mi.score !== null && mi.score !== undefined && mi.score !== '' ? mi.score : '—'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {mi.score !== null && mi.score !== undefined && mi.score !== '' ? '/ 10 Score' : 'Unscored'}
                          </div>
                        </div>

                        {(user?.role === 'Mentor' || user?.role === 'HR') && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                            onClick={() => {
                              setEvaluatingMock(mi);
                              setEvalScore(mi.score !== null && mi.score !== undefined ? mi.score : '');
                              setEvalFeedback(mi.feedback || '');
                            }}
                            title="Evaluate and mark score for this assessment"
                          >
                            <Edit3 size={13} /> {isCompleted ? 'Edit Score' : 'Mark Score'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* Uploaded Documents Tracker */}
          {(activeTab === 'all' || activeTab === 'documents') && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3>Submitted Documentation</h3>
            
            {/* Upload form for Intern (Self) */}
            {isInternSelf && (
              <form onSubmit={handleFileUpload} style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
                  <label>Document Type</label>
                  <select className="form-control" value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)}>
                    <option value="Resume">Resume</option>
                    <option value="ID Proof">ID Proof (Aadhaar / PAN)</option>
                    <option value="Offer Letter">Signed Offer Letter</option>
                    <option value="Completion Certificate">Completion Certificate</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 2, minWidth: '200px', marginBottom: 0 }}>
                  <label>Select File (PDF / Image)</label>
                  <input 
                    type="file" 
                    id="file-upload-input"
                    className="form-control" 
                    required 
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    disabled={uploadLoading}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={uploadLoading}>
                  <Upload size={14} /> Upload
                </button>
              </form>
            )}

            {/* Upload form for HR on behalf of Intern */}
            {user?.role === 'HR' && (
              <form onSubmit={handleHRUploadDoc} style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px dashed var(--color-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  <Upload size={14} /> Upload Document (HR)
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '140px', marginBottom: 0 }}>
                    <label>Document Type</label>
                    <select className="form-control" value={hrDocType} onChange={(e) => setHrDocType(e.target.value)}>
                      <option value="Resume">Resume</option>
                      <option value="ID Proof">ID Proof (Aadhaar / PAN)</option>
                      <option value="Offer Letter">Signed Offer Letter</option>
                      <option value="Completion Certificate">Completion Certificate</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1.5, minWidth: '180px', marginBottom: 0 }}>
                    <label>Select File (PDF / Image)</label>
                    <input 
                      type="file" 
                      id="hr-file-upload-input"
                      className="form-control" 
                      required 
                      onChange={(e) => setHrUploadFile(e.target.files[0])}
                      disabled={hrUploadLoading}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1.5, minWidth: '160px', marginBottom: 0 }}>
                    <label>Remarks</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Verified original shown"
                      value={hrDocComments}
                      onChange={(e) => setHrDocComments(e.target.value)}
                      disabled={hrUploadLoading}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={hrUploadLoading || !hrUploadFile} style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Upload size={14} /> {hrUploadLoading ? 'Uploading...' : 'Upload Doc'}
                  </button>
                </div>
              </form>
            )}

            {documents.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No documents uploaded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', flexDirection: 'column', padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${doc.status === 'Approved' ? 'var(--color-success)' : doc.status === 'Rejected' ? 'var(--color-danger)' : 'var(--color-warning)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{doc.doc_type}</span>
                        <a 
                          href={`/uploads/${doc.file_path}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--color-info)', textDecoration: 'underline' }}
                        >
                          View Document
                        </a>
                      </div>
                      <span className={`badge ${doc.status === 'Approved' ? 'badge-success' : doc.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>
                        {doc.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Uploaded by: {doc.uploader_name || 'Intern'} {doc.uploader_role ? `(${doc.uploader_role})` : ''} 
                      {doc.uploaded_at ? ` on ${new Date(doc.uploaded_at).toLocaleDateString()}` : ''}
                      {doc.verified_by_name && ` • Verified by: ${doc.verified_by_name}`}
                    </div>

                    {doc.comments && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Feedback / Notes: {doc.comments}
                      </div>
                    )}

                    {/* HR Document Audit Panel */}
                    {isHR && doc.status === 'Uploaded' && (
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          className="form-control btn-sm" 
                          style={{ flex: 1, height: '32px' }}
                          placeholder="Rejection reason or approval feedback..." 
                          value={docFeedback[doc.id] || ''}
                          onChange={(e) => setDocFeedback({ ...docFeedback, [doc.id]: e.target.value })}
                        />
                        <button className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.75rem', height: '32px' }} onClick={() => handleVerifyDoc(doc.id, 'Approved')}>
                          Approve
                        </button>
                        <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.75rem', height: '32px' }} onClick={() => handleVerifyDoc(doc.id, 'Rejected')}>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Right Column: Fee Collections Ledger */}
        {(activeTab === 'all' || activeTab === 'fees') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: activeTab === 'all' ? undefined : '100%' }}>
            {feeDetail && (
              <div className="card">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IndianRupee size={20} color="var(--color-warning)" />
                Fee Payment Ledger
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                  <span className={`badge ${feeDetail.status === 'Fully Paid' ? 'badge-success' : feeDetail.status === 'Partially Paid' ? 'badge-warning' : 'badge-danger'}`} style={{ fontWeight: 700 }}>
                    {feeDetail.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Fee:</span>
                  <span style={{ fontWeight: 600 }}>₹{feeDetail.total_amount}</span>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Paid Amount:</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>₹{feeDetail.paid_amount}</span>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Outstanding Balance:</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>₹{feeDetail.remaining_amount}</span>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Due Date:</span>
                  <span style={{ fontWeight: 600 }}>{feeDetail.due_date}</span>
                </div>
              </div>

              {/* Fee Collection entry for HR */}
              {isHR && feeDetail.remaining_amount > 0 && (
                <form onSubmit={handleRecordPayment} style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 700 }}>Collect Fee Installment</h4>
                  
                  <div className="form-group">
                    <label>Amount Collected (₹)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="e.g. 15000"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      required
                      disabled={payLoading}
                      max={feeDetail.remaining_amount}
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <select className="form-control" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                      <option value="UPI">UPI / Digital</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash Receipt</option>
                      <option value="Card">Credit/Debit Card</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Transaction Notes</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Receipt remarks..." 
                      value={payComments}
                      onChange={(e) => setPayComments(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={payLoading}>
                    {payLoading ? 'Recording Transaction...' : 'Record Payment Receipt'}
                  </button>
                </form>
              )}

              {/* Payment entry for Intern (Razorpay Dummy) */}
              {isInternSelf && feeDetail.remaining_amount > 0 && (
                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 700 }}>Pay Your Internship Fee</h4>
                  
                  <div className="form-group">
                    <label>Amount to Pay (₹)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder={`Max: ${feeDetail.remaining_amount}`}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      max={feeDetail.remaining_amount}
                      disabled={payLoading}
                    />
                  </div>

                  <button 
                    onClick={handleRazorpayPayment} 
                    className="btn btn-primary" 
                    style={{ width: '100%', backgroundColor: '#3399cc', border: 'none' }} 
                    disabled={payLoading || !payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > feeDetail.remaining_amount}
                  >
                    {payLoading ? 'Processing...' : 'Pay with Razorpay'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Installments & Payment Receipts History Ledger */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={18} color="var(--color-primary)" />
              Payment Receipts & Installments ({paymentHistory.length})
            </h3>

            {paymentHistory.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                No payment installment receipts recorded yet.
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th style={{ textAlign: 'right' }}>Voucher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((pmt) => (
                      <tr key={pmt.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {pmt.receipt_number || `RCP-${pmt.id}`}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{pmt.payment_date}</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                          ₹{(pmt.amount_paid || pmt.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                            {pmt.payment_mode}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setSelectedReceipt(pmt)}
                            title="View and print official payment voucher receipt"
                          >
                            <Printer size={13} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Official Payment Receipt Voucher Modal */}
      {selectedReceipt && (
        <div className="modal-overlay print-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', padding: '2rem', background: '#fff', color: '#000' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Printer size={18} /> Official Payment Receipt
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Printer size={14} /> Print Receipt
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReceipt(null)}>
                  Close
                </button>
              </div>
            </div>

            <div id="receipt-voucher-content" style={{ border: '2px solid #0f766e', borderRadius: '8px', padding: '2rem', background: '#fff', position: 'relative' }}>
              {/* Receipt Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f766e', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#0f766e', fontSize: '1.35rem', fontWeight: 800 }}>{company.name || 'IICET Services Private Limited'}</h2>
                  <div style={{ fontSize: '0.8rem', color: '#444', marginTop: '4px' }}>{company.address}</div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>Email: {company.email} | Web: {company.website}</div>
                  {company.gstin && <div style={{ fontSize: '0.75rem', color: '#666' }}>GSTIN: {company.gstin}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'inline-block', background: '#0f766e', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                    PAYMENT RECEIPT
                  </span>
                  <div style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                    Receipt No: <span style={{ fontFamily: 'monospace' }}>{selectedReceipt.receipt_number || `RCP-${selectedReceipt.id}`}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#555' }}>
                    Date: {selectedReceipt.payment_date}
                  </div>
                </div>
              </div>

              {/* Intern Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>STUDENT NAME</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{intern.name}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>STUDENT EMAIL</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{intern.email}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>INTERNSHIP TRACK</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{intern.technology}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>TRAINING SLOT / TIME</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{intern.training_time || '09:00 AM - 01:00 PM'}</div>
                </div>
              </div>

              {/* Amount Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Description</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px' }}>Payment Mode</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600 }}>Training Program Fee Installment</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedReceipt.comments || 'Installment payment'}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' }}>
                        {selectedReceipt.payment_mode}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px', fontWeight: 800, fontSize: '1.1rem', color: '#0f766e' }}>
                      ₹{(selectedReceipt.amount_paid || selectedReceipt.amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Ledger Summary */}
              {feeDetail && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                  <div style={{ width: '250px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Course Fee:</span>
                      <span style={{ fontWeight: 600 }}>₹{feeDetail.total_amount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f766e' }}>
                      <span>Total Amount Paid:</span>
                      <span style={{ fontWeight: 700 }}>₹{feeDetail.paid_amount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '4px', color: '#dc2626' }}>
                      <span>Outstanding Dues:</span>
                      <span style={{ fontWeight: 700 }}>₹{feeDetail.remaining_amount?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ borderTop: '1px solid #94a3b8', width: '160px', paddingTop: '4px', textAlign: 'center' }}>
                    Student Signature
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ borderTop: '1px solid #94a3b8', width: '180px', paddingTop: '4px', textAlign: 'center' }}>
                    Authorized Signatory<br />
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{company.name}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
                This is a computer-generated fee payment receipt issued by {company.name}.
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Offer Letter Print Preview Modal */}
      {showOfferLetterModal && data && (
        <div className="modal-overlay print-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', padding: '2rem', background: '#fff', color: '#000' }}>
            
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Onboarding Offer Letter</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handleDownloadOfferLetterPDF} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Download size={14} /> Download PDF
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                  Print
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowOfferLetterModal(false)}>
                  Close
                </button>
              </div>
            </div>

            <div id="offer-letter-content" style={{ border: '1px solid #ddd', padding: '3rem', fontFamily: 'serif', lineHeight: '1.6', color: '#111', minHeight: '800px', position: 'relative', background: '#fff' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #10b981', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#10b981', letterSpacing: '-0.5px' }}>{company.name}</h1>
                  <p style={{ fontSize: '0.85rem', color: '#555', margin: '4px 0 0 0' }}>{company.about || 'Industrial Traineeships & Software Systems'}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#555' }}>
                  <div>{company.address}</div>
                  <div>Email: {company.email}</div>
                  <div>Web: {company.website}</div>
                  {company.gstin && <div>GSTIN: {company.gstin}</div>}
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontWeight: 'bold' }}>Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div style={{ marginTop: '1rem' }}>
                  <strong>To,</strong><br />
                  <strong>{data.intern.name}</strong><br />
                  Email: {data.intern.email}<br />
                  Technology Track: {data.intern.technology}
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '2rem 0', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
                Subject: Offer of Internship Training
              </div>

              <div style={{ fontSize: '0.95rem', textAlign: 'justify' }}>
                <p>Dear {data.intern.name.split(' ')[0]},</p>
                
                <p>
                  Following your registration and technical review, we are pleased to offer you an industrial training internship position in <strong>{data.intern.technology}</strong> at <strong>{company.name}</strong>.
                </p>
                
                <p>
                  Your internship is scheduled to commence on <strong>{new Date(data.intern.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. Your training time slot is set for <strong>{data.intern.training_time || '09:00 AM - 01:00 PM'}</strong>. You will be supervised by Trainer <strong>{data.intern.mentor_name || 'HR Department'}</strong>.
                </p>

                <p>
                  This internship provides hands-on corporate project training. As per the company enrollment policies:
                  <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                    <li>All training program fees must be cleared within 3 months of your joining date.</li>
                    <li>Payments are structured in a maximum of 3 installments as logged in your Billing Ledger.</li>
                    <li>Upon successful completion of the training milestones, project reviews, and document approvals, you will be awarded an official Internship Completion Certificate.</li>
                  </ol>
                </p>

                <p style={{ marginTop: '2rem' }}>
                  Please confirm your acceptance of this training offer by signing and returning a copy of this letter.
                </p>

                <p>We look forward to welcoming you to the {company.name} team!</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem', fontSize: '0.9rem' }}>
                <div>
                  <br /><br />
                  ______________________<br />
                  <strong>Candidate Signature</strong><br />
                  Date:
                </div>
                <div style={{ textAlign: 'right' }}>
                  <br /><br />
                  ______________________<br />
                  <strong>Authorized HR Signatory</strong><br />
                  {company.name}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Experience Letter Print Preview Modal */}
      {showExperienceLetterModal && data && (
        <div className="modal-overlay print-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', padding: '2rem', background: '#fff', color: '#000' }}>
            
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Experience Letter</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handleDownloadExperienceLetterPDF} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Download size={14} /> Download PDF
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                  Print
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowExperienceLetterModal(false)}>
                  Close
                </button>
              </div>
            </div>

            <div id="experience-letter-content" style={{ border: '1px solid #ddd', padding: '3rem', fontFamily: 'serif', lineHeight: '1.6', color: '#111', minHeight: '800px', position: 'relative', background: '#fff' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #10b981', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#10b981', letterSpacing: '-0.5px' }}>{company.name}</h1>
                  <p style={{ fontSize: '0.85rem', color: '#555', margin: '4px 0 0 0' }}>{company.about || 'Industrial Traineeships & Software Systems'}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#555' }}>
                  <div>{company.address}</div>
                  <div>Email: {company.email}</div>
                  <div>Web: {company.website}</div>
                  {company.gstin && <div>GSTIN: {company.gstin}</div>}
                </div>
              </div>

              <div style={{ marginBottom: '2rem', textAlign: 'right', fontWeight: 'bold' }}>
                Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              <div style={{ textAlign: 'center', margin: '2rem 0', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', fontSize: '1.2rem' }}>
                TO WHOMSOEVER IT MAY CONCERN
              </div>

              <div style={{ fontSize: '0.95rem', textAlign: 'justify' }}>
                <p>
                  This is to certify that <strong>{data.intern.name}</strong> has successfully completed an industrial training internship program with <strong>{company.name}</strong> as a <strong>{data.intern.technology} Intern</strong>.
                </p>
                
                <p>
                  Their tenure with us was from <strong>{new Date(data.intern.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> to <strong>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. During this period, {data.intern.name.split(' ')[0]} was exposed to various activities and practical implementation in the field of {data.intern.technology}.
                </p>

                <p>
                  We found them to be highly dedicated, hardworking, and result-oriented. Their performance during the training period was excellent, and they demonstrated a good understanding of the concepts and practices taught.
                </p>

                <p>
                  We wish them all the best in their future endeavors.
                </p>
              </div>

              <div style={{ marginTop: '5rem', fontSize: '0.9rem' }}>
                <div>
                  <strong>For {company.name},</strong><br /><br /><br />
                  ______________________<br />
                  <strong>Authorized Signatory</strong><br />
                  HR Department
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Admin Update Intern Password Modal */}
      {internPwdModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setInternPwdModal(false)}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <Key size={18} color="var(--color-primary)" />
                Update Intern Password
              </h3>
              <button 
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)' }} 
                onClick={() => setInternPwdModal(false)}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Set a new login password for <strong>{data?.intern?.name}</strong>. The intern will immediately use this updated password to sign in.
            </p>

            <form onSubmit={handleAdminUpdateInternPassword}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>New Password <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter new password (min. 4 chars)"
                  value={newInternPwd}
                  onChange={(e) => setNewInternPwd(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setInternPwdModal(false)}
                  disabled={internPwdLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={internPwdLoading}
                >
                  {internPwdLoading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mock Assessment Score Evaluation Modal */}
      {evaluatingMock && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <Award size={18} color="var(--color-primary)" />
                Evaluate {evaluatingMock.type || 'Mock Assessment'}
              </h3>
              <button 
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)' }} 
                onClick={() => setEvaluatingMock(null)}
              >
                &times;
              </button>
            </div>

            <div style={{ background: 'var(--bg-hover)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data?.intern?.name}</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                {evaluatingMock.type || 'Mock Interview'} • {evaluatingMock.scheduled_at} • Examiner: {evaluatingMock.interviewer_name || 'Trainer'}
              </div>
              {evaluatingMock.focus_areas && (
                <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                  Topics: {evaluatingMock.focus_areas}
                </div>
              )}
            </div>

            <form onSubmit={handleSaveEvaluation}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Score (out of 10) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  className="form-control"
                  placeholder="e.g. 8.5"
                  value={evalScore}
                  onChange={(e) => setEvalScore(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Evaluation Notes / Feedback</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Candidate technical strength, code clarity, areas for improvement..."
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEvaluatingMock(null)}
                  disabled={evalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={evalLoading}
                >
                  {evalLoading ? 'Saving Score...' : 'Submit Evaluation & Mark Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-overlay, .print-overlay * {
            visibility: visible;
          }
          .print-overlay {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
