import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportFoundItem } from '../../services/api';
import AdminLayout from '../../components/layout/AdminLayout';

const ReportFoundItem = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electronics',
    locationFound: '',
    dateFound: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = "Title is required";
    if (!formData.description.trim()) errors.description = "Description is required";
    if (!formData.locationFound.trim()) errors.locationFound = "Location is required";
    if (!formData.dateFound) errors.dateFound = "Date is required";
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validateForm()) return;

    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('locationFound', formData.locationFound);
      data.append('dateFound', formData.dateFound);
      if (imageFile) {
        data.append('image', imageFile);
      }

      await reportFoundItem(data);
      navigate('/admin/found-items');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.errors) {
        const mappedErrors = {};
        err.response.data.errors.forEach(e => {
          mappedErrors[e.path || e.param] = e.msg;
        });
        setFieldErrors(mappedErrors);
        setError("Please correct the highlighted errors.");
      } else {
        setError(err.response?.data?.message || 'Failed to submit the report.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isInvalid = !formData.title || !formData.description || !formData.locationFound || !formData.dateFound;

  return (
    <AdminLayout title="Report Found Item">
      <div className="max-w-3xl mx-auto py-8">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 relative">
          
          <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-500 absolute top-0 left-0 w-full"></div>
          
          <div className="px-8 py-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">Report Found Item</h2>
                <p className="text-gray-500 font-medium mt-1">Log an item discovered on campus so we can notify its owner.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl flex items-center gap-3">
                  <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">What is the item?</label>
                  <input 
                    type="text" 
                    name="title" 
                    required 
                    value={formData.title} 
                    onChange={handleChange} 
                    placeholder="e.g. Blue Hydroflask, Dell Laptop" 
                    className={`w-full px-5 py-4 bg-gray-50/50 border rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-800 font-medium placeholder-gray-400 ${fieldErrors.title ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
                  />
                  {fieldErrors.title && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.title}</p>}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Detailed Description</label>
                  <textarea 
                    name="description" 
                    required 
                    rows="3" 
                    value={formData.description} 
                    onChange={handleChange} 
                    placeholder="Provide specific unchangeable details (stickers, serials, damage, color)" 
                    className={`w-full px-5 py-4 bg-gray-50/50 border rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-800 font-medium placeholder-gray-400 resize-none ${fieldErrors.description ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  ></textarea>
                  {fieldErrors.description && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.description}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Category</label>
                  <div className="relative">
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-800 font-medium appearance-none cursor-pointer">
                      <option value="electronics">Electronics & Tech</option>
                      <option value="clothing">Bags & Clothing</option>
                      <option value="documents">IDs & Documents</option>
                      <option value="others">Other Uncategorized</option>
                    </select>
                    <svg className="w-5 h-5 text-gray-400 absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Date Discovered</label>
                  <input 
                    type="date" 
                    name="dateFound" 
                    required 
                    value={formData.dateFound} 
                    onChange={handleChange} 
                    className={`w-full px-5 py-4 bg-gray-50/50 border rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-800 font-medium cursor-text ${fieldErrors.dateFound ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
                  />
                  {fieldErrors.dateFound && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.dateFound}</p>}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Exact Location Found</label>
                  <input 
                    type="text" 
                    name="locationFound" 
                    required 
                    value={formData.locationFound} 
                    onChange={handleChange} 
                    placeholder="e.g. Bench outside Library, Room 402" 
                    className={`w-full px-5 py-4 bg-gray-50/50 border rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-800 font-medium placeholder-gray-400 ${fieldErrors.locationFound ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
                  />
                  {fieldErrors.locationFound && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.locationFound}</p>}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Photographic Evidence</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-3 text-emerald-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold text-emerald-600">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-gray-400 font-medium">PNG, JPG or WEBP (Max. 5MB)</p>
                        </div>
                        <input type="file" name="image" accept="*/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  </div>
                  {imagePreview && (
                    <div className="mt-4 relative rounded-xl overflow-hidden border border-gray-200 shadow-md">
                      <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover" />
                      <button type="button" onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute top-3 right-3 bg-white/90 hover:bg-red-50 text-red-600 rounded-full p-2 shadow-sm transition-all hover:scale-105">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-4">
                <button 
                  type="button" 
                  onClick={() => navigate('/admin/found-items')}
                  className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Mark as Found'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ReportFoundItem;
