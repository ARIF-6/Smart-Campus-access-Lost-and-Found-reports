import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`,
  timeout: 30000, // 30-second timeout — prevents requests hanging on slow connections
  headers: {
    'Content-Type': 'application/json',
  },
});

/* Add a request interceptor to automatically attach the JWT token */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    // Automatically unwrap standard success responses
    if (response.data && response.data.success === true && response.data.data !== undefined) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    // Handle request timeout
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return Promise.reject({
        ...error,
        userMessage: 'The server is taking too long to respond. Please try again.',
      });
    }
    // Global 401 handler: token missing, expired, or invalid → force re-login
    if (error.response && error.response.status === 401) {
      const message = error.response?.data?.message || '';
      // Only redirect if it's a real auth failure (not a wrong password on login page)
      if (
        message.includes('no token') ||
        message.includes('token failed') ||
        message.includes('user not found') ||
        message.includes('Not authorized')
      ) {
        localStorage.removeItem('token');
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);



export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

/* Admin Endpoints */
export const getAdminStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const getRecentUsers = async () => {
  const response = await api.get('/admin/recent-users');
  return response.data;
};

export const getRecentLostItems = async () => {
  const response = await api.get('/admin/recent-lost-items');
  return response.data;
};

export const getRecentFoundItems = async () => {
  const response = await api.get('/admin/recent-found-items');
  return response.data;
};

/* User Management Endpoints */
export const createUser = async (userData) => {
  const headers = userData instanceof FormData 
    ? { 'Content-Type': 'multipart/form-data' }
    : { 'Content-Type': 'application/json' };
  const response = await api.post('/admin/users', userData, { headers });
  return response.data;
};

export const getAllUsers = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const updateUser = async (id, userData) => {
  const isFormData = userData instanceof FormData;
  const response = await api.put(`/admin/users/${id}`, userData, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/admin/users/${id}`);
  return response.data;
};

export const changeUserRole = async (id, role) => {
  const response = await api.patch(`/admin/users/${id}/role`, { role });
  return response.data;
};

export const changeUserStatus = async (id, isActive) => {
  const response = await api.patch(`/admin/users/${id}/status`, { isActive });
  return response.data;
};

export const restoreUser = async (id) => {
  const response = await api.patch(`/admin/users/${id}/restore`);
  return response.data;
};

export const permanentDeleteUser = async (id) => {
  const response = await api.delete(`/admin/users/${id}/permanent`);
  return response.data;
};

export const importStudentsExcel = async (formData) => {
  const response = await api.post('/admin/users/upload-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const updateUserPhoto = async (id, formData) => {
  const response = await api.patch(`/admin/users/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/* Lost Item Endpoints */
export const reportLostItem = async (formData) => {
  const response = await api.post('/lost-items', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getLostItems = async (params = {}) => {
  const response = await api.get('/lost-items', { params });
  return response.data;
};

export const getLostItemById = async (id) => {
  const response = await api.get(`/lost-items/${id}`);
  return response.data;
};

export const updateLostItem = async (id, itemData) => {
  const response = await api.put(`/lost-items/${id}`, itemData);
  return response.data;
};

export const deleteLostItem = async (id) => {
  const response = await api.delete(`/lost-items/${id}`);
  return response.data;
};

export const markItemFound = async (id) => {
  const response = await api.patch(`/lost-items/${id}/found`);
  return response.data;
};

export const restoreLostItem = async (id) => {
  const response = await api.patch(`/lost-items/${id}/restore`);
  return response.data;
};

export const permanentDeleteLostItem = async (id) => {
  const response = await api.delete(`/lost-items/${id}/permanent`);
  return response.data;
};

/* Found Item Endpoints */
export const reportFoundItem = async (formData) => {
  const response = await api.post('/found-items', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getFoundItems = async (params = {}) => {
  const response = await api.get('/found-items', { params });
  return response.data;
};

export const getFoundItemById = async (id) => {
  const response = await api.get(`/found-items/${id}`);
  return response.data;
};

export const updateFoundItem = async (id, itemData) => {
  const response = await api.put(`/found-items/${id}`, itemData);
  return response.data;
};

export const deleteFoundItem = async (id) => {
  const response = await api.delete(`/found-items/${id}`);
  return response.data;
};

export const markItemReturned = async (id) => {
  const response = await api.patch(`/found-items/${id}/returned`);
  return response.data;
};

export const linkLostItemToFound = async (id, lostItemId) => {
  const response = await api.patch(`/found-items/${id}/link-lost`, { lostItemId });
  return response.data;
};

export const restoreFoundItem = async (id) => {
  const response = await api.patch(`/found-items/${id}/restore`);
  return response.data;
};

export const permanentDeleteFoundItem = async (id) => {
  const response = await api.delete(`/found-items/${id}/permanent`);
  return response.data;
};

/* Claims Endpoints */
export const createClaim = async (formData) => {
  const response = await api.post('/claims', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getAllClaims = async (params = {}) => {
  const response = await api.get('/claims', { params });
  return response.data;
};

export const getMyClaims = async (params = {}) => {
  const response = await api.get('/claims/my', { params });
  return response.data;
};

export const updateClaimStatus = async (id, statusData) => {
  const response = await api.put(`/claims/${id}`, statusData);
  return response.data;
};

export const deleteClaim = async (id) => {
  const response = await api.delete(`/claims/${id}`);
  return response.data;
};

export const restoreClaim = async (id) => {
  const response = await api.patch(`/claims/${id}/restore`);
  return response.data;
};

export const permanentDeleteClaim = async (id) => {
  const response = await api.delete(`/claims/${id}/permanent`);
  return response.data;
};

/* Smart Matching Endpoints */
export const getMatchesForLostItem = async (lostItemId) => {
  const response = await api.get(`/matches/lost/${lostItemId}`);
  return response.data;
};

export const getMatchesForFoundItem = async (foundItemId) => {
  const response = await api.get(`/matches/found/${foundItemId}`);
  return response.data;
};

export const getAllMatches = async () => {
  const response = await api.get('/matches');
  return response.data;
};

export const recalculateMatches = async () => {
  const response = await api.post('/matches/recalculate');
  return response.data;
};

export const updateMatchStatus = async (id, status) => {
  const response = await api.patch(`/matches/${id}/status`, { status });
  return response.data;
};

export const deleteMatch = async (id) => {
  const response = await api.delete(`/matches/${id}`);
  return response.data;
};

/* Notification Endpoints */
export const getUserNotifications = async () => {
  const response = await api.get('/notifications/user');
  return response.data;
};

export const markNotificationAsRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

/* Dashboard Endpoints */
export const getDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data;
};

export const getDashboardLostVsFound = async () => {
  const response = await api.get('/dashboard/lost-vs-found');
  return response.data;
};

export const getDashboardCategories = async () => {
  const response = await api.get('/dashboard/categories');
  return response.data;
};

export const getDashboardActivityLine = async () => {
  const response = await api.get('/dashboard/activity');
  return response.data;
};

export const getDashboardRecentActivity = async () => {
  const response = await api.get('/dashboard/recent-activity');
  return response.data;
};

export const getSystemStatus = async () => {
  const response = await api.get('/dashboard/system-status');
  return response.data;
};

/* Access Log Endpoints */
export const getAccessLogs = async (params = {}) => {
  const response = await api.get('/access/logs', { params });
  return response.data;
};

/* Audit Log Endpoints */
export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/audit-logs', { params });
  return response.data;
};

/* Announcement Endpoints */
export const createAnnouncement = async (announcementData) => {
  const response = await api.post('/announcements', announcementData);
  return response.data;
};

export const getAnnouncements = async (params = {}) => {
  const response = await api.get('/announcements', { params });
  return response.data;
};

export const deleteAnnouncement = async (id) => {
  const response = await api.delete(`/announcements/${id}`);
  return response.data;
};

export const restoreAnnouncement = async (id) => {
  const response = await api.patch(`/announcements/${id}/restore`);
  return response.data;
};

export const permanentDeleteAnnouncement = async (id) => {
  const response = await api.delete(`/announcements/${id}/permanent`);
  return response.data;
};

/* Trash Endpoints */
export const getTrashedUsers = async () => {
  const response = await api.get('/trash/users');
  return response.data;
};

export const getTrashedLostItems = async () => {
  const response = await api.get('/trash/lost-items');
  return response.data;
};

export const getTrashedFoundItems = async () => {
  const response = await api.get('/trash/found-items');
  return response.data;
};

export const getTrashedClaims = async () => {
  const response = await api.get('/trash/claims');
  return response.data;
};

export const getTrashedAnnouncements = async () => {
  const response = await api.get('/trash/announcements');
  return response.data;
};

/* ──────────────────────────────────────────────────
   Security Management Endpoints (Admin View)
────────────────────────────────────────────────── */

// Incidents
export const getSecurityIncidents = async () => {
  const response = await api.get('/security/incidents');
  return response.data;
};

export const updateIncidentStatus = async (id, status) => {
  const response = await api.patch(`/security/incidents/${id}/status`, { status });
  return response.data;
};

// Visitors
export const getVisitors = async () => {
  const response = await api.get('/security/visitors');
  return response.data;
};

// Shifts
export const getShifts = async () => {
  const response = await api.get('/security/shifts');
  return response.data;
};

// Blacklist
export const getBlacklist = async () => {
  const response = await api.get('/security/blacklist');
  return response.data;
};

export const addToBlacklist = async (data) => {
  const response = await api.post('/security/blacklist', data);
  return response.data;
};

export const removeFromBlacklist = async (id) => {
  const response = await api.delete(`/security/blacklist/${id}`);
  return response.data;
};

export const approveBlacklist = async (id) => {
  const response = await api.patch(`/security/blacklist/${id}/approve`);
  return response.data;
};

export const rejectBlacklist = async (id) => {
  const response = await api.patch(`/security/blacklist/${id}/reject`);
  return response.data;
};

export const updateBlacklistStatus = async (id, status) => {
  const response = await api.patch(`/security/blacklist/${id}/status`, { status });
  return response.data;
};

// Live & Reports
export const getSecurityLiveStatus = async () => {
  const response = await api.get('/security/live');
  return response.data;
};

export const getSecurityReports = async () => {
  const response = await api.get('/security/reports');
  return response.data;
};

export const getSystemReports = async (params = {}) => {
  const response = await api.get('/reports/system', { params });
  return response.data;
};

/* Role Management Endpoints */
export const getRoles = async () => {
  const response = await api.get('/roles');
  return response.data;
};

export const createRole = async (roleData) => {
  const response = await api.post('/roles', roleData);
  return response.data;
};

export const updateRole = async (id, roleData) => {
  const response = await api.put(`/roles/${id}`, roleData);
  return response.data;
};

export const deleteRole = async (id) => {
  const response = await api.delete(`/roles/${id}`);
  return response.data;
};

/* ──────────────────────────────────────────────────
   Campus Environment Module Endpoints
────────────────────────────────────────────────── */

export const getComplaints = async (params = {}) => {
  const response = await api.get('/campus-environment', { params });
  return response.data;
};

export const getMyComplaints = async () => {
  const response = await api.get('/campus-environment/my');
  return response.data;
};

export const getComplaintDetails = async (id) => {
  const response = await api.get(`/campus-environment/${id}`);
  return response.data;
};

export const assignComplaint = async (id, assignedTo) => {
  const response = await api.put(`/campus-environment/${id}/assign`, { assignedTo });
  return response.data;
};

export const updateComplaintStatus = async (id, statusData) => {
  const response = await api.put(`/campus-environment/${id}/status`, statusData);
  return response.data;
};

export const getComplaintTracking = async (id) => {
  const response = await api.get(`/campus-environment/${id}/tracking`);
  return response.data;
};

export const getCampusEnvironmentStats = async () => {
  const response = await api.get('/campus-environment/dashboard/stats');
  return response.data;
};

export const getIssueTypes = async () => {
  const response = await api.get('/campus-environment/issue-types');
  return response.data;
};

/* ──────────────────────────────────────────────────
   Class Issues Module Endpoints
────────────────────────────────────────────────── */

export const getClassIssues = async (params = {}) => {
  const response = await api.get('/class-issues/all', { params });
  return response.data;
};

export const getMyClassIssues = async () => {
  const response = await api.get('/class-issues');
  return response.data;
};

export const getClassIssueDetails = async (id) => {
  const response = await api.get(`/class-issues/${id}`);
  return response.data;
};

export const assignClassIssue = async (id, assignedTo) => {
  const response = await api.put(`/class-issues/${id}/assign`, { assignedTo });
  return response.data;
};

export const updateClassIssueStatus = async (id, statusData) => {
  const response = await api.put(`/class-issues/${id}/status`, statusData);
  return response.data;
};

export const getClassIssueAnalytics = async () => {
  const response = await api.get('/class-issues/analytics');
  return response.data;
};

export const getClassIssueTypes = async () => {
  const response = await api.get('/class-issues/issue-types');
  return response.data;
};

/* ──────────────────────────────────────────────────
   University Management Endpoints
   ────────────────────────────────────────────────── */
export const getFaculties = async () => {
  const response = await api.get('/university/faculties');
  return response.data;
};

export const createFaculty = async (facultyData) => {
  const response = await api.post('/university/faculties', facultyData);
  return response.data;
};

export const updateFaculty = async (id, facultyData) => {
  const response = await api.put(`/university/faculties/${id}`, facultyData);
  return response.data;
};

export const deleteFaculty = async (id) => {
  const response = await api.delete(`/university/faculties/${id}`);
  return response.data;
};

export const getDepartments = async () => {
  const response = await api.get('/university/departments');
  return response.data;
};

export const createDepartment = async (departmentData) => {
  const response = await api.post('/university/departments', departmentData);
  return response.data;
};

export const updateDepartment = async (id, departmentData) => {
  const response = await api.put(`/university/departments/${id}`, departmentData);
  return response.data;
};

export const deleteDepartment = async (id) => {
  const response = await api.delete(`/university/departments/${id}`);
  return response.data;
};

export const getClasses = async () => {
  const response = await api.get('/university/classes');
  return response.data;
};

export const createClass = async (classData) => {
  const response = await api.post('/university/classes', classData);
  return response.data;
};

export const updateClass = async (id, classData) => {
  const response = await api.put(`/university/classes/${id}`, classData);
  return response.data;
};

export const deleteClass = async (id) => {
  const response = await api.delete(`/university/classes/${id}`);
  return response.data;
};

export const getHalls = async () => {
  const response = await api.get('/university/halls');
  return response.data;
};

export const createHall = async (hallData) => {
  const response = await api.post('/university/halls', hallData);
  return response.data;
};

export const updateHall = async (hallId, hallData) => {
  const response = await api.put(`/university/halls/${hallId}`, hallData);
  return response.data;
};

export const deleteHall = async (hallId) => {
  const response = await api.delete(`/university/halls/${hallId}`);
  return response.data;
};

export const getClassStudents = async (classId) => {
  const response = await api.get(`/university/classes/${classId}/students`);
  return response.data;
};

export const assignClassLeader = async (classId, studentId) => {
  const response = await api.post(`/university/classes/${classId}/assign-leader`, { studentId });
  return response.data;
};

export const getCampuses = async () => {
  const response = await api.get('/university/campuses');
  return response.data;
};

export const createCampus = async (campusData) => {
  const response = await api.post('/university/campuses', campusData);
  return response.data;
};

export const updateCampus = async (id, campusData) => {
  const response = await api.put(`/university/campuses/${id}`, campusData);
  return response.data;
};

export const deleteCampus = async (id) => {
  const response = await api.delete(`/university/campuses/${id}`);
  return response.data;
};

/* ──────────────────────────────────────────────────
   Campus QR Code Endpoints
────────────────────────────────────────────────── */

/** Returns campus QR details (token, generated/expiry dates) as JSON. */
export const getCampusQR = async (id) => {
  const response = await api.get(`/university/campuses/${id}/qr`);
  return response.data;
};

/**
 * Triggers a browser PDF download for the printable campus QR code sheet.
 * Uses a blob stream so the token is never exposed in the URL bar.
 */
export const downloadCampusQRPDF = async (id, campusName) => {
  const token = localStorage.getItem('token');
  const baseURL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
  const response = await fetch(`${baseURL}/university/campuses/${id}/qr/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to generate PDF');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `campus-qr-${(campusName || 'campus').replace(/\s+/g, '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* ──────────────────────────────────────────────────
   Campus Attendance Endpoints
────────────────────────────────────────────────── */

export const getCampusAttendanceRecords = async (params = {}) => {
  const response = await api.get('/campus-attendance/records', { params });
  return response.data;
};

export default api;
