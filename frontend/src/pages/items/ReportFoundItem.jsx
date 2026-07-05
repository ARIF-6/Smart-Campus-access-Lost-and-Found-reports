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
  const [imageMode, setImageMode] = useState('upload'); // 'upload' or 'camera'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const navigate = useNavigate();

  // ── Camera helpers (defined before any useEffect that calls them) ──

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error(err);
      setCameraError('Unable to access camera. Please allow camera permission and try again.');
      // Revert mode back to upload on permission failure
      setImageMode('upload');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width  = videoRef.current.videoWidth  || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImagePreview(dataUrl);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'captured_item.jpg', { type: 'image/jpeg' });
          setImageFile(file);
        }
      }, 'image/jpeg', 0.95);
      stopCamera();
      setImageMode('upload'); // switch back to show preview in upload panel
    }
  };

  // Stop camera stream when component unmounts
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Auto-start / stop camera whenever imageMode changes
  React.useEffect(() => {
    if (imageMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageMode]);

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

                  <div className="md:col-span-2 space-y-4">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Photographic Evidence</label>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      name="image"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />

                    {/* ── Two option cards ── */}
                    {!imagePreview && imageMode !== 'camera' && (
                      <div className="grid grid-cols-2 gap-4">
                        {/* Upload Photo card */}
                        <button
                          type="button"
                          onClick={() => {
                            setImageMode('upload');
                            fileInputRef.current?.click();
                          }}
                          className="flex flex-col items-center justify-center gap-3 bg-[#e8e8e8] hover:bg-[#dcdcdc] rounded-2xl p-8 transition-all group cursor-pointer"
                        >
                          <div className="w-16 h-16 bg-[#ffd2d2] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-9 h-9 text-[#e53935]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 9a3 3 0 100 6 3 3 0 000-6z"/>
                              <path fillRule="evenodd" d="M9.172 3A2 2 0 007.586 3.586L6.172 5H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-2.172l-1.414-1.414A2 2 0 0014.828 3H9.172zM7 12a5 5 0 1110 0A5 5 0 017 12z" clipRule="evenodd"/>
                              <path d="M11 6.5V9H8.5a.5.5 0 000 1H11v2.5a.5.5 0 001 0V10h2.5a.5.5 0 000-1H12V6.5a.5.5 0 00-1 0z"/>
                            </svg>
                          </div>
                          <span className="text-sm font-semibold text-gray-600">upload photo</span>
                        </button>

                        {/* Take Photo card */}
                        <button
                          type="button"
                          onClick={() => setImageMode('camera')}
                          className="flex flex-col items-center justify-center gap-3 bg-[#e8e8e8] hover:bg-[#dcdcdc] rounded-2xl p-8 transition-all group cursor-pointer"
                        >
                          <div className="w-16 h-16 bg-[#ffd2d2] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-9 h-9 text-[#e53935]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 9a3 3 0 100 6 3 3 0 000-6z"/>
                              <path fillRule="evenodd" d="M9.172 3A2 2 0 007.586 3.586L6.172 5H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-2.172l-1.414-1.414A2 2 0 0014.828 3H9.172zM7 12a5 5 0 1110 0A5 5 0 017 12z" clipRule="evenodd"/>
                              <path d="M11 6.5V9H8.5a.5.5 0 000 1H11v2.5a.5.5 0 001 0V10h2.5a.5.5 0 000-1H12V6.5a.5.5 0 00-1 0z"/>
                            </svg>
                          </div>
                          <span className="text-sm font-semibold text-gray-600">take photo</span>
                        </button>
                      </div>
                    )}

                    {/* ── Live camera view ── */}
                    {imageMode === 'camera' && !imagePreview && (
                      <div className="flex flex-col items-center border border-gray-200 rounded-2xl bg-gray-900 p-4 gap-3">
                        {cameraError ? (
                          <div className="text-red-400 font-semibold text-sm p-4 text-center">{cameraError}</div>
                        ) : (
                          <>
                            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
                              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={capturePhoto}
                                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow transition-colors"
                              >
                                📸 Capture
                              </button>
                              <button
                                type="button"
                                onClick={() => { setImageMode('upload'); stopCamera(); }}
                                className="px-4 py-2.5 bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm rounded-xl transition-colors"
                              >
                                ← Back
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* ── Image preview after capture/upload ── */}
                    {imagePreview && (
                      <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-md">
                        <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover" />
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); setImageMode('upload'); stopCamera(); }}
                          className="absolute top-3 right-3 bg-white/90 hover:bg-red-50 text-red-600 rounded-full p-2 shadow-sm transition-all hover:scale-105"
                        >
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
