import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportLostItem } from '../services/api';

const ReportLostItem = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electronics',
    locationLost: '',
    dateLost: ''
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
    if (!formData.locationLost.trim()) errors.locationLost = "Location is required";
    if (!formData.dateLost) errors.dateLost = "Date is required";
    
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
      data.append('locationLost', formData.locationLost);
      data.append('dateLost', formData.dateLost);
      if (imageFile) {
        data.append('image', imageFile);
      }

      await reportLostItem(data);
      navigate('/admin/lost-items');
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

  const isInvalid = !formData.title || !formData.description || !formData.locationLost || !formData.dateLost;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-2xl w-full bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-red-600 px-6 py-6 text-center">
          <h2 className="text-3xl font-extrabold text-white">Report Lost Item</h2>
          <p className="mt-2 text-red-100 text-sm">Submit details to help our team match your belongings.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-red-200 border text-sm p-4 rounded-lg text-red-700 flex items-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Title</label>
              <input 
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Black Wallet, iPhone 13..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors ${fieldErrors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {fieldErrors.title && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.title}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea 
                name="description"
                required
                rows="4"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe color, size, or any unique identifiers."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors ${fieldErrors.description ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              ></textarea>
              {fieldErrors.description && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors"
              >
                <option value="electronics">Electronics</option>
                <option value="accessories">Clothing & Accessories</option>
                <option value="documents">IDs & Documents</option>
                <option value="stationary">Books & Stationary</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Lost</label>
              <input 
                type="date"
                name="dateLost"
                required
                value={formData.dateLost}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors ${fieldErrors.dateLost ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {fieldErrors.dateLost && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.dateLost}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Lost</label>
              <input 
                type="text"
                name="locationLost"
                required
                value={formData.locationLost}
                onChange={handleChange}
                placeholder="e.g. Canteen, Main Hall..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors ${fieldErrors.locationLost ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {fieldErrors.locationLost && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.locationLost}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image (Optional)</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG or WEBP (Max. 5MB)</p>
                    </div>
                    <input type="file" name="image" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
              {imagePreview && (
                <div className="mt-4 relative rounded-xl overflow-hidden border border-gray-200">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                  <button type="button" onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute top-2 right-2 bg-black/50 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-4">
            <button 
              type="button" 
              onClick={() => navigate('/admin/lost-items')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 shadow-md"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportLostItem;
