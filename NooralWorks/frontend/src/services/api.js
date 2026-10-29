const API_URL = '/api';

const api = {
  // Token handlers
  getToken() {
    return sessionStorage.getItem('token');
  },
  
  setToken(token) {
    sessionStorage.setItem('token', token);
  },
  
  clearToken() {
    sessionStorage.removeItem('token');
  },
  
  setUser(user) {
    sessionStorage.setItem('user', JSON.stringify(user));
  },
  
  getUser() {
    const u = sessionStorage.getItem('user');
    try {
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  // Base HTTP Fetch wrapper
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = { ...options.headers };

    // Set authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Set JSON content-type if not sending FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Auto logout on unauthorized response
    if (response.status === 401) {
      this.clearToken();
      sessionStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    // Check if the response is JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'API Error');
      }
      return data;
    } else {
      const text = await response.text();
      if (!response.ok) {
        if (text.includes('<!DOCTYPE html>')) {
          throw new Error('API Route not found. Did you forget to restart your backend server after adding new routes?');
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return text;
    }
  },

  // Auth Operations
  // OTP Operations
  async requestOtp(email, isRegister = false, role = null) {
    return this.request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email, isRegister, role })
    });
  },

  async loginPassword(email, password, role) {
    return this.request('/auth/login-password', {
      method: 'POST',
      body: JSON.stringify({ email, password, role })
    });
  },

  async verifyOtp(email, otp) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code: otp })
    });
  },
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.token);
    this.setUser(res.user);
    return res;
  },







  async register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {}
    this.clearToken();
    sessionStorage.removeItem('user');
  },


  async getMe() {
    return this.request(`/auth/me?_t=${Date.now()}`);
  },

  async updateProfile(formData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: formData
    });
  },

  async uploadProfilePhoto(formData) {
    return this.request('/auth/profile-photo', {
      method: 'POST',
      body: formData
    });
  },

  async removeProfilePhoto() {
    return this.request('/auth/profile-photo', {
      method: 'DELETE'
    });
  },

  async updatePassword(newPassword, currentPassword) {
    return this.request('/auth/update-password', {
      method: 'PUT',
      body: JSON.stringify({ newPassword, currentPassword })
    });
  },

  async adminUpdateUserPassword(userId, newPassword) {
    return this.request('/auth/admin-update-password', {
      method: 'PUT',
      body: JSON.stringify({ userId, newPassword })
    });
  },

  // Interns Operations
  async getInterns(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/interns?${query}`);
  },

  async getMentors() {
    return this.request('/interns/mentors');
  },
  
  async getStaff() {
    return this.request('/auth/staff');
  },

  async createTeamLead(data) {
    return this.request('/interns/mentors', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data)
    });
  },

  async deleteTeamLead(userId) {
    return this.request(`/interns/mentors/${userId}`, {
      method: 'DELETE'
    });
  },

  async updateTeamLeadPerformance(userId, rating, notes) {
    return this.request(`/interns/mentors/${userId}/performance`, {
      method: 'PUT',
      body: JSON.stringify({ performance_rating: rating, performance_notes: notes })
    });
  },

  async getIntern(id) {
    return this.request(`/interns/${id}`);
  },

  async createIntern(data) {
    return this.request('/interns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateIntern(id, data) {
    return this.request(`/interns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteIntern(id) {
    return this.request(`/interns/${id}`, {
      method: 'DELETE'
    });
  },

  // Mock Interviews & Tests
  async getMockAssessments() {
    return this.request('/interns/mock-assessments');
  },

  async getMockInterviews(internId) {
    return this.request(`/interns/${internId}/mock-interviews`);
  },

  async createMockInterview(internId, data) {
    return this.request(`/interns/${internId}/mock-interviews`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateMockInterview(mockId, data) {
    return this.request(`/interns/mock-interviews/${mockId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteMockInterview(mockId) {
    return this.request(`/interns/mock-interviews/${mockId}`, {
      method: 'DELETE'
    });
  },

  // Helpdesk
  async getHelpdeskQueries(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/helpdesk?${query}`);
  },

  async getHelpdeskStaff() {
    return this.request('/helpdesk/staff');
  },
  
  async getDirectorHelpdesk() {
    return this.request('/helpdesk/director');
  },

  async createHelpdeskQuery(data) {
    return this.request('/helpdesk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async submitDirectorQuery(data) {
    return this.request('/helpdesk/director', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async answerHelpdeskQuery(id, data) {
    return this.request(`/helpdesk/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  async answerDirectorQuery(id, data) {
    return this.request(`/helpdesk/director/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Attendance Operations
  async getAttendance(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/attendance?${query}`);
  },

  async checkIn(comments = '') {
    return this.request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ comments })
    });
  },

  async checkOut() {
    return this.request('/attendance/check-out', {
      method: 'POST'
    });
  },

  async requestLeave(date, comments = '') {
    return this.request('/attendance/leave', {
      method: 'POST',
      body: JSON.stringify({ date, comments })
    });
  },

  // Leave workflow
  async getLeaveRequests(params = {}) {
    return this.request(`/leave-requests?${new URLSearchParams(params).toString()}`);
  },

  async createLeaveRequest(data) {
    return this.request('/leave-requests', { method: 'POST', body: JSON.stringify(data) });
  },

  async reviewLeaveRequest(id, status, review_notes = '') {
    return this.request(`/leave-requests/${id}/review`, { method: 'POST', body: JSON.stringify({ status, review_notes }) });
  },

  async cancelLeaveRequest(id) {
    return this.request(`/leave-requests/${id}/cancel`, { method: 'POST' });
  },

  async approveAttendance(id, status, comments = '') {
    return this.request(`/attendance/approve/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status, comments })
    });
  },

  // Training Operations
  async getTrainings(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/trainings?${query}`);
  },

  async getTrainingSessions() {
    return this.request('/trainings/sessions');
  },

  async createTraining(data) {
    return this.request('/trainings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async createSession(trainingId, data) {
    return this.request(`/trainings/${trainingId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async scheduleTrainingSession(data) {
    return this.request('/trainings/schedule-session', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getMyTrainingSessions() {
    return this.request('/trainings/my-sessions');
  },

  async deleteTrainingSession(sessionId) {
    return this.request(`/trainings/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  },

  // Task Operations
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tasks?${query}`);
  },

  async assignTask(data) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateTaskStatus(id, status) {
    return this.request(`/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  async submitTask(id, data) {
    return this.request(`/tasks/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async reviewTask(id, data) {
    return this.request(`/tasks/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Daily Work Log Operations
  async getDailyLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/daily-logs?${query}`);
  },

  async submitLogFeedback(attendanceId, comments) {
    return this.request(`/daily-logs/${attendanceId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ comments })
    });
  },

  async getStaffDailyLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/daily-logs/staff?${query}`);
  },

  async submitStaffDailyLog(data) {
    return this.request('/daily-logs/staff', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async submitDirectorStaffFeedback(userId, data) {
    return this.request(`/daily-logs/staff/${userId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Fee Operations
  async getFees(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/fees?${query}`);
  },

  async getPayments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/fees/payments?${query}`);
  },

  async recordPayment(internId, data) {
    return this.request(`/fees/${internId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Document Operations
  async getDocuments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/documents?${query}`);
  },

  async uploadDocument(formData) {
    return this.request('/documents/upload', {
      method: 'POST',
      body: formData
    });
  },

  async uploadDocumentForIntern(formData) {
    return this.request('/documents/upload-for-intern', {
      method: 'POST',
      body: formData
    });
  },

  async verifyDocument(id, status, comments = '') {
    return this.request(`/documents/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status, comments })
    });
  },

  // Notification Operations
  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/notifications${query ? `?${query}` : ''}`);
  },

  async markNotificationRead(id) {
    return this.request(`/notifications/read/${id}`, {
      method: 'POST'
    });
  },

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'POST'
    });
  },

  async markCategoryNotificationsRead(category) {
    return this.request('/notifications/read-category', {
      method: 'POST',
      body: JSON.stringify({ category })
    });
  },

  async clearAllNotifications() {
    return this.request('/notifications', {
      method: 'DELETE'
    });
  },

  async sendTestNotification() {
    return this.request('/notifications/test', {
      method: 'POST'
    });
  },

  async getSmtpStatus() {
    return this.request('/auth/smtp-status');
  },

  async sendTestEmail(email) {
    return this.request('/auth/test-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // Dashboard Operations
  async getDashboard() {
    return this.request('/dashboard');
  },

  // Company Profile Operations
  async getCompany() {
    return this.request('/company');
  },

  async updateCompany(data) {
    return this.request('/company', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Enquiries Operations
  async getEnquiries(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/enquiries?${query}`);
  },

  async createEnquiry(data) {
    return this.request('/enquiries', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateEnquiry(id, data) {
    return this.request(`/enquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteEnquiry(id) {
    return this.request(`/enquiries/${id}`, {
      method: 'DELETE'
    });
  },

  // Mentor Attendance Operations
  async getMentorAttendance(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/attendance/mentors?${query}`);
  },

  async logMentorAttendance(data) {
    return this.request('/attendance/mentors/log', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Auto login/logout (HR marks for intern/trainer with system time)
  async hrLoginIntern(intern_id) {
    return this.request('/attendance/hr-login', {
      method: 'POST',
      body: JSON.stringify({ intern_id })
    });
  },

  async hrLogoutIntern(intern_id) {
    return this.request('/attendance/hr-logout', {
      method: 'POST',
      body: JSON.stringify({ intern_id })
    });
  },

  async trainerLogin(mentor_id) {
    return this.request('/attendance/mentors/login', {
      method: 'POST',
      body: JSON.stringify({ mentor_id })
    });
  },

  async trainerLogout(mentor_id) {
    return this.request('/attendance/mentors/logout', {
      method: 'POST',
      body: JSON.stringify({ mentor_id })
    });
  },

  // HR Attendance Operations
  async getHRAttendance(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/attendance/hr?${query}`);
  },

  async getHRList() {
    return this.request('/attendance/hr/list');
  },

  async logHRAttendance(data) {
    return this.request('/attendance/hr/log', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async hrSelfLogin(hr_id) {
    return this.request('/attendance/hr/login', {
      method: 'POST',
      body: JSON.stringify({ hr_id })
    });
  },

  async hrSelfLogout(hr_id) {
    return this.request('/attendance/hr/logout', {
      method: 'POST',
      body: JSON.stringify({ hr_id })
    });
  },

  // Fee Reminder
  async sendFeeReminder(id) {
    return this.request(`/fees/reminder/${id}`, {
      method: 'POST'
    });
  },

  // AI Operations
  async summarizeLogs(logs) {
    return this.request('/ai/summarize-logs', {
      method: 'POST',
      body: JSON.stringify({ logs })
    });
  },

  // Reports Operations
  async getReportsCatalog() {
    return this.request('/reports/catalog');
  },

  async getReportPreview(type, limit = 50) {
    return this.request(`/reports/preview/${type}?limit=${limit}`);
  }
};

export default api;
