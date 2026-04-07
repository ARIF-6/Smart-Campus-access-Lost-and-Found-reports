import React, { useState, useEffect } from 'react';
import { getMyClaims } from '../services/api';

const MyClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyClaims = async () => {
      try {
        const data = await getMyClaims();
        setClaims(data);
      } catch (err) {
        setError('Failed to load your personal claims.');
      } finally {
        setLoading(false);
      }
    };
    fetchMyClaims();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wide">Pending</span>;
      case 'APPROVED': return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wide">Approved</span>;
      case 'REJECTED': return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wide">Rejected</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-4">My Claim Requests</h1>
          <p className="mt-2 text-gray-600">Track the status of properties you've reported as belonging to you.</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">{error}</div>}

        {loading ? (
           <div className="flex justify-center p-12">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
           </div>
        ) : (
           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Reference</th>
                     <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">My Description submitted</th>
                     <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                     <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Filing Date</th>
                     <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Admin Response</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {claims.length === 0 ? (
                     <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">You haven't filed any claims yet.</td></tr>
                   ) : (
                     claims.map(claim => (
                       <tr key={claim._id} className="hover:bg-slate-50">
                         <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{claim.foundItemId?.title || 'Unknown Item'}</div>
                            <div className="text-xs text-gray-500">Found: {claim.foundItemId?.locationFound || 'N/A'}</div>
                         </td>
                         <td className="px-6 py-4">
                            <p className="text-sm text-gray-700 line-clamp-2 max-w-xs " title={claim.proof}>{claim.proof}</p>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(claim.status)}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(claim.createdAt).toLocaleDateString()}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {claim.status !== 'PENDING' ? (
                              <span className="text-gray-800 font-medium">Note: {claim.adminNote || 'No response note left.'}</span>
                            ) : (
                              <span className="text-gray-400 italic">Awaiting review...</span>
                            )}
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default MyClaims;
