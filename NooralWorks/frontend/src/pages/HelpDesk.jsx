import React, { useState, useEffect } from "react";
import api from "../services/api";
import { 
  HelpCircle, Send, CheckCircle, MessageSquare, Clock, 
  UserCheck, AlertCircle, Filter, Search, Tag, ShieldCheck, 
  Users, Check, ArrowRight, CornerDownRight, RefreshCw, X
} from "lucide-react";

export default function HelpDesk({ user }) {
  const [queries, setQueries] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [solvingId, setSolvingId] = useState(null);

  const currentUserRole = user?.role || "Intern";
  const currentUserId = user?.id;

  // Tab & Filters (Intern defaults to and only uses 'mine')
  const [activeTab, setActiveTab] = useState(user?.role === 'Intern' ? 'mine' : 'all'); // 'all' | 'assigned' | 'mine'
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Create Query Modal / Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    category: "Technical / Training",
    priority: "Medium",
    target_type: "role", // 'role' or 'specific_user'
    target_role: "Mentor",
    target_user_id: "",
    query_text: ""
  });

  // Solve Query Form State (keyed by query id)
  const [solutionForms, setSolutionForms] = useState({});

  // Load queries and staff
  const loadData = async () => {
    try {
      setLoading(true);
      const [queriesData, staffData] = await Promise.all([
        api.getHelpdeskQueries(),
        api.getHelpdeskStaff().catch(() => [])
      ]);
      setQueries(queriesData || []);
      setStaffList(staffData || []);
    } catch (err) {
      console.error("Failed to load helpdesk data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      api.getHelpdeskQueries().then(data => {
        if (data) setQueries(data);
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Filter queries
  const filteredQueries = queries.filter(q => {
    // Interns only see their own queries, never others' queries
    if (currentUserRole === 'Intern') {
      if (q.user_id !== currentUserId) return false;
    } else {
      // Tab filter for Staff
      if (activeTab === "mine") {
        if (q.user_id !== currentUserId) return false;
      } else if (activeTab === "assigned") {
        const isAssignedDirectly = q.target_user_id === currentUserId;
        const isAssignedByRole = !q.target_user_id && q.target_role === currentUserRole;
        if (!isAssignedDirectly && !isAssignedByRole) return false;
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "Resolved") {
        if (q.status !== "Resolved" && q.status !== "Answered") return false;
      } else if (q.status !== statusFilter) {
        return false;
      }
    }

    // Category filter
    if (categoryFilter !== "all" && q.category !== categoryFilter) {
      return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchText = (q.query_text || "").toLowerCase().includes(term);
      const matchSub = (q.subject || "").toLowerCase().includes(term);
      const matchUser = (q.requester_name || "").toLowerCase().includes(term);
      const matchTarget = (q.target_name || q.target_role || "").toLowerCase().includes(term);
      if (!matchText && !matchSub && !matchUser && !matchTarget) return false;
    }

    return true;
  });

  // Calculations for stats: Total Query, Action Required, Resolved Query
  const relevantQueries = currentUserRole === 'Intern' ? queries.filter(q => q.user_id === currentUserId) : queries;
  const totalCount = relevantQueries.length;
  const resolvedCount = relevantQueries.filter(q => q.status === "Resolved" || q.status === "Answered").length;
  const pendingActionCount = queries.filter(q => q.user_id === currentUserId && (q.status === "Open" || q.status === "In Progress")).length;
  const assignedToMeCount = queries.filter(q => 
    (q.target_user_id === currentUserId || (!q.target_user_id && q.target_role === currentUserRole)) &&
    q.status !== "Resolved" && q.status !== "Closed"
  ).length;

  // Handle Query Creation
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.query_text.trim()) {
      alert("Please enter your query details.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        subject: formData.subject.trim() || formData.query_text.trim().substring(0, 50),
        category: formData.category,
        priority: formData.priority,
        query_text: formData.query_text.trim()
      };

      if (formData.target_type === "specific_user" && formData.target_user_id) {
        payload.target_user_id = parseInt(formData.target_user_id);
        const selectedStaff = staffList.find(s => s.id === payload.target_user_id);
        if (selectedStaff) {
          payload.target_role = selectedStaff.role;
        }
      } else {
        payload.target_role = formData.target_role;
      }

      await api.createHelpdeskQuery(payload);

      // Reset form
      setFormData({
        subject: "",
        category: "Technical / Training",
        priority: "Medium",
        target_type: "role",
        target_role: "Mentor",
        target_user_id: "",
        query_text: ""
      });
      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to submit query.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Solution Submission
  const handleSolveSubmit = async (queryId) => {
    const form = solutionForms[queryId] || {};
    const answer = form.answer_text ? form.answer_text.trim() : "";
    const status = form.status || "Resolved";

    if (status === "Resolved" && !answer) {
      alert("Please provide the resolution or answer text to solve this query.");
      return;
    }

    try {
      await api.answerHelpdeskQuery(queryId, {
        answer_text: answer,
        status: status
      });

      setSolvingId(null);
      setSolutionForms(prev => ({ ...prev, [queryId]: {} }));
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to submit solution.");
    }
  };

  // Helper badge color
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "Director": return "badge-warning";
      case "HR": return "badge-purple";
      case "Mentor": return "badge-primary";
      default: return "badge-info";
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "Urgent": return "badge-danger";
      case "High": return "badge-warning";
      case "Medium": return "badge-info";
      default: return "badge-secondary";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Resolved":
      case "Answered":
        return <span className="badge badge-success">✓ Resolved</span>;
      case "In Progress":
        return <span className="badge badge-info">⏳ In Progress</span>;
      case "Closed":
        return <span className="badge badge-secondary">✕ Closed</span>;
      default:
        return <span className="badge badge-warning">● Open</span>;
    }
  };

  const canSolveQuery = (q) => {
    // If closed, query cannot be solved
    if (q.status === "Closed") return false;

    // The person who raised the query cannot solve their own query
    if (q.user_id === currentUserId) return false;

    // 1. If assigned to a specific person: ONLY that respected person can solve it (or Director)
    if (q.target_user_id) {
      if (currentUserId === q.target_user_id) return true;
      if (currentUserRole === "Director") return true;
      return false;
    }

    // 2. If assigned to a respected department / role:
    if (q.target_role) {
      if (q.target_role === "HR") {
        return currentUserRole === "HR" || currentUserRole === "Director";
      }
      if (q.target_role === "Mentor" || q.target_role === "Trainer") {
        return currentUserRole === "Mentor" || currentUserRole === "Director";
      }
      if (q.target_role === "Director") {
        return currentUserRole === "Director";
      }
    }

    // 3. Fallback based on category if neither target_user nor target_role is explicitly set
    const cat = (q.category || "").toLowerCase();
    if (cat.includes("tech") || cat.includes("train")) {
      return currentUserRole === "Mentor" || currentUserRole === "Director";
    }
    if (cat.includes("hr") || cat.includes("fee") || cat.includes("leave") || cat.includes("admin")) {
      return currentUserRole === "HR" || currentUserRole === "Director";
    }

    // General queries without specific assignment
    return currentUserRole === "Director" || currentUserRole === "HR";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Title & Action Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--text-primary)", margin: 0 }}>
            <HelpCircle size={26} color="var(--color-primary)" /> Help Desk & Resolution Hub
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.35rem", marginBottom: 0 }}>
            Open resolution portal for <strong>Interns</strong>, <strong>Trainers</strong>, <strong>HR</strong>, and <strong>Director</strong>.
            Respected persons solve assigned queries and real-time notifications are sent upon resolution.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowCreateModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, padding: "0.65rem 1.2rem" }}
          >
            <Send size={15} /> Raise a Query
          </button>
        </div>
      </div>

      {/* KPI Stats Bar: Total Query | Action Required | Resolved Query */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.1rem 1.25rem", borderLeft: "4px solid var(--color-primary)" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Query</div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--text-primary)" }}>{totalCount}</div>
        </div>

        <div className="card" style={{ padding: "1.1rem 1.25rem", borderLeft: "4px solid #8b5cf6", background: (currentUserRole === 'Intern' ? pendingActionCount : assignedToMeCount) > 0 ? "rgba(139, 92, 246, 0.05)" : "inherit" }}>
          <div style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: 600, textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
            <span>Action Required</span>
            {(currentUserRole === 'Intern' ? pendingActionCount : assignedToMeCount) > 0 && (
              <span className="badge badge-purple" style={{ fontSize: "0.7rem" }}>Pending</span>
            )}
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, marginTop: "0.25rem", color: "#7c3aed" }}>
            {currentUserRole === 'Intern' ? pendingActionCount : assignedToMeCount}
          </div>
        </div>

        <div className="card" style={{ padding: "1.1rem 1.25rem", borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600, textTransform: "uppercase" }}>Resolved Query</div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, marginTop: "0.25rem", color: "#059669" }}>{resolvedCount}</div>
        </div>
      </div>

      {/* Control Navigation & Filter Bar */}
      <div className="card" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          {/* Main Scoping Tabs */}
          {currentUserRole !== 'Intern' ? (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button 
                className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('all')}
                style={{ fontWeight: 600 }}
              >
                All Queries ({queries.length})
              </button>
              <button 
                className={`btn btn-sm ${activeTab === 'assigned' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('assigned')}
                style={{ fontWeight: 600, position: 'relative' }}
              >
                Assigned to Me / My Role
                {assignedToMeCount > 0 && (
                  <span style={{ 
                    marginLeft: '0.4rem', 
                    background: '#ef4444', 
                    color: '#fff', 
                    borderRadius: '10px', 
                    padding: '2px 7px', 
                    fontSize: '0.75rem',
                    fontWeight: 700 
                  }}>
                    {assignedToMeCount}
                  </span>
                )}
              </button>
              <button 
                className={`btn btn-sm ${activeTab === 'mine' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('mine')}
                style={{ fontWeight: 600 }}
              >
                My Raised Queries ({queries.filter(q => q.user_id === currentUserId).length})
              </button>
            </div>
          ) : (
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <MessageSquare size={16} color="var(--color-primary)" /> My Raised Queries ({filteredQueries.length})
            </div>
          )}

          {/* Quick Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "200px" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type="text" 
                className="form-control form-control-sm" 
                placeholder="Search queries..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "28px" }}
              />
            </div>

            {/* Category Filter */}
            <select 
              className="form-control form-control-sm" 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ width: "160px" }}
            >
              <option value="all">All Categories</option>
              <option value="Technical / Training">Technical / Training</option>
              <option value="HR & Administrative">HR & Administrative</option>
              <option value="Attendance & Leave">Attendance & Leave</option>
              <option value="Fees & Accounts">Fees & Accounts</option>
              <option value="General">General</option>
            </select>

            {/* Status Filter */}
            <select 
              className="form-control form-control-sm" 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: "130px" }}
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Raise Query Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1050,
          padding: "1rem"
        }}>
          <div className="card" style={{ maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", paddingBottom: "0.8rem", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Send size={18} color="var(--color-primary)" /> Submit Query to Respected Person
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Target Selection: Respected Person / Department */}
              <div style={{ background: "var(--bg-hover)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <label style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.4rem", display: "block", color: "var(--text-primary)" }}>
                  Assign Query To (Respected Person / Department) *
                </label>
                
                <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input 
                      type="radio" 
                      name="target_type" 
                      checked={formData.target_type === "role"} 
                      onChange={() => setFormData({ ...formData, target_type: "role", target_user_id: "" })}
                    />
                    Department / Role
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input 
                      type="radio" 
                      name="target_type" 
                      checked={formData.target_type === "specific_user"} 
                      onChange={() => setFormData({ ...formData, target_type: "specific_user" })}
                    />
                    Specific Respected Person
                  </label>
                </div>

                {formData.target_type === "role" ? (
                  <>
                    <select 
                      className="form-control" 
                      value={formData.target_role} 
                      onChange={e => setFormData({ ...formData, target_role: e.target.value })}
                    >
                      <option value="Mentor">Trainer / Technical Team {currentUserRole === 'Intern' ? '(Your Assigned Trainer)' : ''}</option>
                      <option value="HR">HR Department</option>
                      <option value="Director">Director / Management</option>
                    </select>
                    {currentUserRole === 'Intern' && formData.target_role === 'Mentor' && (
                      <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                        ✓ Will be automatically assigned to your respective trainer
                      </div>
                    )}
                  </>
                ) : (
                  <select 
                    className="form-control" 
                    required 
                    value={formData.target_user_id} 
                    onChange={e => setFormData({ ...formData, target_user_id: e.target.value })}
                  >
                    <option value="">-- Choose Respected Person --</option>
                    {staffList.filter(s => s.id !== currentUserId).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role === 'Mentor' ? (currentUserRole === 'Intern' ? 'Your Assigned Trainer' : 'Trainer') : s.role})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Category & Priority Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Category</label>
                  <select 
                    className="form-control" 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Technical / Training">Technical / Training</option>
                    <option value="HR & Administrative">HR & Administrative</option>
                    <option value="Attendance & Leave">Attendance & Leave</option>
                    <option value="Fees & Accounts">Fees & Accounts</option>
                    <option value="General">General Doubt</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Priority</label>
                  <select 
                    className="form-control" 
                    value={formData.priority} 
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Topic / Subject</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Brief summary of your query (e.g. Question on React hooks, Leave balance query)"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              {/* Detailed Query Text */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Detailed Question / Description *</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  required 
                  placeholder="Explain your doubt, query, or issue in detail..."
                  value={formData.query_text}
                  onChange={e => setFormData({ ...formData, query_text: e.target.value })}
                />
              </div>

              <div style={{ background: "rgba(59, 130, 246, 0.08)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={15} color="#3b82f6" />
                <span>The assigned respected person will be notified instantly and can provide their resolution here.</span>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Send size={14} /> {submitting ? "Submitting..." : "Submit Query & Notify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Queries List */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 1rem", opacity: 0.6 }} />
          <div>Loading helpdesk queries...</div>
        </div>
      ) : filteredQueries.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3.5rem 1.5rem", color: "var(--text-muted)" }}>
          <HelpCircle size={44} style={{ marginBottom: "1rem", opacity: 0.3 }} />
          <h4 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>No Queries Found</h4>
          <p style={{ fontSize: "0.9rem", maxWidth: "450px", margin: "0 auto 1.5rem" }}>
            {currentUserRole === 'Intern' || activeTab === 'mine'
              ? "You haven't submitted any queries yet. Click 'Raise a Query' to ask a question."
              : activeTab === 'assigned' 
              ? "You do not have any pending queries assigned to you right now." 
              : "No queries match your current filter criteria."}
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Send size={14} /> Raise a Query
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {filteredQueries.map(q => {
            const isSolvingThis = solvingId === q.id;
            const userCanSolve = canSolveQuery(q);
            const isAnswered = q.status === "Resolved" || q.status === "Answered";

            return (
              <div 
                key={q.id} 
                className="card" 
                style={{ 
                  borderLeft: `4px solid ${isAnswered ? 'var(--color-success)' : q.status === 'In Progress' ? '#3b82f6' : '#f59e0b'}`,
                  transition: "all 0.2s ease"
                }}
              >
                {/* Query Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    {/* Requester Identity */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ 
                        width: "36px", 
                        height: "36px", 
                        borderRadius: "50%", 
                        background: "var(--bg-hover)", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "var(--color-primary)",
                        fontSize: "0.9rem",
                        border: "1px solid var(--border-color)"
                      }}>
                        {q.requester_name ? q.requester_name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span>{q.requester_name}</span>
                          <span className={`badge ${getRoleBadgeClass(q.requester_role)}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                            {q.requester_role}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Clock size={11} /> {new Date(q.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />

                    {/* Respected Person Target */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Assigned To:</span>
                      <span className="badge badge-secondary" style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem" }}>
                        <UserCheck size={12} />
                        {q.target_name ? `${q.target_name} (${q.target_role_name || q.target_role})` : `${q.target_role || 'General'} Team`}
                      </span>
                    </div>
                  </div>

                  {/* Badges: Status, Category, Priority */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                      <Tag size={11} style={{ marginRight: "3px" }} /> {q.category}
                    </span>
                    <span className={`badge ${getPriorityBadgeClass(q.priority)}`} style={{ fontSize: "0.75rem" }}>
                      {q.priority}
                    </span>
                    {getStatusBadge(q.status)}
                  </div>
                </div>

                {/* Query Title & Question Body */}
                <div style={{ 
                  background: "var(--bg-hover)", 
                  borderRadius: "var(--radius-md)", 
                  padding: "1rem 1.2rem", 
                  marginBottom: "0.85rem",
                  border: "1px solid var(--border-color)"
                }}>
                  {q.subject && (
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                      {q.subject}
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                    {q.query_text}
                  </p>
                </div>

                {/* Answer / Resolution Section (If solved) */}
                {q.answer_text && (
                  <div style={{ 
                    background: "rgba(16, 185, 129, 0.08)", 
                    border: "1px solid rgba(16, 185, 129, 0.3)", 
                    borderRadius: "var(--radius-md)", 
                    padding: "1rem 1.2rem", 
                    marginBottom: "0.85rem" 
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-success)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <CheckCircle size={15} /> RESOLUTION & ANSWER
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {q.solved_by_name && <span>Solved by <strong>{q.solved_by_name}</strong> • </span>}
                        {q.answered_at ? new Date(q.answered_at).toLocaleString() : ''}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                      {q.answer_text}
                    </p>
                  </div>
                )}

                {/* Solution Form (When clicking Solve / Answer Query) */}
                {isSolvingThis && userCanSolve && (
                  <div style={{ 
                    marginTop: "0.75rem", 
                    padding: "1rem", 
                    background: "var(--bg-card)", 
                    borderRadius: "var(--radius-md)", 
                    border: "2px solid var(--color-primary)" 
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--color-primary)" }}>
                        <CheckCircle size={16} /> Provide Resolution to {q.requester_name}
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => setSolvingId(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Update Status:</label>
                        <select 
                          className="form-control form-control-sm" 
                          style={{ width: "160px" }}
                          value={solutionForms[q.id]?.status || "Resolved"}
                          onChange={e => setSolutionForms({
                            ...solutionForms,
                            [q.id]: { ...(solutionForms[q.id] || {}), status: e.target.value }
                          })}
                        >
                          <option value="Resolved">Resolved (Done)</option>
                          <option value="In Progress">In Progress (Investigating)</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem", display: "block" }}>
                          Resolution / Answer Details *
                        </label>
                        <textarea 
                          className="form-control" 
                          rows={3} 
                          placeholder="Type clear resolution notes or answer for the requester..."
                          value={solutionForms[q.id]?.answer_text || q.answer_text || ""}
                          onChange={e => setSolutionForms({
                            ...solutionForms,
                            [q.id]: { ...(solutionForms[q.id] || {}), answer_text: e.target.value }
                          })}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <AlertCircle size={13} /> {q.requester_name} will automatically receive a notification upon submitting.
                        </span>
                        
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => setSolvingId(null)}
                          >
                            Cancel
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-primary btn-sm" 
                            onClick={() => handleSolveSubmit(q.id)}
                            style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}
                          >
                            <CheckCircle size={14} /> Submit Solution & Notify
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Action Footer */}
                {!isSolvingThis && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.4rem" }}>
                    <div>
                      {q.user_id === currentUserId && !isAnswered && (
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Clock size={12} /> Awaiting resolution from {q.target_name ? q.target_name : (q.target_role ? `${q.target_role} Department` : "Respected Team")}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      {userCanSolve && (
                        <button 
                          className="btn btn-sm btn-primary" 
                          onClick={() => {
                            setSolvingId(q.id);
                            setSolutionForms({
                              ...solutionForms,
                              [q.id]: { answer_text: q.answer_text || "", status: isAnswered ? "Resolved" : "Resolved" }
                            });
                          }}
                          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600 }}
                        >
                          <MessageSquare size={13} />
                          {isAnswered ? "Update Solution" : "Solve Query / Provide Answer"}
                        </button>
                      )}

                      {/* Requester can close their query if resolved */}
                      {q.user_id === currentUserId && q.status !== "Closed" && isAnswered && (
                        <button 
                          className="btn btn-sm btn-secondary" 
                          onClick={async () => {
                            if (confirm("Are you satisfied with the answer and want to mark this query as Closed?")) {
                              await api.answerHelpdeskQuery(q.id, { status: "Closed" });
                              loadData();
                            }
                          }}
                          style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
                        >
                          <Check size={13} /> Close Query
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
