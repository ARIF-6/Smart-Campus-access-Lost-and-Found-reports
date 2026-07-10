import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import toast from 'react-hot-toast';
import { getAllClaims, updateClaimStatus } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';

import { useSocket } from '../../context/SocketContext';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';

const AdminClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const socket = useSocket();
  const { refreshKey } = useAutoRefreshSignal();


  useEffect(() => {
    if (socket) {
      const handleRefresh = () => {
        console.log('Real-time update: Refreshing claims list...');
        fetchClaims(false); // Fetch without showing full page loader
      };

      socket.on('dashboard:refresh', handleRefresh);
      socket.on('notification:new', (notif) => {
        if (notif.type === 'CLAIM_SUBMITTED') {
          handleRefresh();
        }
      });

      return () => {
        socket.off('dashboard:refresh', handleRefresh);
        socket.off('notification:new');
      };
    }
  }, [socket]);

  const fetchClaims = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await getAllClaims();
      // Extract the claims array from the response object
      const claimsArray = Array.isArray(data) ? data : (data?.items || data?.data || []);
      setClaims(claimsArray);
    } catch (err) {
      toast.error('Failed to load claim requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  // Auto-refresh: re-fetch when the global 30s signal fires
  useEffect(() => { if (refreshKey > 0) fetchClaims(false); }, [refreshKey]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      setActionLoading(id);
      await updateClaimStatus(id, { status: newStatus });
      
      // Instant UI Update (Optimistic)
      setClaims(prev => prev.map(c => c._id === id ? { ...c, status: newStatus } : c));
      toast.success(`Claim ${newStatus} successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating status");
    } finally {
      setActionLoading(null);
    }
  };



  const filteredClaims = claims.filter(claim => {
    let statusMatch = true;
    if (statusFilter !== "all") {
      statusMatch = claim.status === statusFilter;
    }
    
    let dateMatch = true;
    if (filterDate && claim.createdAt) {
      try {
        const claimDate = new Date(claim.createdAt).toISOString().split('T')[0];
        dateMatch = claimDate === filterDate;
      } catch (e) {
        // ignore
      }
    }
    
    return statusMatch && dateMatch;
  });

  return (
    <AdminLayout title="Claim Management">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Claim Requests</h2>
          <p className="text-slate-500 font-medium mt-1">Verify and manage ownership claims from students.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <input
            type="date"
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            {['all', 'pending', 'approved', 'rejected'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  statusFilter === filter 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                  : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Synchronizing Claims...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Preview</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Claimed By</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Message / Proof</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No claims matching filter</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => (
                    <tr key={claim._id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                            {getImageUrl(claim.item) ? (
                              <img src={getImageUrl(claim.item)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800">{claim.item?.title || 'Unknown Item'}</p>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                              {claim.item?.category || 'General'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-slate-700">{claim.user?.fullName || claim.user?.name}</p>
                        <p className="text-xs text-slate-400 font-medium mb-2">{claim.user?.email}</p>
                        <div className="space-y-0.5">
                          {claim.user?.studentId && (
                            <p className="text-[10px] text-slate-500">
                              <span className="font-black uppercase tracking-wider text-slate-400">ID: </span>
                              {claim.user.studentId}
                            </p>
                          )}
                          {claim.user?.faculty?.name && (
                            <p className="text-[10px] text-slate-500">
                              <span className="font-black uppercase tracking-wider text-slate-400">Faculty: </span>
                              {claim.user.faculty.name}
                            </p>
                          )}
                          {claim.user?.department?.name && (
                            <p className="text-[10px] text-slate-500">
                              <span className="font-black uppercase tracking-wider text-slate-400">Dept: </span>
                              {claim.user.department.name}
                            </p>
                          )}
                          {claim.user?.class?.name && (
                            <p className="text-[10px] text-slate-500">
                              <span className="font-black uppercase tracking-wider text-slate-400">Class: </span>
                              {claim.user.class.name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="max-w-[240px]">
                          <p className="text-sm text-slate-600 italic leading-relaxed line-clamp-2">"{claim.message}"</p>
                          <p className="text-[10px] text-slate-300 font-mono mt-2">{new Date(claim.createdAt).toLocaleString()}</p>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                          claim.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          claim.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {claim.status === 'pending' ? (
                          <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStatusUpdate(claim._id, 'approved')}
                              disabled={actionLoading === claim._id}
                              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(claim._id, 'rejected')}
                              disabled={actionLoading === claim._id}
                              className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            Processed
                          </span>
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
    </AdminLayout>
  );
};

export default AdminClaims;
