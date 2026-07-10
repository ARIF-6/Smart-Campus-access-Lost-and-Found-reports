import api from './api';

export const fetchHosts = async (status = '', campus = '') => {
  try {
    const params = {};
    if (status) params.status = status;
    if (campus) params.campus = campus;
    
    const response = await api.get('/hosts', { params });
    return response;
  } catch (error) {
    console.error('Error fetching hosts', error);
    throw error;
  }
};

export const createHost = async (payload) => {
  try {
    const response = await api.post('/hosts', payload);
    return response;
  } catch (error) {
    console.error('Error creating host', error);
    throw error;
  }
};

export const updateHost = async (id, payload) => {
  try {
    const response = await api.put(`/hosts/${id}`, payload);
    return response;
  } catch (error) {
    console.error('Error updating host', error);
    throw error;
  }
};

export const deleteHost = async (id) => {
  try {
    const response = await api.delete(`/hosts/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting host', error);
    throw error;
  }
};
