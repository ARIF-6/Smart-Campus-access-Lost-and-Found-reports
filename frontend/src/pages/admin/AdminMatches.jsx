import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getAllMatches, recalculateMatches, deleteMatch } from '../../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/imageUtils';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';

const AdminMatches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  const { refreshKey } = useAutoRefreshSignal();

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllMatches();
      setMatches(data);
    } catch (err) {
      setError('Failed to load matches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  // Auto-refresh: re-fetch when the global 30s signal fires
  useEffect(() => { if (refreshKey > 0) fetchMatches(); }, [refreshKey]);

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      toast.loading('Scanning database and recalculating matches...', { id: 'recalc' });
      await recalculateMatches();
      toast.success('Matching system updated successfully!', { id: 'recalc' });
      fetchMatches();
    } catch (err) {
      toast.error('Recalculation failed.', { id: 'recalc' });
    } finally {
      setRecalculating(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this suggested match?')) {
      try {
        await deleteMatch(id);
        setMatches(matches.filter(m => m._id !== id));
        toast.success('Match removed');
      } catch (err) {
        toast.error('Error deleting match');
      }
    }
  };



  return (
    <AdminLayout title="Smart Matching Dashboard">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Possible Item Matches</h2>
          <p className="text-sm text-gray-500">Intelligent associations found by our automated matching algorithm.</p>
        </div>
        
        <button 
          onClick={handleRecalculate}
          disabled={recalculating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl shadow-lg font-bold transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
        >
          <svg className={`w-5 h-5 ${recalculating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Recalculate Matches
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center border border-red-200">{error}</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 text-left">Lost Item Report</th>
                  <th className="px-6 py-4 text-left text-center">Correlation</th>
                  <th className="px-6 py-4 text-left text-right">Possible Found Match</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matches.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic">No automated matches identified yet.</td></tr>
                ) : (
                  matches.map(match => (
                    <tr key={match._id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {getImageUrl(match.lostItemId) ? (
                              <img src={getImageUrl(match.lostItemId)} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900 line-clamp-1">{match.lostItemId?.title}</div>
                            <div className="text-[10px] uppercase font-bold text-red-500">{match.lostItemId?.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white shadow-md ${match.matchScore >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`}>
                          {match.matchScore}%
                        </div>
                        <div className="mt-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Similarity</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3 text-right">
                          <div>
                             <div className="text-sm font-bold text-gray-900 line-clamp-1">{match.foundItemId?.title}</div>
                             <div className="text-[10px] uppercase font-bold text-emerald-500">{match.foundItemId?.category}</div>
                          </div>
                          <div className="h-12 w-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {getImageUrl(match.foundItemId) ? (
                              <img src={getImageUrl(match.foundItemId)} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                           <Link to={`/admin/lost-items/${match.lostItemId?._id}`} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Lost Record">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                           </Link>
                           <button onClick={() => handleDelete(match._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Ignore Match">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
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

export default AdminMatches;
