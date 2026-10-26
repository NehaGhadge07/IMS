import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  IndianRupee, Search, Plus, Calendar, FileText, Printer, 
  CheckCircle, Download, Eye, AlertCircle, TrendingUp, 
  ExternalLink, ArrowRight, ShieldCheck, RefreshCw, X, Receipt
} from 'lucide-react';
import iicetLogo from '../assets/iicet_logo.png';

export default function FeeManagement({ user }) {
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active View Tab for HR / Director: 'tracker' (Installments Matrix) | 'receipts' (All Receipts Ledger)
  const [activeTab, setActiveTab] = useState('tracker');

  // Search and Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Fully Paid' | 'Partially Paid' | 'Unpaid'
  
  // Payment Modal State (for recording manual payment)
  const [showModal, setShowModal] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('UPI');
  const [payComments, setPayComments] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [company, setCompany] = useState({ name: 'IICET Services Private Limited', address: 'Satara, Maharashtra, India' });

  const isDirector = user?.role === 'Director';
  const isHR = user?.role === 'HR' || isDirector;
  const isIntern = user?.role === 'Intern';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [feesData, paymentsData, companyData] = await Promise.all([
        api.getFees(),
        api.getPayments(),
        api.getCompany().catch(() => ({ name: 'IICET Services Private Limited', address: 'Satara, Maharashtra, India' }))
      ]);
      setFees(feesData || []);
      setPayments(paymentsData || []);
      setCompany(companyData);
    } catch (err) {
      setError(err.message || 'Failed to load billing metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSendReminder = async (feeItem) => {
    try {
      const res = await api.sendFeeReminder(feeItem.id);
      alert(res.message || 'Fee reminder notification dispatched successfully!');
    } catch (err) {
      alert(err.message || 'Failed to dispatch fee reminder.');
    }
  };

  const openPaymentModal = (feeItem) => {
    setSelectedIntern(feeItem);
    setPayAmount(feeItem.remaining_amount.toString());
    setShowModal(true);
  };

  const handleRazorpayPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0 || !fees[0]) return;
    setPayLoading(true);

    const loadRazorpay = () => {
      return new Promise((resolve) => {
        window.Razorpay = function(options) {
          this.options = options;
          this.onFailedCallback = null;
          this.open = function() {
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
      key: 'rzp_test_YOUR_KEY_HERE',
      amount: parseFloat(payAmount) * 100,
      currency: 'INR',
      name: 'IICET Services Private Limited',
      description: 'Internship Fee Payment',
      handler: async function (response) {
        try {
          await api.recordPayment(fees[0].intern_id, {
            amount_paid: parseFloat(payAmount),
            payment_mode: 'UPI',
            comments: `Razorpay Payment ID: ${response.razorpay_payment_id}`
          });
          setPayAmount('');
          fetchData();
          alert('Payment Successful!');
        } catch (err) {
          alert(err.message);
        } finally {
          setPayLoading(false);
        }
      },
      theme: { color: '#6366f1' }
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
    if (!selectedIntern || !payAmount || parseFloat(payAmount) <= 0) return;
    setPayLoading(true);
    try {
      const res = await api.recordPayment(selectedIntern.intern_id, {
        amount_paid: parseFloat(payAmount),
        payment_mode: payMode,
        comments: payComments
      });
      setShowModal(false);
      setPayAmount('');
      setPayComments('');
      await fetchData();
      
      const latestPayments = await api.getPayments();
      const newPay = latestPayments.find(p => p.receipt_number === res.receiptNumber);
      if (newPay) {
        const matchingFeeObj = fees.find(f => f.id === newPay.fee_id);
        const relatedPays = latestPayments.filter(p => p.fee_id === newPay.fee_id).sort((a,b) => new Date(a.payment_date) - new Date(b.payment_date));
        setReceiptData({
          fee: matchingFeeObj || selectedIntern,
          currentPayment: newPay,
          allInstallments: relatedPays
        });
        setShowReceiptModal(true);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  // Open receipt for an intern, defaulting to specific payment or latest payment
  const openReceiptModal = (feeItem, relatedPayments, specificPayment = null) => {
    const sorted = [...relatedPayments].sort((a,b) => new Date(a.payment_date) - new Date(b.payment_date));
    const targetPay = specificPayment || sorted[sorted.length - 1];
    setReceiptData({
      fee: feeItem,
      currentPayment: targetPay,
      allInstallments: sorted
    });
    setShowReceiptModal(true);
  };

  // Switch which installment receipt is currently in view
  const switchReceiptPayment = (paymentObj) => {
    if (!receiptData) return;
    setReceiptData({
      ...receiptData,
      currentPayment: paymentObj
    });
  };

  const handleDownloadPDF = async () => {
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

    const element = document.getElementById('receipt-print-area');
    const canvas = await window.html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });

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
    pdf.save(`Receipt_${receiptData.currentPayment.receipt_number}.pdf`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Overall Financial Metrics
  const totalEnrolled = fees.reduce((sum, f) => sum + f.total_amount, 0);
  const totalCollected = fees.reduce((sum, f) => sum + f.paid_amount, 0);
  const totalOutstanding = fees.reduce((sum, f) => sum + f.remaining_amount, 0);
  const collectionRate = totalEnrolled > 0 ? Math.round((totalCollected / totalEnrolled) * 100) : 0;
  
  const fullyPaidCount = fees.filter(f => f.remaining_amount === 0).length;
  const partiallyPaidCount = fees.filter(f => f.paid_amount > 0 && f.remaining_amount > 0).length;
  const unpaidCount = fees.filter(f => f.paid_amount === 0).length;

  // Filter fees based on search and status
  const filteredFees = fees.filter(f => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (f.intern_name || '').toLowerCase().includes(q);
      const matchTech = (f.technology || '').toLowerCase().includes(q);
      const matchEmail = (f.intern_email || '').toLowerCase().includes(q);
      if (!matchName && !matchTech && !matchEmail) return false;
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'Fully Paid' && f.remaining_amount !== 0) return false;
      if (statusFilter === 'Partially Paid' && (f.paid_amount === 0 || f.remaining_amount === 0)) return false;
      if (statusFilter === 'Unpaid' && f.paid_amount !== 0) return false;
    }

    return true;
  });

  // Filter payments for transactions tab
  const filteredPayments = payments.filter(p => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (p.intern_name || '').toLowerCase().includes(q);
      const matchReceipt = (p.receipt_number || '').toLowerCase().includes(q);
      const matchMode = (p.payment_mode || '').toLowerCase().includes(q);
      const matchComments = (p.comments || '').toLowerCase().includes(q);
      if (!matchName && !matchReceipt && !matchMode && !matchComments) return false;
    }
    return true;
  });

  // CSV Export for Director
  const exportToCSV = () => {
    const headers = ["Intern Name", "Technology", "Total Fee", "Paid Amount", "Remaining Fee", "Status", "Due Date", "Installment 1", "Installment 2", "Installment 3"];
    const rows = fees.map(f => {
      const fPays = payments.filter(p => p.fee_id === f.id).sort((a,b) => new Date(a.payment_date) - new Date(b.payment_date));
      const i1 = fPays[0] ? `₹${fPays[0].amount_paid} (${fPays[0].payment_date})` : '-';
      const i2 = fPays[1] ? `₹${fPays[1].amount_paid} (${fPays[1].payment_date})` : '-';
      const i3 = fPays[2] ? `₹${fPays[2].amount_paid} (${fPays[2].payment_date})` : '-';
      return [
        `"${f.intern_name}"`,
        `"${f.technology || ''}"`,
        f.total_amount,
        f.paid_amount,
        f.remaining_amount,
        `"${f.status}"`,
        `"${f.due_date || ''}"`,
        `"${i1}"`,
        `"${i2}"`,
        `"${i3}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fee_Collection_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IndianRupee size={26} color="var(--color-primary)" /> Fee Collection & Payment Ledger
            </h1>
            {isDirector && (
              <span className="badge badge-warning" style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <ShieldCheck size={13} /> Director Financial Oversight
              </span>
            )}
          </div>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)' }}>
            {isDirector 
              ? 'Complete audit of total training fees, collections, remaining balances, intern installment payment schedules, and verified official receipts.'
              : isHR 
              ? 'Manage fee collection ledgers, record installment payments, issue receipts, and dispatch fee alerts.'
              : 'Review your training fee payment ledger, upcoming installments, verified transaction history, and download official receipts.'}
          </p>
        </div>

        {isHR && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={exportToCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
              title="Download full fee ledger as CSV"
            >
              <Download size={14} /> Export CSV
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={fetchData}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Refresh ledger"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        )}
      </div>

      {/* ----------------- FINANCIAL AUDIT KPI CARDS (HR & DIRECTOR) ----------------- */}
      {isHR && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Fees Expected</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
              ₹{totalEnrolled.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Total Fees Paid / Collected</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, marginTop: '0.25rem', color: '#059669' }}>
              ₹{totalCollected.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>Total Remaining Fees</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, marginTop: '0.25rem', color: '#dc2626' }}>
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase' }}>Collection Rate</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, marginTop: '0.25rem', color: '#7c3aed' }}>
              {collectionRate}%
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
          <div>Loading financial ledger and payment audit records...</div>
        </div>
      ) : error ? (
        <div className="card" style={{ color: 'var(--color-danger)', borderLeft: '4px solid var(--color-danger)' }}>{error}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* HR & DIRECTOR VIEW */}
          {isHR && (
            <div className="card" style={{ width: '100%' }}>
              
              {/* Tab Navigation and Search Filters */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className={`btn btn-sm ${activeTab === 'tracker' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('tracker')}
                    style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <IndianRupee size={14} /> Fee Records ({fees.length})
                  </button>
                  <button 
                    className={`btn btn-sm ${activeTab === 'receipts' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('receipts')}
                    style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Receipt size={14} /> Receipts ({payments.length})
                  </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {/* Status Filter */}
                  {activeTab === 'tracker' && (
                    <select 
                      className="form-control form-control-sm"
                      style={{ width: '150px' }}
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Fully Paid">Fully Paid</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Unpaid">Unpaid</option>
                    </select>
                  )}

                  {/* Search Input */}
                  <div style={{ position: 'relative', width: '240px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      className="form-control form-control-sm" 
                      style={{ paddingLeft: '28px' }} 
                      placeholder={activeTab === 'tracker' ? "Search intern/tech..." : "Search receipt/name..."}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* TAB 1: INTERNS INSTALLMENTS TRACKER SPREADSHEET */}
              {activeTab === 'tracker' && (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ fontSize: '0.85rem', borderCollapse: 'collapse', textAlign: 'center', minWidth: '1050px' }}>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ minWidth: '170px', borderRight: '1px solid var(--border-color)', verticalAlign: 'middle', textAlign: 'left' }}>
                          Intern Profile
                        </th>
                        <th colSpan={3} style={{ borderRight: '1px solid var(--border-color)', textAlign: 'center', background: 'rgba(59, 130, 246, 0.04)' }}>
                          Installment 1
                        </th>
                        <th colSpan={3} style={{ borderRight: '1px solid var(--border-color)', textAlign: 'center', background: 'rgba(16, 185, 129, 0.04)' }}>
                          Installment 2
                        </th>
                        <th colSpan={3} style={{ borderRight: '1px solid var(--border-color)', textAlign: 'center', background: 'rgba(245, 158, 11, 0.04)' }}>
                          Installment 3
                        </th>
                        <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border-color)', minWidth: '95px' }}>Total Fee</th>
                        <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border-color)', minWidth: '95px' }}>Paid</th>
                        <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border-color)', minWidth: '105px' }}>Remaining</th>
                        <th rowSpan={2} style={{ verticalAlign: 'middle', minWidth: '140px' }}>Actions & Receipts</th>
                      </tr>
                      <tr>
                        <th style={{ background: 'rgba(59, 130, 246, 0.04)' }}>Amount</th>
                        <th style={{ background: 'rgba(59, 130, 246, 0.04)' }}>Date</th>
                        <th style={{ borderRight: '1px solid var(--border-color)', background: 'rgba(59, 130, 246, 0.04)' }}>Receipt</th>
                        
                        <th style={{ background: 'rgba(16, 185, 129, 0.04)' }}>Amount</th>
                        <th style={{ background: 'rgba(16, 185, 129, 0.04)' }}>Date</th>
                        <th style={{ borderRight: '1px solid var(--border-color)', background: 'rgba(16, 185, 129, 0.04)' }}>Receipt</th>
                        
                        <th style={{ background: 'rgba(245, 158, 11, 0.04)' }}>Amount</th>
                        <th style={{ background: 'rgba(245, 158, 11, 0.04)' }}>Date</th>
                        <th style={{ borderRight: '1px solid var(--border-color)', background: 'rgba(245, 158, 11, 0.04)' }}>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFees.length === 0 ? (
                        <tr>
                          <td colSpan="14" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                            No intern fee records found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredFees.map(f => {
                          const internPayments = payments.filter(p => p.fee_id === f.id).sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
                          const inst1 = internPayments[0];
                          const inst2 = internPayments[1];
                          const inst3 = internPayments[2];

                          const isCompleted = f.remaining_amount === 0;
                          const rowStyle = isCompleted ? { backgroundColor: 'rgba(16, 185, 129, 0.06)' } : {};
                          const cellStyle = { borderRight: '1px solid var(--border-color)', verticalAlign: 'middle' };

                          const renderInstallmentCell = (inst) => {
                            if (!inst) {
                              return (
                                <>
                                  <td style={{ verticalAlign: 'middle', color: 'var(--text-muted)' }}>—</td>
                                  <td style={{ verticalAlign: 'middle', color: 'var(--text-muted)' }}>—</td>
                                  <td style={{ ...cellStyle, color: 'var(--text-muted)' }}>—</td>
                                </>
                              );
                            }

                            return (
                              <>
                                <td style={{ verticalAlign: 'middle', fontWeight: 700, color: 'var(--color-success)' }}>
                                  ₹{inst.amount_paid}
                                </td>
                                <td style={{ verticalAlign: 'middle', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                  {formatDate(inst.payment_date)}
                                </td>
                                <td style={cellStyle}>
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    style={{ 
                                      padding: '2px 6px', 
                                      fontSize: '0.72rem', 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '2px',
                                      color: 'var(--color-primary)',
                                      fontWeight: 600
                                    }}
                                    onClick={() => openReceiptModal(f, internPayments, inst)}
                                    title="View official receipt for this installment"
                                  >
                                    <FileText size={10} /> View
                                  </button>
                                </td>
                              </>
                            );
                          };

                          return (
                            <tr key={f.id} style={rowStyle}>
                              {/* Intern Profile */}
                              <td style={{ ...cellStyle, textAlign: 'left', padding: '0.75rem' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{f.intern_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.intern_email}</div>
                                <span className="badge badge-info" style={{ fontSize: '0.68rem', marginTop: '3px' }}>
                                  {f.technology || 'Internship'}
                                </span>
                              </td>
                              
                              {/* Installment 1 */}
                              {renderInstallmentCell(inst1)}
                              
                              {/* Installment 2 */}
                              {renderInstallmentCell(inst2)}
                              
                              {/* Installment 3 */}
                              {renderInstallmentCell(inst3)}
                              
                              {/* Total Fee */}
                              <td style={{ ...cellStyle, fontWeight: 700, fontSize: '0.92rem' }}>
                                ₹{f.total_amount}
                              </td>

                              {/* Paid Amount */}
                              <td style={{ ...cellStyle, fontWeight: 700, color: '#059669', fontSize: '0.92rem' }}>
                                ₹{f.paid_amount}
                              </td>
                              
                              {/* Remaining Fee */}
                              <td style={{ ...cellStyle, color: isCompleted ? '#059669' : '#dc2626', fontWeight: 800, fontSize: '0.92rem' }}>
                                ₹{f.remaining_amount}
                                {f.remaining_amount > 0 && f.due_date && (
                                  <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                    Due: {formatDate(f.due_date)}
                                  </div>
                                )}
                              </td>

                              {/* Actions & Transparent Receipts */}
                              <td style={{ verticalAlign: 'middle', padding: '0.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                                  {/* View All Receipts button */}
                                  {internPayments.length > 0 && (
                                    <button 
                                      className="btn btn-secondary btn-sm" 
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                                      onClick={() => openReceiptModal(f, internPayments)}
                                      title="Inspect official payment receipts"
                                    >
                                      <Receipt size={12} color="var(--color-primary)" /> Receipts ({internPayments.length})
                                    </button>
                                  )}

                                  {!isCompleted && (
                                    <>
                                      <button 
                                        className="btn btn-primary btn-sm" 
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} 
                                        onClick={() => openPaymentModal(f)}
                                        title="Record installment payment"
                                      >
                                        Record
                                      </button>
                                      <button 
                                        className="btn btn-secondary btn-sm" 
                                        style={{ 
                                          padding: '0.25rem 0.5rem', 
                                          fontSize: '0.75rem', 
                                          backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                                          color: 'var(--color-danger)', 
                                          border: '1px solid rgba(239, 68, 68, 0.2)' 
                                        }} 
                                        onClick={() => handleSendReminder(f)}
                                        title="Dispatch pending installment reminder"
                                      >
                                        Remind
                                      </button>
                                    </>
                                  )}

                                  {isCompleted && (
                                    <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px', color: '#16a34a', fontWeight: 700 }}>
                                      <CheckCircle size={13} /> Paid Full
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: ALL RECEIPTS & TRANSACTIONS AUDIT LEDGER */}
              {activeTab === 'receipts' && (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ fontSize: '0.85rem', borderCollapse: 'collapse', minWidth: '900px' }}>
                    <thead>
                      <tr>
                        <th>Receipt Number</th>
                        <th>Intern Name</th>
                        <th>Installment #</th>
                        <th>Amount Paid</th>
                        <th>Payment Date</th>
                        <th>Mode</th>
                        <th>Remaining Due</th>
                        <th>Notes / Transaction ID</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                            No receipt transactions found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredPayments.map((pay) => {
                          const matchingFee = fees.find(f => f.id === pay.fee_id) || { intern_name: pay.intern_name, total_amount: pay.total_amount, technology: pay.technology };
                          const allInternPays = payments.filter(p => p.fee_id === pay.fee_id).sort((a,b) => new Date(a.payment_date) - new Date(b.payment_date));
                          const instIndex = allInternPays.findIndex(p => p.id === pay.id) + 1;

                          return (
                            <tr key={pay.id}>
                              {/* Receipt Number */}
                              <td>
                                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)', fontSize: '0.88rem' }}>
                                  {pay.receipt_number}
                                </span>
                              </td>

                              {/* Intern Name */}
                              <td>
                                <div style={{ fontWeight: 600 }}>{pay.intern_name}</div>
                                {pay.technology && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pay.technology}</div>}
                              </td>

                              {/* Installment Tag */}
                              <td>
                                <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                                  Installment {instIndex > 0 ? instIndex : 'Payment'}
                                </span>
                              </td>

                              {/* Amount Paid */}
                              <td style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                                ₹{pay.amount_paid.toLocaleString('en-IN')}
                              </td>

                              {/* Payment Date */}
                              <td style={{ color: 'var(--text-secondary)' }}>
                                {formatDate(pay.payment_date)}
                              </td>

                              {/* Mode */}
                              <td>
                                <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                                  {pay.payment_mode}
                                </span>
                              </td>

                              {/* Remaining Due */}
                              <td style={{ fontWeight: 600, color: pay.remaining_amount > 0 ? '#dc2626' : '#059669' }}>
                                ₹{pay.remaining_amount !== undefined ? pay.remaining_amount : '0'}
                              </td>

                              {/* Comments */}
                              <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {pay.comments || '—'}
                              </td>

                              {/* Action */}
                              <td style={{ textAlign: 'center' }}>
                                <button 
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                  onClick={() => openReceiptModal(matchingFee, allInternPays, pay)}
                                >
                                  <FileText size={12} /> View Receipt
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* INTERN SELF-SERVICE VIEW - COMPLETE BILLING LEDGER & FEE UPDATES */}
          {isIntern && (
            fees.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                <Receipt size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Fee Ledger Found</h4>
                <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                  Your training enrollment fee records are being processed by HR. Please contact HR or check back soon.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Main Account Ledger Card */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                      <IndianRupee size={20} color="var(--color-primary)" />
                      My Account Billing & Fee Ledger
                    </h3>
                    <span className={`badge ${
                      fees[0].status === 'Fully Paid' ? 'badge-success' : 
                      fees[0].status === 'Partially Paid' ? 'badge-warning' : 'badge-danger'
                    }`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
                      {fees[0].status === 'Fully Paid' ? '✓ Fully Cleared' : fees[0].status}
                    </span>
                  </div>

                  {/* Summary Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-primary)' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Training Enrolled</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                        ₹{fees[0].total_amount.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #10b981' }}>
                      <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Total Amount Paid</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>
                        ₹{fees[0].paid_amount.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #ef4444' }}>
                      <div style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>Outstanding Balance</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: fees[0].remaining_amount > 0 ? '#dc2626' : '#059669', marginTop: '0.25rem' }}>
                        ₹{fees[0].remaining_amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Payment Clearance Progress Bar */}
                  {(() => {
                    const pct = Math.min(100, Math.round(((fees[0].paid_amount || 0) / (fees[0].total_amount || 1)) * 100));
                    return (
                      <div style={{ marginBottom: '1.5rem', background: 'var(--bg-hover)', padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.45rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Fee Clearance Progress</span>
                          <span style={{ color: pct === 100 ? '#10b981' : 'var(--color-primary)' }}>{pct}% Paid</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Installment Status Matrix */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={16} color="var(--color-primary)" /> Installment Status Overview
                    </h4>
                    
                    {(() => {
                      const internPayments = payments.filter(p => p.fee_id === fees[0].id).sort((a,b) => new Date(a.payment_date) - new Date(b.payment_date));
                      
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                            <div style={{ padding: '0.9rem', background: internPayments[0] ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: `1px solid ${internPayments[0] ? '#10b98144' : 'var(--border-color)'}`, textAlign: 'center' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Installment 1</div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '4px', color: internPayments[0] ? '#10b981' : 'var(--text-muted)' }}>
                                {internPayments[0] ? `₹${internPayments[0].amount_paid.toLocaleString('en-IN')}` : 'Pending'}
                              </div>
                              {internPayments[0] ? (
                                <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '3px', fontWeight: 600 }}>✓ Paid on {formatDate(internPayments[0].payment_date)}</div>
                              ) : (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>Awaiting payment</div>
                              )}
                            </div>

                            <div style={{ padding: '0.9rem', background: internPayments[1] ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: `1px solid ${internPayments[1] ? '#10b98144' : 'var(--border-color)'}`, textAlign: 'center' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Installment 2</div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '4px', color: internPayments[1] ? '#10b981' : 'var(--text-muted)' }}>
                                {internPayments[1] ? `₹${internPayments[1].amount_paid.toLocaleString('en-IN')}` : 'Pending'}
                              </div>
                              {internPayments[1] ? (
                                <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '3px', fontWeight: 600 }}>✓ Paid on {formatDate(internPayments[1].payment_date)}</div>
                              ) : (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>Awaiting payment</div>
                              )}
                            </div>

                            <div style={{ padding: '0.9rem', background: internPayments[2] ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: `1px solid ${internPayments[2] ? '#10b98144' : 'var(--border-color)'}`, textAlign: 'center' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Installment 3</div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '4px', color: internPayments[2] ? '#10b981' : 'var(--text-muted)' }}>
                                {internPayments[2] ? `₹${internPayments[2].amount_paid.toLocaleString('en-IN')}` : 'Pending'}
                              </div>
                              {internPayments[2] ? (
                                <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '3px', fontWeight: 600 }}>✓ Paid on {formatDate(internPayments[2].payment_date)}</div>
                              ) : (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>Awaiting payment</div>
                              )}
                            </div>
                          </div>

                          {/* Office Policy Notice */}
                          <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed rgba(59, 130, 246, 0.3)', padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                              Office Policy Check:
                            </div>
                            All company training fees must be cleared within three months from joining (maximum 3 installments).
                            {fees[0].remaining_amount > 0 && fees[0].due_date && (
                              <div style={{ marginTop: '5px', color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <AlertCircle size={14} /> Next Installment Due Date: {formatDate(fees[0].due_date)}
                              </div>
                            )}
                          </div>

                          {internPayments.length > 0 && (
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ width: '100%', gap: '0.5rem', padding: '0.6rem' }} 
                              onClick={() => openReceiptModal(fees[0], internPayments)}
                            >
                              <FileText size={15} /> View Consolidated Printable Company Receipt
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Razorpay Online Payment Option */}
                  {fees[0].remaining_amount > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Receipt size={16} color="#3399cc" /> Pay Internship Fee Online
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Make instant installment payments via Razorpay (UPI, Credit/Debit Card, Net Banking). Payments update your ledger automatically upon success.
                      </p>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.85rem' }}>Amount to Pay (₹)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder={`Max: ₹${fees[0].remaining_amount}`}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          max={fees[0].remaining_amount}
                          disabled={payLoading}
                          style={{ maxWidth: '320px' }}
                        />
                      </div>
                      <button 
                        onClick={handleRazorpayPayment} 
                        className="btn btn-primary" 
                        style={{ backgroundColor: '#3399cc', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, padding: '0.65rem 1.5rem' }} 
                        disabled={payLoading || !payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > fees[0].remaining_amount}
                      >
                        {payLoading ? 'Processing Payment...' : `Pay ₹${payAmount ? parseFloat(payAmount).toLocaleString('en-IN') : '0'} with Razorpay`}
                      </button>
                    </div>
                  )}
                </div>

                {/* VERIFIED PAYMENT HISTORY & FEE UPDATES TABLE */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                        <Receipt size={20} color="#10b981" />
                        Verified Payment History & Fee Updates
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Chronological record of all fee installment payments, verified transactions, and HR accounting updates.
                      </div>
                    </div>
                    <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
                      {payments.filter(p => p.fee_id === fees[0].id).length} Transaction Record{payments.filter(p => p.fee_id === fees[0].id).length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {(() => {
                    const internPayments = payments.filter(p => p.fee_id === fees[0].id).sort((a,b) => new Date(b.payment_date) - new Date(a.payment_date));
                    
                    if (internPayments.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                          <Receipt size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No Payment Updates Recorded Yet</div>
                          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            Once you make an online payment or HR records your installment, verified transactions will appear here.
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Receipt / Trx #</th>
                              <th>Payment Date</th>
                              <th>Installment</th>
                              <th>Amount Paid</th>
                              <th>Payment Mode</th>
                              <th>Verification Status</th>
                              <th>Remarks & Updates</th>
                              <th style={{ textAlign: 'center' }}>Official Receipt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {internPayments.map((pay, idx) => {
                              const sortedAsc = [...internPayments].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
                              const instIndex = sortedAsc.findIndex(p => p.id === pay.id) + 1;

                              return (
                                <tr key={pay.id}>
                                  <td>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-primary)' }}>
                                      {pay.receipt_number || `RC-FEE-${pay.id}`}
                                    </span>
                                  </td>
                                  <td style={{ color: 'var(--text-secondary)' }}>
                                    {formatDate(pay.payment_date)}
                                  </td>
                                  <td>
                                    <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                                      Installment {instIndex > 0 ? instIndex : idx + 1}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                                    ₹{pay.amount_paid.toLocaleString('en-IN')}
                                  </td>
                                  <td>
                                    <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                                      {pay.payment_mode || 'Online / UPI'}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <CheckCircle size={11} /> Verified & Recorded
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '220px' }}>
                                    {pay.comments || 'Installment cleared via verified accounting ledger'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button 
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      onClick={() => openReceiptModal(fees[0], sortedAsc, pay)}
                                    >
                                      <FileText size={13} color="var(--color-primary)" /> Receipt
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )
          )}

        </div>
      )}

      {/* Record Payment Modal (for HR / Director) */}
      {showModal && selectedIntern && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Collect Fee Installment</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div>Enrolling Intern: <span style={{ fontWeight: 700 }}>{selectedIntern.intern_name}</span></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Outstanding Training Fee Due: ₹{selectedIntern.remaining_amount}</div>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label>Amount Collected (₹)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  required 
                  max={selectedIntern.remaining_amount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  disabled={payLoading}
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
                <label>Receipt remarks / Comments</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Second installment payment"
                  value={payComments}
                  onChange={(e) => setPayComments(e.target.value)}
                  disabled={payLoading}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={payLoading}>
                {payLoading ? 'Saving Transaction...' : 'Record Payment Receipt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Professional Receipt Printable Modal (Full Transparency) */}
      {showReceiptModal && receiptData && (
        <div className="modal-overlay print-overlay">
          <div className="modal-content receipt-modal-box" style={{ maxWidth: '900px', width: '95vw', padding: '2rem', background: '#fff', color: '#000', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
            
            {/* Action Bar (hidden during printing) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              {/* Multi-Installment Receipt Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#555' }}>Select Receipt:</span>
                {receiptData.allInstallments.map((inst, idx) => (
                  <button 
                    key={inst.id}
                    className={`btn btn-sm ${receiptData.currentPayment?.id === inst.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                    onClick={() => switchReceiptPayment(inst)}
                  >
                    Installment {idx + 1} (₹{inst.amount_paid})
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={handleDownloadPDF}>
                  <Download size={13} /> Download PDF
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowReceiptModal(false)}>
                  Close
                </button>
              </div>
            </div>

            {/* Receipt Document Area */}
            <div id="receipt-print-area" style={{ border: '3px solid #1a1a2e', padding: '2rem', fontFamily: "'Segoe UI', Arial, sans-serif", background: '#fff', boxSizing: 'border-box', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', maxWidth: '65%' }}>
                  <img src={iicetLogo} alt="IICET Logo" style={{ width: '85px', height: 'auto', objectFit: 'contain', marginTop: '4px' }} />
                  <div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.3rem 0', color: '#10b981', letterSpacing: '-0.5px' }}>IICET Services Private Limited</h1>
                    <p style={{ fontSize: '0.9rem', color: '#333', margin: '0 0 0.5rem 0', fontWeight: 700, fontStyle: 'italic' }}>Powering the Intelligent Future.</p>
                    <p style={{ fontSize: '0.8rem', color: '#444', margin: '0 0 0.25rem 0' }}><strong>(CIN):</strong> U85306PN2024PTC227572</p>
                    <p style={{ fontSize: '0.8rem', color: '#444', margin: '0 0 0.25rem 0', lineHeight: '1.4' }}><strong>Address:</strong> 1st Floor, HB Tower, near Bata Showroom, <br/>Powai Naka, Satara, Maharashtra 415001, India</p>
                    <p style={{ fontSize: '0.8rem', color: '#444', margin: '0 0 0.25rem 0' }}><strong>Phone:</strong> +91 84858 19119, +91 77578 98255</p>
                    <p style={{ fontSize: '0.8rem', color: '#444', margin: '0' }}><strong>Email ID:</strong> enquiry@iicet.com</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '30%' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Official Receipt</h2>
                  <p style={{ fontSize: '0.85rem', margin: '0 0 0.4rem 0', fontWeight: 700, color: '#1d4ed8' }}>No: {receiptData.currentPayment?.receipt_number}</p>
                  <p style={{ fontSize: '0.85rem', margin: '0 0 0.25rem 0', fontWeight: 600 }}>Installment: {receiptData.allInstallments.findIndex(p => p.id === receiptData.currentPayment?.id) + 1} of 3</p>
                  <p style={{ fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}><strong>Date:</strong> {formatDate(receiptData.currentPayment?.payment_date)}</p>
                  <p style={{ fontSize: '0.85rem', margin: '0' }}><strong>Payment Mode:</strong> {receiptData.currentPayment?.payment_mode}</p>
                </div>
              </div>

              {/* Receipt metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: '1.8' }}>
                <div>
                  <div><strong>Intern Name:</strong> {receiptData.fee.intern_name}</div>
                  <div><strong>Internship Area:</strong> {receiptData.fee.technology || 'Professional Training'}</div>
                  <div><strong>Joining Date:</strong> {formatDate(receiptData.fee.joining_date || '2026-05-01')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Payment Date:</strong> {formatDate(receiptData.currentPayment?.payment_date)}</div>
                  <div><strong>Current Installment Amount:</strong> ₹{receiptData.currentPayment?.amount_paid}</div>
                  <div><strong>Logged By:</strong> IICET Accounts / Finance</div>
                </div>
              </div>

              {/* Payment Details Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000', textAlign: 'left', background: '#f8fafc' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Installment Description</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Receipt #</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Payment Date</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Mode</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.allInstallments.map((inst, index) => {
                    const isSelected = inst.id === receiptData.currentPayment?.id;
                    return (
                      <tr key={inst.id} style={{ borderBottom: '1px solid #ddd', background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'inherit' }}>
                        <td style={{ padding: '10px', fontWeight: isSelected ? 800 : 600 }}>
                          Installment {index + 1} {isSelected && ' (Current)'}
                        </td>
                        <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {inst.receipt_number}
                        </td>
                        <td style={{ padding: '10px' }}>{formatDate(inst.payment_date)}</td>
                        <td style={{ padding: '10px' }}>{inst.payment_mode}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                          ₹{inst.amount_paid}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Fill gaps up to 3 installments */}
                  {Array.from({ length: Math.max(0, 3 - receiptData.allInstallments.length) }).map((_, i) => {
                    const instIdx = receiptData.allInstallments.length + i + 1;
                    return (
                      <tr key={`empty-${instIdx}`} style={{ borderBottom: '1px solid #eee', color: '#999', fontStyle: 'italic' }}>
                        <td style={{ padding: '10px' }}>Installment {instIdx}</td>
                        <td style={{ padding: '10px' }}>—</td>
                        <td style={{ padding: '10px' }}>—</td>
                        <td style={{ padding: '10px' }}>—</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>Pending Dues</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Invoice Calculations */}
              {(() => {
                const calculatedPaidAmount = receiptData.allInstallments.reduce((sum, inst) => sum + parseFloat(inst.amount_paid || 0), 0);
                const calculatedRemaining = receiptData.fee.total_amount - calculatedPaidAmount;
                return (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.8' }}>
                    <div style={{ width: '280px', borderTop: '1px solid #000', paddingTop: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Fees Enrolled:</span>
                        <strong style={{ fontSize: '1rem' }}>₹{receiptData.fee.total_amount}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Paid to Date:</span>
                        <strong style={{ fontSize: '1rem', color: '#10b981' }}>₹{calculatedPaidAmount}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', marginTop: '6px', paddingTop: '6px' }}>
                        <span>Outstanding Due:</span>
                        <strong style={{ fontSize: '1.1rem', color: calculatedRemaining > 0 ? '#ef4444' : '#10b981' }}>
                          ₹{calculatedRemaining}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Office Policies */}
              <div style={{ borderTop: '1px dashed #000', paddingTop: '1rem', fontSize: '0.75rem', color: '#555', lineHeight: '1.5' }}>
                <p style={{ margin: '0 0 4px 0' }}><strong>Receipt Terms & Policies:</strong></p>
                <p style={{ margin: '0 0 2px 0' }}>1. This is a computer-generated official payment receipt issued by IICET Services Private Limited. No signature is required.</p>
                <p style={{ margin: '0' }}>2. As per institutional policy, all interns must clear their total training fees within 3 months of joining across a maximum of 3 installments.</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Print CSS Inject */}
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
            background: #fff !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .receipt-modal-box {
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
