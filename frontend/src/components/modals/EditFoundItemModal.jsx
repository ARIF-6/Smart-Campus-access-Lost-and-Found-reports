import React, { useState, useRef, useEffect } from 'react';
import { updateFoundItem } from '../../services/api';
import toast from 'react-hot-toast';

const EditFoundItemModal = ({ isOpen, onClose, onSuccess, item }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electronics',
    locationFound: '',
    dateFound: '',
    status: 'pending',
    storageLocation: '',
    priority: 'low',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const modalRef = useRef(null);

  // Pre-populate data when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        category: item.category || 'electronics',
        locationFound: item.locationFound || item.location || '',
        dateFound: item.dateFound ? new Date(item.dateFound).toISOString().split('T')[0] : '',
        status: item.status || 'pending',
        storageLocation: item.storageLocation || '',
        priority: item.priority || 'low',
        notes: item.notes || ''
      });
    }
  }, [item]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.locationFound) newErrors.locationFound = 'Location is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await updateFoundItem(item._id, formData);
      toast.success('Item updated successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white w-full max-w-[600px] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold">Edit Found Item</h2>
          <p className="mt-2 text-blue-100/90 text-sm">
            Update the details for this recovery record.
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Item Title</label>
              <input 
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all focus:ring-2 ${errors.title ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
              />
              {errors.title && <p className="mt-1 text-xs text-red-500 font-medium">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="documents">Documents</option>
                  <option value="others">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date Found</label>
                <input 
                  type="date"
                  name="dateFound"
                  value={formData.dateFound}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
                    formData.status === 'pending' ? 'border-yellow-200 text-yellow-700 bg-yellow-50 focus:ring-yellow-100' :
                    formData.status === 'approved' ? 'border-blue-200 text-blue-700 bg-blue-50 focus:ring-blue-100' :
                    formData.status === 'claimed' ? 'border-green-200 text-green-700 bg-green-50 focus:ring-green-100' :
                    formData.status === 'returned' ? 'border-purple-200 text-purple-700 bg-purple-50 focus:ring-purple-100' :
                    'border-gray-200 text-gray-700 bg-gray-50 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="claimed">Claimed</option>
                  <option value="returned">Returned</option>
                  <option value="stored">Stored in Safe</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                <select 
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority (Valuable)</option>
                  <option value="urgent">Urgent / Time Sensitive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Storage Location (Room/Shelf)</label>
                <input 
                  type="text"
                  name="storageLocation"
                  value={formData.storageLocation}
                  onChange={handleChange}
                  placeholder="e.g. Room 101, Shelf B"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Location Found</label>
                <input 
                  type="text"
                  name="locationFound"
                  value={formData.locationFound}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all focus:ring-2 ${errors.locationFound ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
                />
                {errors.locationFound && <p className="mt-1 text-xs text-red-500 font-medium">{errors.locationFound}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Notes / Internal Comments</label>
              <textarea 
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                placeholder="Internal tracking notes..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white transition-all resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all focus:ring-2 resize-none ${errors.description ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
              ></textarea>
              {errors.description && <p className="mt-1 text-xs text-red-500 font-medium">{errors.description}</p>}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-5 flex items-center justify-end gap-3 border-t border-gray-100">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-gray-600 font-semibold hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="min-w-[140px] px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 flex items-center justify-center disabled:opacity-70"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Update Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditFoundItemModal;
