import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getAccessLogs } from '../../services/api';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';
import { useAuth } from '../../context/AuthContext';

const AccessLogs = () => {
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  // Default: show ALL records (no date filter)
  const [filterByDate, setFilterByDate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { refreshKey } = useAutoRefreshSignal();
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Only send date param when the user has explicitly turned on date filtering
      const params = filterByDate ? { date: selectedDate } : {};
      const response = await getAccessLogs(params);
      if (Array.isArray(response)) {
        setLogs(response);
      } else if (response && response.success && response.data) {
        setLogs(response.data);
      } else {
        setLogs([]);
      }
    } catch (err) {
      setError('Failed to fetch access logs.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filterByDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto-refresh: re-fetch when the global 30s signal fires
  useEffect(() => { if (refreshKey > 0) fetchLogs(); }, [refreshKey]);

  return (
    <AdminLayout title="Access Logs">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Campus Access History</h2>
            <p className="text-sm text-gray-500 mt-1">
              {filterByDate
                ? `Showing logs for ${selectedDate}`
                : 'Showing all records from the database'}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            {/* Scope badge */}

            {isStaff && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-black rounded-xl border border-blue-200 uppercase tracking-wider">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                Your Campus Only
              </span>
            )}
            {/* Date filter toggle */}
            <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterByDate}
                onChange={(e) => setFilterByDate(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-gray-500 uppercase">Filter by Date</span>
            </label>

            {/* Date picker — only shown when date filter is on */}
            {filterByDate && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
                <span className="text-xs font-bold text-gray-500 uppercase">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-sm font-semibold text-gray-800 focus:outline-none bg-transparent cursor-pointer"
                />
              </div>
            )}

            <span className="px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100 uppercase tracking-wider whitespace-nowrap">
              {logs.length} {logs.length === 1 ? 'Entry' : 'Entries'}
            </span>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500 bg-red-50 flex flex-col items-center gap-2">
            <span>{error}</span>
            <button
              onClick={fetchLogs}
              className="text-xs underline hover:text-red-700 font-semibold"
            >
              Try again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center text-gray-400">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-base font-semibold text-gray-500 mb-1">
              {filterByDate ? `No access logs found for ${selectedDate}` : 'No access logs found in the database'}
            </p>
            {filterByDate && (
              <button
                onClick={() => setFilterByDate(false)}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                View all records
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="px-6 py-4 font-black">User</th>
                  <th className="px-6 py-4 font-black">Role</th>
                  <th className="px-6 py-4 font-black">Event Type</th>
                  <th className="px-6 py-4 font-black">Entry Time</th>
                  <th className="px-6 py-4 font-black">Exit Time</th>
                  <th className="px-6 py-4 font-black text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log, index) => (
                  <tr key={log._id || `log-${index}`} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${log.student?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {log.student?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{log.student?.name || 'Unknown User'}</span>
                          <span className="text-[10px] text-gray-500 font-medium">{log.student?.email || log.personId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${log.student?.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                        {log.student?.role || 'student'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.exitTime ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                          COMPLETED
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                          ACTIVE (IN)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">
                      {log.entryTime ? new Date(log.entryTime).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {log.exitTime
                        ? new Date(log.exitTime).toLocaleString()
                        : <span className="text-gray-300 italic">Still on premises</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase shadow-sm border ${log.status === 'IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AccessLogs;
