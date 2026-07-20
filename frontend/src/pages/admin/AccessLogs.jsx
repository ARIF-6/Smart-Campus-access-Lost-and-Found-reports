import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getAccessLogs, getCampuses } from '../../services/api';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';
import { useAuth } from '../../context/AuthContext';

// ── Student Access History Modal ────────────────────────────────────────────
const StudentHistoryModal = ({ student, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [enableDateFilter, setEnableDateFilter] = useState(false);

  useEffect(() => {
    if (!student) return;
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await getAccessLogs({});
        const allLogs = Array.isArray(data) ? data : (data?.data || []);
        // Filter to just this student's logs by name or studentId
        const filtered = allLogs.filter(log =>
          (log.student?.name && log.student.name === student.name) ||
          (student.studentId && log.student?.studentId === student.studentId)
        );
        setHistory(filtered);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [student]);

  if (!student) return null;

  const displayLogs = enableDateFilter && filterDate
    ? history.filter(log => {
        if (!log.entryTime) return false;
        const entryStr = new Date(log.entryTime).toISOString().split('T')[0];
        return entryStr === filterDate;
      })
    : history;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-gray-600 opacity-60" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 animate-fadeIn overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm uppercase">
                {student.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-white font-black text-base">{student.name}</h3>
                <p className="text-indigo-200 text-xs font-semibold">{student.studentId || 'Access History'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Date Filter Bar */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-150 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm cursor-pointer select-none text-xs font-bold text-gray-500 uppercase">
                <input
                  type="checkbox"
                  checked={enableDateFilter}
                  onChange={(e) => setEnableDateFilter(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Filter by Date
              </label>

              {enableDateFilter && (
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              )}
            </div>
            {enableDateFilter && filterDate && (
              <button
                onClick={() => { setFilterDate(''); setEnableDateFilter(false); }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-4 max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : displayLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm font-semibold">No access history found matching the selected criteria</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Campus</th>
                    <th className="px-4 py-3">Entry Time</th>
                    <th className="px-4 py-3">Exit Time</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayLogs.map((log, i) => (
                    <tr key={log._id || i} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        {log.exitTime ? (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">COMPLETED</span>
                        ) : (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full animate-pulse">ACTIVE</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700">{log.campus || 'Main Gate'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {log.entryTime ? new Date(log.entryTime).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {log.exitTime ? new Date(log.exitTime).toLocaleString() : <span className="text-gray-300 italic">Still on premises</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border ${(log.status === 'IN' || log.status === 'Inside') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                          {(log.status === 'IN' || log.status === 'Inside') ? 'Inside' : 'Outside'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs text-gray-500 font-semibold">{displayLogs.length} record{displayLogs.length !== 1 ? 's' : ''} found</span>
            <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main AccessLogs Component ───────────────────────────────────────────────
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
  const [campuses, setCampuses] = useState([]);
  const [activeCampusTab, setActiveCampusTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { refreshKey } = useAutoRefreshSignal();
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  useEffect(() => {
    const fetchCampusesList = async () => {
      try {
        const response = await getCampuses();
        if (response && response.success && response.data) {
          setCampuses(response.data);
        } else if (Array.isArray(response)) {
          setCampuses(response);
        }
      } catch (err) {
        console.error('Failed to fetch campuses:', err);
      }
    };
    fetchCampusesList();
  }, []);

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

  // Dynamically build the tab names (All + Database Campuses + any extra from logs)
  // For staff, no tabs needed — they only see their campus logs
  const tabNames = isStaff ? [] : ['All', ...new Set([
    ...campuses.map(c => c.name),
    ...logs.map(log => log.campus).filter(Boolean)
  ])];

  // Apply campus tab filter (admin only), then apply search query
  const campusFiltered = isStaff
    ? logs
    : (activeCampusTab === 'All' ? logs : logs.filter(log => log.campus === activeCampusTab));

  const filteredLogs = campusFiltered.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.student?.name || '').toLowerCase().includes(q) ||
      (log.student?.studentId || '').toLowerCase().includes(q) ||
      (log.student?.email || '').toLowerCase().includes(q) ||
      (log.campus || '').toLowerCase().includes(q) ||
      (log.source || '').toLowerCase().includes(q) ||
      (log.status || '').toLowerCase().includes(q)
    );
  });

  // The campus label shown for staff (their single campus)
  const staffCampusName = logs.length > 0 ? logs[0].campus : null;

  return (
    <AdminLayout title="Access Logs">
      {selectedStudent && (
        <StudentHistoryModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
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
                {staffCampusName || 'Your Campus Only'}
              </span>
            )}
            {/* Search bar */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name, ID, campus..."
                className="pl-9 pr-4 py-1.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all w-52 font-medium text-gray-700 placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
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
              {filteredLogs.length} {filteredLogs.length === 1 ? 'Entry' : 'Entries'}
            </span>
          </div>
        </div>

        {/* Campus Tabs — only shown for admin with multiple campuses */}
        {!isStaff && !loading && !error && tabNames.length > 1 && (
          <div className="flex border-b border-gray-100 bg-gray-50/20 overflow-x-auto scrollbar-none px-6 py-3 gap-2">
            {tabNames.map((tab) => {
              const isActive = activeCampusTab === tab;
              const count = tab === 'All'
                ? logs.length
                : logs.filter(log => log.campus === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveCampusTab(tab)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab === 'All' ? 'All Campuses' : tab}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

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
        ) : filteredLogs.length === 0 ? (
          <div className="p-20 text-center text-gray-400">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-base font-semibold text-gray-500 mb-1">
              {searchQuery
                ? `No logs matching "${searchQuery}"`
                : `No access logs found for ${activeCampusTab === 'All' ? 'any campus' : activeCampusTab}`}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCampusTab('All'); }}
              className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="px-6 py-4 font-black">User</th>
                  <th className="px-6 py-4 font-black">Role</th>
                  {!isStaff && <th className="px-6 py-4 font-black">Campus</th>}
                  {isStaff && <th className="px-6 py-4 font-black">Campus</th>}
                  <th className="px-6 py-4 font-black">Source</th>
                  <th className="px-6 py-4 font-black">Event Type</th>
                  <th className="px-6 py-4 font-black">Entry Time</th>
                  <th className="px-6 py-4 font-black">Exit Time</th>
                  <th className="px-6 py-4 font-black text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map((log, index) => (
                  <tr key={log._id || `log-${index}`} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${log.student?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {log.student?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col">
                          {/* Clickable student name */}
                          <button
                            onClick={() => log.student && setSelectedStudent(log.student)}
                            className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline text-left transition-colors"
                          >
                            {log.student?.name || 'Unknown User'}
                          </button>
                          <span className="text-[10px] text-gray-500 font-medium">{log.student?.email || log.personId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${log.student?.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                        {log.student?.role || 'student'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-700">
                      {log.campus || 'Main Gate'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {/* Entry Source */}
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-gray-400 font-bold uppercase w-5 shrink-0">In</span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${(log.source || 'Security Guard') === 'Campus QR Code' ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                            {log.source || 'Security Guard'}
                          </span>
                        </div>
                        {/* Exit Source — only shown when exit has been recorded */}
                        {log.exitTime && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-gray-400 font-bold uppercase w-5 shrink-0">Out</span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${(log.exitSource || 'Security Guard') === 'Campus QR Code' ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                              {log.exitSource || 'Security Guard'}
                            </span>
                          </div>
                        )}
                      </div>
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
                      <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase shadow-sm border ${(log.status === 'IN' || log.status === 'Inside') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                        {(log.status === 'IN' || log.status === 'Inside') ? 'Inside' : 'Outside'}
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
