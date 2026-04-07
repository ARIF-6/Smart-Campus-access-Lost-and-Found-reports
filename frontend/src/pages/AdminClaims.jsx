import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getAllClaims, updateClaimStatus } from '../services/api';
import toast from 'react-hot-toast';

const AdminClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const data = await getAllClaims();
      setClaims(data);
    } catch (err) {
      setError('Failed to load claim requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    let adminNote = '';
    const confirmation = window.prompt(`Are you sure you want to ${status} this claim? Enter an optional note for the student:`);
    
    if (confirmation !== null) {
      adminNote = confirmation;
      try {
        await updateClaimStatus(id, { status, adminNote });
        toast.success(`Claim ${status.toLowerCase()} successfully`);
        fetchClaims();
      } catch (err) {
        toast.error(err.response?.data?.message || `Error updating claim`);
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase">Pending</span>;
      case 'APPROVED':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase">Approved</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase">Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout title="Claim Requests Management">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Claim Requests</h2>
        <p className="text-sm text-gray-500">Review and manage item ownership claims from students.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center border border-red-200">{error}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 uppercase text-xs font-bold text-gray-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">Item Name</th>
                  <th className="px-6 py-4 text-left">Claimer Account</th>
                  <th className="px-6 py-4 text-left">Proof Provided</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Date Submitted</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {claims.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500 italic">No claim requests found.</td></tr>
                ) : (
                  claims.map(claim => (
                    <tr key={claim._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{claim.foundItemId?.title || 'Unknown Item'}</div>
                        <div className="text-xs text-gray-500">Item ID: {claim.foundItemId?._id || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-800">{claim.userId?.name}</div>
                        <div className="text-xs text-gray-600">{claim.userId?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {claim.proof && claim.proof.startsWith('http') ? (
                           <a 
                             href={claim.proof} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-xs font-bold text-indigo-500 hover:text-indigo-700 hover:underline flex items-center gap-1"
                           >
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                             View Uploaded Proof
                           </a>
                        ) : (
                           <p className="text-xs text-gray-700 max-w-xs">{claim.proof}</p>
                        )}
                        {claim.adminNote && (
                          <div className="mt-2 text-xs bg-yellow-50 text-yellow-800 p-2 rounded">
                            <span className="font-bold">Note sent: </span>
                            {claim.adminNote}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(claim.status)}</td>
                      <td className="px-6 py-4 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(claim.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {claim.status === 'PENDING' && (
                            <>
                              <button 
                                onClick={() => handleStatusUpdate(claim._id, 'APPROVED')} 
                                className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors font-bold"
                              >
                                ✔ Approve
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(claim._id, 'REJECTED')} 
                                className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors font-bold"
                              >
                                ❌ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminClaims;
