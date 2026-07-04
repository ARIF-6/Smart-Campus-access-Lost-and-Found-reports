import api from './api';

/**
 * Fetch active Lost & Found categories registered in the system.
 * Uses the dedicated /categories/lost-found endpoint accessible by all authenticated users.
 * @returns {Promise<Array>} resolves to array of category objects { _id, name }
 */
export const fetchLostFoundCategories = async () => {
  try {
    const response = await api.get('/categories/lost-found');
    // api.js interceptor already unwraps { success, data: [...] }
    // so response.data is the array directly
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching lost & found categories', error);
    return [];
  }
};

/**
 * Fetch categories of a given type.
 * @param {string} categoryType - one of 'campus_issue', 'class_issue', 'lost_found'
 * @param {boolean} includeInactive - whether to include inactive categories
 * @returns {Promise} resolves to response
 */
export const fetchCategories = async (categoryType, includeInactive = true) => {
  try {
    const response = await api.get('/categories', {
      params: { type: categoryType, includeInactive },
    });
    return response;
  } catch (error) {
    console.error('Error fetching categories', error);
    throw error;
  }
};

/**
 * Create a new category.
 * @param {Object} payload - category data, should include name and optional fields.
 * @returns {Promise}
 */
export const createCategory = async (payload) => {
  try {
    const response = await api.post('/categories', payload);
    return response;
  } catch (error) {
    console.error('Error creating category', error);
    throw error;
  }
};

/**
 * Update an existing category.
 * @param {string|number} id - category identifier
 * @param {Object} payload - updated fields
 * @returns {Promise}
 */
export const updateCategory = async (id, payload) => {
  try {
    const response = await api.put(`/categories/${id}`, payload);
    return response;
  } catch (error) {
    console.error('Error updating category', error);
    throw error;
  }
};

/**
 * Delete a category.
 * @param {string|number} id - category identifier
 * @returns {Promise}
 */
export const deleteCategory = async (id) => {
  try {
    const response = await api.delete(`/categories/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting category', error);
    throw error;
  }
};
