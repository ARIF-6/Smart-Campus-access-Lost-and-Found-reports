import React, { useState, useRef, useEffect } from 'react';
import { reportFoundItem } from '../../services/api';
import { fetchLostFoundCategories } from '../../services/categoryService';
import toast from 'react-hot-toast';

const ReportFoundItemModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    locationFound: '',
    dateFound: '',
    storageLocation: '',
    priority: 'low',
    notes: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageMode, setImageMode] = useState('upload'); // 'upload' or 'camera'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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
      setImageMode('upload'); // revert on failure
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
          setImage(file);
        }
      }, 'image/jpeg', 0.95);
      stopCamera();
      setImageMode('upload'); // switch back to show preview
    }
  };

  // Stop camera when modal is closed or unmounted
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Stop camera if modal is closed from parents
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  // Auto-start / stop camera whenever imageMode changes
  useEffect(() => {
    if (imageMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageMode]);

  // Load dynamic categories when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategoriesLoading(true);
      fetchLostFoundCategories().then(cats => {
        setCategories(cats);
        if (cats.length > 0) {
          setFormData(prev => ({ ...prev, category: cats[0].name }));
        }
        setCategoriesLoading(false);
      });
    }
  }, [isOpen]);

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
                {categoriesLoading ? (
                  <div className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400">Loading categories...</div>
                ) : categories.length === 0 ? (
                  <div className="w-full px-4 py-2.5 border border-amber-200 bg-amber-50 rounded-xl text-sm text-amber-700 font-medium">
                    No categories available. Please create a category first.
                  </div>
                ) : (
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 bg-white transition-all appearance-none cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat._id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                )}
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

            {/* Image Selection & Upload/Capture */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-sm font-semibold text-gray-700">Image Evidence</label>
                
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />

                {/* ── Two option cards (shown when no photo selected and not in camera mode) ── */}
                {!imagePreview && imageMode !== 'camera' && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
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
                  <div className="flex flex-col items-center border border-gray-200 rounded-2xl bg-gray-900 p-4 gap-3 mt-2">
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
                            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow transition-colors"
                          >
                            📸 Capture
                          </button>
                          <button
                            type="button"
                            onClick={() => { setImageMode('upload'); stopCamera(); }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm rounded-xl transition-colors"
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
                  <div className="mt-2 relative rounded-2xl overflow-hidden border border-gray-200 shadow-md">
                    <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImage(null); setImagePreview(null); setImageMode('upload'); stopCamera(); }}
                      className="absolute top-3 right-3 bg-white/90 hover:bg-red-50 text-red-600 rounded-full p-2 shadow-sm transition-all hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
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
