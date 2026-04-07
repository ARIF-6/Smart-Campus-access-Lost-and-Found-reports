import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
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

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
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
export const getAllUsers = async (page = 1, limit = 10, role = '', search = '') => {
  let url = `/admin/users?page=${page}&limit=${limit}`;
  if (role) url += `&role=${role}`;
  if (search) url += `&search=${search}`;
  const response = await api.get(url);
  return response.data;
};

export const updateUser = async (id, userData) => {
  const response = await api.put(`/admin/users/${id}`, userData);
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

/* Lost Item Endpoints */
export const reportLostItem = async (formData) => {
  const response = await api.post('/lost-items', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getLostItems = async (filters = {}) => {
  let url = '/lost-items?';
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.category) params.append('category', filters.category);
  if (filters.status) params.append('status', filters.status);
  
  const response = await api.get(url + params.toString());
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

/* Found Item Endpoints */
export const reportFoundItem = async (formData) => {
  const response = await api.post('/found-items', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getFoundItems = async (filters = {}) => {
  let url = '/found-items?';
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.category) params.append('category', filters.category);
  if (filters.status) params.append('status', filters.status);
  
  const response = await api.get(url + params.toString());
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

/* Claims Endpoints */
export const createClaim = async (formData) => {
  const response = await api.post('/claims', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getAllClaims = async () => {
  const response = await api.get('/claims');
  return response.data;
};

export const getMyClaims = async () => {
  const response = await api.get('/claims/my');
  return response.data;
};

export const updateClaimStatus = async (id, statusData) => {
  const response = await api.put(`/claims/${id}`, statusData);
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

/* Access Log Endpoints */
export const getAccessLogs = async () => {
  const response = await api.get('/access/logs');
  return response.data;
};

/* Audit Log Endpoints */
export const getAuditLogs = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await api.get(`/audit-logs?${queryString}`);
  return response.data;
};

export default api;
