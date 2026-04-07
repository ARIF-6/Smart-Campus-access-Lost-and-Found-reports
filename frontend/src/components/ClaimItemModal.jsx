import React, { useState, useRef, useEffect } from 'react';
import { createClaim } from '../services/api';
import toast from 'react-hot-toast';

const ClaimItemModal = ({ isOpen, onClose, itemId, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    proofDescription: '',
  });
  const [proofImage, setProofImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.error('Only JPG, JPEG, and PNG files are allowed');
        return;
      }
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProofImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.proofDescription && !proofImage) newErrors.proofDescription = 'At least a text description or image proof is required.';
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
    data.append('foundItemId', itemId);
    if (formData.proofDescription) {
       data.append('proof', formData.proofDescription); 
    }
    if (proofImage) data.append('proof', proofImage);

    try {
      await createClaim(data);
      toast.success('Claim request submitted successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit claim');
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
        <div className="relative bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-8 text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold">Claim This Item</h2>
          <p className="mt-2 text-blue-100/90 text-sm">
            Please provide your details and proof of ownership to claim this item.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 h-[65vh] overflow-y-auto custom-scrollbar space-y-6">
          <div className="space-y-4">
            {/* Contact details are automatically bound via the JWT payload of the user. */}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Proof Description</label>
              <textarea 
                name="proofDescription"
                value={formData.proofDescription}
                onChange={handleChange}
                rows="3"
                placeholder="Explain how you can prove this item belongs to you. Example: My student ID is inside the wallet."
                className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all focus:ring-2 resize-none ${errors.proofDescription ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
              ></textarea>
              {errors.proofDescription && <p className="mt-1 text-xs text-red-500 font-medium">{errors.proofDescription}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Proof Image (Optional)</label>
              <div 
                className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-6 transition-all ${imagePreview ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}
                onClick={() => fileInputRef.current.click()}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="relative group">
                    <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover rounded-xl shadow-md" />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(); }}
                      className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <p className="mt-3 text-xs text-gray-500 text-center truncate px-4">{proofImage?.name}</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">Upload proof image (optional)</p>
                    <p className="text-xs text-gray-400 mt-1">ID card, receipt, or photo of the item</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

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
            className="min-w-[150px] px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 flex items-center justify-center disabled:opacity-70"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Submit Claim'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClaimItemModal;
