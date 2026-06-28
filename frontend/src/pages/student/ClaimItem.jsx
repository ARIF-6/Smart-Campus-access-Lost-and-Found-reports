import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createClaim } from '../../services/api';

const ClaimItem = () => {
  const navigate = useNavigate();
  // We can pass the foundItem ID via location state if navigated from details page
  // Alternatively, the student selects from a dropdown. Here we assume they know the ID or we show a small query interface.
  // For simplicity based on requirements, we'll allow an input or use the passed state.
  const location = useLocation();
  const initialItemId = location.state?.itemId || '';

  const [formData, setFormData] = useState({
    foundItemId: initialItemId,
    proof: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.foundItemId) {
      setError('Item ID is missing. Please select an item to claim.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('foundItemId', formData.foundItemId);
      payload.append('proof', formData.proof);

      await createClaim(payload);
      navigate('/my-claims');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit the claim.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-blue-600 px-6 py-6 text-center">
          <h2 className="text-3xl font-extrabold text-white">File a Claim</h2>
          <p className="mt-2 text-blue-100 text-sm">Provide details proving this item belongs to you.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
              <p>{error}</p>
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Item reference ID</label>
              <input 
                type="text"
                name="foundItemId"
                required
                value={formData.foundItemId}
                onChange={handleChange}
                placeholder="e.g. 64df... Provide Item Object ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500">Provide the specific Found Item Database ID you are claiming.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proof of Ownership Description</label>
              <textarea 
                name="proof"
                required
                rows="5"
                value={formData.proof}
                onChange={handleChange}
                placeholder="e.g. This wallet belongs to me. It contains my student ID and bank card."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              ></textarea>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-4">
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors focus:ring-4 focus:ring-blue-200 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Claim Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClaimItem;
