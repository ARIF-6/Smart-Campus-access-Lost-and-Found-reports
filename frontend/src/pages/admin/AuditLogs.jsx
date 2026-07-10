import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getAuditLogs } from '../../services/api';
import SearchBar from '../../components/common/SearchBar';
import Filter from '../../components/common/Filter';
import Pagination from '../../components/common/Pagination';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination & Filtering State
  const [keyword, setKeyword] = useState('');
  const [action, setAction] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [filterDate, setFilterDate] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const navigate = useNavigate();
  const { refreshKey } = useAutoRefreshSignal();

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 1000
      };
      
      if (action && action !== 'All') {
        params.action = action;
      }
      
      if ((action === 'LOGIN' || action === 'LOGOUT') && selectedRole) {
        params.role = selectedRole;
      }
      
      if (keyword) {
        params.keyword = keyword;
      }
      
      const data = await getAuditLogs(params);
      setLogs(data.results || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs history.');
      setLoading(false);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        navigate('/login');
      }
    }
  }, [page, action, keyword, selectedRole, navigate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh: re-fetch when the global 30s signal fires
  useEffect(() => { if (refreshKey > 0) fetchLogs(); }, [refreshKey]);

  const getActionBadge = (actionValue) => {
    if (actionValue.includes('APPROVE')) return 'bg-green-100 text-green-700 border-green-200';
    if (actionValue.includes('DELETE') || actionValue.includes('REJECT')) return 'bg-red-100 text-red-700 border-red-200';
    if (actionValue.includes('CREATE') || actionValue.includes('SUBMIT')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (actionValue.includes('UPDATE')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const actionOptions = [
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGOUT', label: 'Logout' },
    { value: 'CREATE_USER', label: 'Create User' },
    { value: 'UPDATE_USER', label: 'Update User' },
    { value: 'DELETE_USER', label: 'Delete User' },
    { value: 'SUBMIT_CLAIM', label: 'Submit Claim' },
    { value: 'APPROVE_CLAIM', label: 'Approve Claim' },
    { value: 'REJECT_CLAIM', label: 'Reject Claim' },
    { value: 'CREATE_LOST_ITEM', label: 'Create Lost Item' },
    { value: 'CREATE_FOUND_ITEM', label: 'Create Found Item' },
    { value: 'DELETE_ITEM', label: 'Delete Item' },
    { value: 'SCAN_QR', label: 'Scan QR Code' },
    { value: 'CREATE_ANNOUNCEMENT', label: 'Create Announcement' },
    { value: 'DELETE_ANNOUNCEMENT', label: 'Delete Announcement' }
  ];

  const filteredLogs = logs.filter(log => {
    if (!filterDate) return true;
    if (!log.createdAt) return true;
    try {
      const logDate = new Date(log.createdAt).toISOString().split('T')[0];
      return logDate === filterDate;
    } catch(e) {
      return true;
    }
  });

  return (
    <AdminLayout title="System Audit Logs">
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">System Audit Logs</h2>
            <p className="text-gray-500 text-sm mt-1 font-medium">Monitor all {total} activities performed by every role in the system.</p>
          </div>
        </div>

        {/* Filter Ribbon */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Global Search</label>
            <SearchBar onSearch={setKeyword} placeholder="Search by activity details, ID, or action..." />
          </div>
          
          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Date</label>
              <input
                type="date"
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
              />
            </div>
            <Filter 
              label="Activity Type" 
              value={action} 
              options={actionOptions} 
              onChange={(val) => { setAction(val); setSelectedRole('admin'); setPage(1); }} 
            />
            <button 
              onClick={() => { setKeyword(''); setAction(''); setSelectedRole('admin'); setFilterDate(''); setPage(1); }}
              className="px-4 py-3 text-indigo-600 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 rounded-xl transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Role Tabs for Login/Logout */}
        {(action === 'LOGIN' || action === 'LOGOUT') && (
          <div className="flex border-b border-gray-100 space-x-8 mb-4">
            {[
              { label: 'Administrator', value: 'admin' },
              { label: 'Staff', value: 'staff' },
              { label: 'Security Guard', value: 'security' },
              { label: 'Cleaner', value: 'clean' },
              { label: 'Student', value: 'student' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setSelectedRole(tab.value); setPage(1); }}
                className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all duration-200 ${
                  selectedRole === tab.value
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Audit Data Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-32 min-h-[50vh]">
              <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-50 border-t-indigo-600 mb-6"></div>
              <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Filtering Audit Vault...</p>
            </div>
          ) : error ? (
            <div className="p-32 text-center">
              <p className="text-red-500 font-black text-xl mb-6">{error}</p>
              <button onClick={fetchLogs} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 font-bold uppercase tracking-widest text-xs hover:-translate-y-1 transition-all">Emergency Retry</button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-32 text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Access denied or no logs found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Operator</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Activity</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Context</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time&Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800">{log.userId?.fullName || log.userId?.name || log.operator || 'Unknown'}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{log.userId?.role || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border border-opacity-50 ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60 mb-1">{log.targetType || 'SYSTEM'}</span>
                          <span className="text-xs font-semibold text-gray-700 truncate max-w-[150px]" title={log.targetName || log.targetId}>
                            {log.targetName || log.targetId || ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-medium text-gray-600 line-clamp-1 group-hover:line-clamp-none transition-all duration-500 max-w-sm">{log.details || '-'}</p>
                      </td>
                      <td className="px-6 py-5 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Global Pagination */}
        <Pagination page={page} pages={pages} onPageChange={setPage} />
      </div>
    </AdminLayout>
  );
};

export default AuditLogs;
