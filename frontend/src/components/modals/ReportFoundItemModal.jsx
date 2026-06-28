import React, { useState, useRef, useEffect } from 'react';
import { reportFoundItem } from '../../services/api';
import toast from 'react-hot-toast';

const ReportFoundItemModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electronics',
    locationFound: '',
    dateFound: '',
    storageLocation: '',
    priority: 'low',
    notes: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Handle outside click to close
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.error('Only JPG, JPEG, and PNG files are allowed');
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.locationFound) newErrors.locationFound = 'Location is required';
    if (!formData.dateFound) newErrors.dateFound = 'Date is required';
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
    const data = new FormData();
    Object.keys(formData).forEach((key) => data.append(key, formData[key]));
    if (image) data.append('image', image);
    data.append('type', 'found');

    console.log("FORM DATA:", { ...formData, type: 'found', image });

    try {
      await reportFoundItem(data);
      toast.success('Found item reported successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
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
        <div className="relative bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-8 text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold">Report Found Item</h2>
          <p className="mt-2 text-emerald-100/90 text-sm">
            Provide details about the item you found so the owner can identify and claim it.
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-8 py-8 h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Item Title</label>
              <input 
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Example: Black Backpack"
                className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all focus:ring-2 ${errors.title ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-100'}`}
              />
              {errors.title && <p className="mt-1 text-xs text-red-500 font-medium">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="documents">Documents</option>
                  <option value="others">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Location Found</label>
                <input 
                  type="text"
                  name="locationFound"
                  value={formData.locationFound}
                  onChange={handleChange}
                  placeholder="Where did you find the item? (e.g. Library, Cafeteria)"
                  className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all focus:ring-2 ${errors.locationFound ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-100'}`}
                />
                {errors.locationFound && <p className="mt-1 text-xs text-red-500 font-medium">{errors.locationFound}</p>}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date Found</label>
                <input 
                  type="date"
                  name="dateFound"
                  value={formData.dateFound}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all focus:ring-2 ${errors.dateFound ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-100'}`}
                />
                {errors.dateFound && <p className="mt-1 text-xs text-red-500 font-medium">{errors.dateFound}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Storage Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Storage Location (Room/Shelf)</label>
                <input 
                  type="text"
                  name="storageLocation"
                  value={formData.storageLocation}
                  onChange={handleChange}
                  placeholder="e.g. Storage Room A, Shelf 2"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 bg-white transition-all"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Priority / Importance</label>
                <select 
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority (Valuable)</option>
                  <option value="urgent">Urgent / Time Sensitive</option>
                </select>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Notes / Internal Comments</label>
              <textarea 
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                placeholder="Internal notes about the item condition, owner clues, etc."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 bg-white transition-all resize-none"
              ></textarea>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                placeholder="Describe the item, color, brand, or unique features..."
                className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all focus:ring-2 resize-none ${errors.description ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-100'}`}
              ></textarea>
              {errors.description && <p className="mt-1 text-xs text-red-500 font-medium">{errors.description}</p>}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Image</label>
              <div 
                className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-6 transition-all ${imagePreview ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-400 hover:bg-gray-50'}`}
                onClick={() => fileInputRef.current.click()}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="*/*"
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="relative group">
                    <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover rounded-xl shadow-md" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <p className="text-white font-medium text-sm">Click to change</p>
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(); }}
                      className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <p className="mt-3 text-xs text-gray-500 text-center truncate px-4">{image?.name}</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">Drag & drop an image here or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, JPEG (Max 5MB)</p>
                  </div>
                )}
              </div>
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
            className="min-w-[160px] px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center disabled:opacity-70"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Report Found Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportFoundItemModal;
