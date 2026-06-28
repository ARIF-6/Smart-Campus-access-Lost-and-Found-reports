import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getBlacklist, addToBlacklist, removeFromBlacklist, approveBlacklist, rejectBlacklist } from '../../services/api';
import SearchBar from '../../components/common/SearchBar';
import Filter from '../../components/common/Filter';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../../components/common/Skeleton';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';

const Blacklist = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    reason: '',
    description: ''
  });

  const fetchBlacklist = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getBlacklist();
      setList(response.data || response || []);
    } catch (err) {
      toast.error('Failed to load blacklist vault');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlacklist();
  }, [fetchBlacklist]);

  // Auto-refresh: re-fetch when the global 30s signal fires
  const { refreshKey } = useAutoRefreshSignal();
  useEffect(() => { if (refreshKey > 0) fetchBlacklist(); }, [refreshKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addToBlacklist(formData);
      toast.success('Subject added to blacklist');
      setIsModalOpen(false);
      fetchBlacklist();
      setFormData({ name: '', studentId: '', reason: '', description: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding to blacklist');
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveBlacklist(id);
      toast.success('Blacklist request approved');
      fetchBlacklist();
    } catch (err) {
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectBlacklist(id);
      toast.success('Blacklist request rejected');
      fetchBlacklist();
    } catch (err) {
      toast.error('Failed to reject request');
    }
  };

  const handleRemove = async (id) => {
    if (window.confirm('Are you sure you want to remove this person from the blacklist?')) {
      try {
        await removeFromBlacklist(id);
        toast.success('Subject cleared from blacklist');
        fetchBlacklist();
      } catch (err) {
        toast.error('Error removing subject');
      }
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'banned': return 'bg-red-100 text-red-700 border-red-200';
      case 'suspicious': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'watch': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredList = list.filter(item => {
    if (!filterDate) return true;
    if (!item.createdAt) return true;
    try {
      const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
      return itemDate === filterDate;
    } catch(e) {
      return true;
    }
  });

  return (
    <AdminLayout title="Blacklist Management">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Security Blacklist</h2>
          <p className="text-sm text-gray-400 font-medium">Restricted individuals and watch-list management.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <input
            type="date"
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none shadow-sm text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-100 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Blacklist Subject
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} />
        ) : filteredList.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">No Restricted Subjects</h3>
            <p className="text-gray-400 max-w-xs mx-auto">The campus environment is currently secure with no active blacklist entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student ID</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Added By</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredList.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-red-100 text-red-700 border border-red-200">
                          {item.name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-gray-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-gray-500 font-mono">{item.studentId || 'N/A'}</td>
                    <td className="px-6 py-5">
                      <p className="text-xs text-gray-600 font-medium max-w-xs truncate" title={item.reason}>{item.reason}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700">{item.addedBy?.fullName || 'System'}</span>
                        <span className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        item.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                        item.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-yellow-50 text-yellow-750 border-yellow-200'
                      }`}>
                        {item.status || 'approved'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {item.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(item._id)}
                            className="text-emerald-600 hover:text-emerald-700 p-2 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Approve Request"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button
                            onClick={() => handleReject(item._id)}
                            className="text-rose-600 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-lg transition-all"
                            title="Reject Request"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ) : item.status === 'approved' || item.isActive ? (
                        <button
                          onClick={() => handleRemove(item._id)}
                          className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                          title="Remove from Blacklist"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No Action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-scaleIn">
            <h3 className="text-2xl font-black text-gray-800 mb-2">Blacklist Registration</h3>
            <p className="text-sm text-gray-400 mb-6">Enter subject details to restrict campus access.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Student ID (Optional)</label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  />
                </div>
              </div>



              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Primary Reason</label>
                <input
                  type="text"
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="e.g. Unauthorized entry, Theft"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Detailed Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  Confirm Restriction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Blacklist;
