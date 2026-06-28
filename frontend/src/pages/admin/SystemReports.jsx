import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getSystemReports } from '../../services/api';
import toast from 'react-hot-toast';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const downloadCSV = (rows, filename) => {
  if (!rows.length) return toast.error('No data to export.');
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV downloaded!');
};

// ─── Badge helpers ─────────────────────────────────────────────────────────────

const StatusBadge = ({ value }) => {
  if (!value) return <span className="text-gray-300">—</span>;
  const v = value.toLowerCase();
  const map = {
    lost: 'bg-red-100 text-red-700',
    matched: 'bg-blue-100 text-blue-700',
    returned: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    open: 'bg-orange-100 text-orange-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    stored: 'bg-indigo-100 text-indigo-700',
    exited: 'bg-gray-100 text-gray-600',
    inside: 'bg-emerald-100 text-emerald-700',
    in: 'bg-emerald-100 text-emerald-700',
    out: 'bg-gray-100 text-gray-600',
    claimed: 'bg-purple-100 text-purple-700',
    admin: 'bg-rose-100 text-rose-700',
    staff: 'bg-violet-100 text-violet-700',
    student: 'bg-sky-100 text-sky-700',
    security: 'bg-amber-100 text-amber-700',
    clean: 'bg-teal-100 text-teal-700',
  };
  const cls = map[v] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${cls}`}
    >
      {value.replace(/_/g, ' ')}
    </span>
  );
};

const SeverityBadge = ({ value }) => {
  const map = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' };
  return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${map[value] || 'bg-gray-100 text-gray-600'}`}>{value || '—'}</span>;
};

// ─── Tab configuration ─────────────────────────────────────────────────────────

const TABS = [
  { key: 'lostItems',   label: 'Lost Items',   icon: '🔍', color: 'from-red-500 to-rose-600' },
  { key: 'foundItems',  label: 'Found Items',  icon: '✅', color: 'from-green-500 to-emerald-600' },
  { key: 'claims',      label: 'Claims',       icon: '📋', color: 'from-amber-500 to-orange-600' },
  { key: 'users',       label: 'Users',        icon: '👥', color: 'from-violet-500 to-purple-600' },
  { key: 'incidents',   label: 'Incidents',    icon: '⚠️', color: 'from-orange-500 to-red-600' },
  { key: 'visitors',    label: 'Visitors',     icon: '🚶', color: 'from-sky-500 to-blue-600' },
  { key: 'accessLogs',  label: 'Access Logs',  icon: '🔐', color: 'from-teal-500 to-cyan-600' },
  { key: 'noExitReports', label: 'No-Exits',   icon: '⏰', color: 'from-pink-500 to-rose-600' },
  { key: 'auditLogs',   label: 'Audit Logs',   icon: '📝', color: 'from-indigo-500 to-blue-700' },
];

// ─── Summary stat card ─────────────────────────────────────────────────────────

const StatCard = ({ tab, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer w-full text-left
      ${active
        ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100'
        : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md'}
    `}
  >
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tab.color} flex items-center justify-center text-lg mb-3 shadow-sm`}
      >{tab.icon}</div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{tab.label}</p>
    <p className={`text-2xl font-black mt-1 ${active ? 'text-indigo-700' : 'text-gray-800'}`}>{count.toLocaleString()}</p>
  </button>
);

// ─── Table wrapper ─────────────────────────────────────────────────────────────

const DataTable = ({ headers, rows, emptyMsg }) => (
  <div className="overflow-x-auto">
    {rows.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-xs font-black text-gray-300 uppercase tracking-widest">{emptyMsg || 'No records found'}</p>
      </div>
    ) : (
      <table className="w-full text-left">
        <thead className="bg-gray-50/60 border-b border-gray-100">
          <tr>
            {headers.map(h => (
              <th key={h} className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50/80">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50/70 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────

const SystemReports = () => {
  const { user: currentUser } = useAuth();
  const isStaff = currentUser?.role === 'staff';

  const [data, setData]       = useState(null);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Filters
  const [activeTab,   setActiveTab]   = useState('lostItems');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [search,      setSearch]      = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;

      // The axios interceptor unwraps { success, data: { summary, ... } }
      const res = await getSystemReports(params);
      console.log('[SystemReports] raw res:', res);
      const payload = res || {};
      setData(payload);
      setSummary(payload.summary || {});
    } catch (err) {
      console.error('SystemReports fetch error:', err);
      setError('Failed to load system reports.');
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { refreshKey } = useAutoRefreshSignal();
  // Auto-refresh: re-fetch when the global 30s signal fires
  useEffect(() => { if (refreshKey > 0) fetchData(); }, [refreshKey]);

  // ─── Filter raw arrays per tab ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!data) return [];
    const raw = data[activeTab];
    if (!Array.isArray(raw)) return [];
    const q = search.toLowerCase();
    return raw.filter(row => {
      const matchSearch = !q || Object.values(row).some(v => typeof v === 'string' && v.toLowerCase().includes(q));
      let matchStatus = true;
      if (statusFilter !== 'All') {
        const rowStatus = (row.status || row.severity || row.role || row.action || '').toLowerCase();
        matchStatus = rowStatus === statusFilter.toLowerCase();
      }
      return matchSearch && matchStatus;
    });
  }, [data, activeTab, search, statusFilter]);

  // ─── Per-tab status options ─────────────────────────────────────────────────

  const statusOptions = useMemo(() => {
    const map = {
      lostItems:  ['All', 'lost', 'matched', 'returned'],
      foundItems: ['All', 'pending', 'approved', 'claimed', 'returned', 'stored'],
      claims:     ['All', 'PENDING', 'APPROVED', 'REJECTED'],
      // Staff cannot see admin/superadmin/other-staff users, so hide those filter options
      users:      isStaff
        ? ['All', 'student', 'security', 'clean']
        : ['All', 'admin', 'staff', 'student', 'security', 'clean'],
      incidents:  ['All', 'open', 'in_progress', 'resolved'],
      visitors:   ['All', 'inside', 'exited'],
      accessLogs: ['All', 'IN', 'OUT'],
      noExitReports: ['All'],
      auditLogs:  ['All', 'LOGIN', 'LOGOUT', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'SUBMIT_CLAIM', 'APPROVE_CLAIM', 'REJECT_CLAIM', 'CREATE_LOST_ITEM', 'CREATE_FOUND_ITEM', 'DELETE_ITEM', 'SCAN_QR', 'CREATE_ANNOUNCEMENT', 'DELETE_ANNOUNCEMENT'],
    };
    return map[activeTab] || ['All'];
  }, [activeTab, isStaff]);

  // ─── Per-tab CSV rows ───────────────────────────────────────────────────────

  const csvRows = useMemo(() => {
    if (!filtered.length) return [];
    switch (activeTab) {
      case 'lostItems':
        return filtered.map(r => ({ Title: r.title, Category: r.category, Status: r.status, Location: r.locationLost, Date: fmtDate(r.createdAt) }));
      case 'foundItems':
        return filtered.map(r => ({ Title: r.title, Category: r.category, Status: r.status, Location: r.location, Date: fmtDate(r.createdAt) }));
      case 'claims':
        return filtered.map(r => ({ Item: r.foundItemId?.title || '—', User: r.userId?.fullName || '—', Email: r.userId?.email || '—', Status: r.status, Date: fmtDate(r.createdAt) }));
      case 'users':
        return filtered.map(r => ({ Name: r.fullName || r.name || '—', Role: r.role, Joined: fmtDate(r.createdAt) }));
      case 'incidents':
        return filtered.map(r => ({ Type: r.type, Severity: r.severity, Status: r.status, Location: r.location, ReportedBy: r.reportedBy?.fullName || '—', Date: fmtDate(r.createdAt) }));
      case 'visitors':
        return filtered.map(r => ({ Name: r.name, Purpose: r.purpose, Status: r.status, Entry: fmt(r.entryTime), Exit: fmt(r.exitTime) }));
      case 'accessLogs':
        return filtered.map(r => ({ User: r.userId?.fullName || '—', Role: r.userId?.role || '—', Status: r.status, Entry: fmt(r.entryTime), Exit: fmt(r.exitTime) }));
      case 'noExitReports':
        return filtered.flatMap(r => (r.students || []).map(s => ({ Date: fmtDate(r.date), Name: s.fullName, 'Student ID': s.studentId, 'Entry Time': fmt(s.entryTime) })));
      case 'auditLogs':
        return filtered.map(r => ({ Operator: r.userId?.fullName || r.userId?.name || '—', Action: r.action, Target: r.targetType || '—', Details: r.details || '—', Date: fmtDate(r.createdAt) }));
      default: return [];
    }
  }, [filtered, activeTab]);

  // ─── Per-tab table render ───────────────────────────────────────────────────

  const renderTable = () => {
    switch (activeTab) {
      case 'lostItems':
        return (
          <DataTable
            headers={['#', 'Title', 'Category', 'Status', 'Location', 'Reported']}
            rows={filtered.map((r, i) => [
              <span className="text-xs text-gray-300 font-mono" key="idx">{i + 1}</span>,
              <span className="font-bold text-gray-800" key="title">{r.title}</span>,
              <span className="text-gray-500 capitalize" key="cat">{r.category}</span>,
              <StatusBadge value={r.status} />,
              <span className="text-gray-500" key="loc">{r.locationLost || '—'}</span>,
              <span className="text-gray-400 text-xs" key="date">{fmtDate(r.createdAt)}</span>,
            ])}
          />
        );

      case 'foundItems':
        return (
          <DataTable
            headers={['#', 'Title', 'Category', 'Status', 'Location', 'Submitted']}
            rows={filtered.map((r, i) => [
              <span className="text-xs text-gray-300 font-mono" key="idx">{i + 1}</span>,
              <span className="font-bold text-gray-800" key="title">{r.title}</span>,
              <span className="text-gray-500 capitalize" key="cat">{r.category}</span>,
              <StatusBadge value={r.status} />,
              <span className="text-gray-500" key="loc">{r.location || '—'}</span>,
              <span className="text-gray-400 text-xs" key="date">{fmtDate(r.createdAt)}</span>,
            ])}
          />
        );

      case 'claims':
        return (
          <DataTable
            headers={['#', 'Item Claimed', 'Student', 'Email', 'Status', 'Date']}
            rows={filtered.map((r, i) => [
              <span className="text-xs text-gray-300 font-mono" key="idx">{i + 1}</span>,
              <span className="font-bold text-gray-800" key="item">{r.foundItemId?.title || '—'}</span>,
              <span className="text-gray-700" key="user">{r.userId?.fullName || '—'}</span>,
              <span className="text-gray-400 text-xs" key="email">{r.userId?.email || '—'}</span>,
              <StatusBadge value={r.status} />,
              <span className="text-gray-400 text-xs" key="date">{fmtDate(r.createdAt)}</span>,
            ])}
          />
        );

      case 'users':
        return (
          <DataTable
            headers={['#', 'Name', 'Role', 'Joined']}
            rows={filtered.map((r, i) => [
              <span className="text-xs text-gray-300 font-mono" key="idx">{i + 1}</span>,
              <div className="flex items-center gap-2" key="info">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-black text-indigo-600">
                  {(r.fullName || r.name || '?')[0].toUpperCase()}
                </div>
                <span className="font-bold text-gray-800" key="name">{r.fullName || r.name || '—'}</span>
              </div>,
              <StatusBadge value={r.role} />,
              <span className="text-gray-400 text-xs" key="joined">{fmtDate(r.createdAt)}</span>,
            ])}
          />
        );

      case 'incidents':
        return (
          <DataTable
            headers={['#', 'Type', 'Description', 'Severity', 'Status', 'Location', 'Reported By', 'Date']}
            rows={filtered.map((r, i) => [
              <span className="text-xs text-gray-300 font-mono" key="idx">{i + 1}</span>,
              <span className="font-bold text-gray-800 capitalize" key="type">{r.type?.replace(/_/g, ' ')}</span>,
              <span className="text-gray-500 text-xs max-w-[160px] truncate block" key="desc">{r.description}</span>,
              <SeverityBadge value={r.severity} />,
              <StatusBadge value={r.status} />,
              <span className="text-gray-500" key="loc">{r.location}</span>,
              <span className="text-gray-700" key="reporter">{r.reportedBy?.fullName || '—'}</span>,
              <span className="text-gray-400 text-xs" key="date">{fmtDate(r.createdAt)}</span>,
            ])}
          />
        );

      case 'visitors':
        return (
          <DataTable
            headers={['#', 'Name', 'Purpose', 'Status', 'Entry Time', 'Exit Time']}
            rows={filtered.map((r, i) => [
              <span className="text-xs text-gray-300 font-mono" key="idx">{i + 1}</span>,
              <span className="font-bold text-gray-800" key="name">{r.fullName}</span>,
              <span className="text-gray-500 capitalize" key="purpose">{r.purpose}</span>,
              <StatusBadge value={r.status || (r.exitTime ? 'exited' : 'inside')} />,
              <span className="text-gray-400 text-xs" key="entry">{fmt(r.entryTime)}</span>,
              <span className="text-gray-400 text-xs" key="exit">{r.exitTime ? fmt(r.exitTime) : <span className="text-emerald-500 font-bold text-[10px]">STILL INSIDE</span>}</span>,
            ])}
          />
        );

      case 'accessLogs':
        return (
          <DataTable
            headers={['#', 'User', 'Role', 'Direction', 'Entry', 'Exit']}
            rows={filtered.map((r, i) => [
              <span className="text-xs text-gray-300 font-mono" key="idx">{i + 1}</span>,
              <span className="font-bold text-gray-800" key="user">{r.userId?.fullName || '—'}</span>,
              <StatusBadge value={r.userId?.role} />,
              <StatusBadge value={r.status} />,
              <span className="text-gray-400 text-xs" key="entry">{r.entryTime ? fmt(r.entryTime) : '—'}</span>,
              <span className="text-gray-400 text-xs" key="exit">{r.exitTime ? fmt(r.exitTime) : '—'}</span>,
            ])}
          />
        );

      case 'noExitReports': {
        const rows = [];
        filtered.forEach(report => {
          (report.students || []).forEach(student => {
            rows.push({
              date: report.date,
              fullName: student.fullName,
              studentId: student.studentId,
              entryTime: student.entryTime,
            });
          });
        });
        return (
          <DataTable
            headers={['#', 'Date', 'Student Name', 'Student ID', 'Entry Time']}
            rows={rows.map((r, i) => [
              <span className="text-xs text-gray-300 font-mono" key="idx">{i + 1}</span>,
              <span className="font-bold text-gray-800" key="date">{fmtDate(r.date)}</span>,
              <span className="text-gray-700" key="name">{r.fullName}</span>,
              <span className="text-indigo-600 font-mono text-xs" key="id">{r.studentId}</span>,
              <span className="text-gray-400 text-xs" key="time">{fmt(r.entryTime)}</span>,
            ])}
          />
        );
      }

      case 'auditLogs': {
        const getActionBadge = a => {
          if (!a) return 'bg-gray-100 text-gray-600';
          if (a.includes('APPROVE')) return 'bg-green-100 text-green-700';
          if (a.includes('DELETE') || a.includes('REJECT')) return 'bg-red-100 text-red-700';
          if (a.includes('CREATE') || a.includes('SUBMIT')) return 'bg-blue-100 text-blue-700';
          if (a.includes('UPDATE')) return 'bg-amber-100 text-amber-700';
          if (a.includes('EXPORT')) return 'bg-purple-100 text-purple-700';
          return 'bg-gray-100 text-gray-600';
        };
        return (
          <DataTable
            headers={['#', 'Operator', 'Action', 'Target', 'Details', 'Timestamp']}
            rows={filtered.map((r, i) => [
              <span className="text-xs text-gray-300 font-mono" key="idx">{i + 1}</span>,
              <div key="operator">
                <p className="font-bold text-gray-800 text-sm">{r.userId?.fullName || r.userId?.name || 'Unknown'}</p>
                <p className="text-[10px] text-gray-400 uppercase">{r.userId?.role || ''}</p>
              </div>,
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getActionBadge(r.action)}`} key="action">{r.action}</span>,
              <span className="text-[10px] font-bold text-gray-400 uppercase" key="target">{r.targetType || 'SYSTEM'}</span>,
              <span className="text-xs text-gray-500 max-w-[200px] truncate block" key="details">{r.details || '—'}</span>,
              <span className="text-gray-400 text-xs" key="date">{fmtDate(r.createdAt)}</span>,
            ])}
          />
        );
      }

      default: return null;
    }
  };

  const currentTab = TABS.find(t => t.key === activeTab);

  return (
    <AdminLayout title="System Reports">
      <div className="space-y-8 pb-12">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">System Reports</h2>
            <p className="text-gray-400 text-sm mt-1 font-medium">
              Live view of all data across every module — filter, search, and export.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-all disabled:opacity-50 text-sm"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* ── Summary stat cards ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {TABS.map(t => (
              <div key={t.key} className="h-28 bg-gray-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-500 font-bold">{error}</p>
            <button onClick={fetchData} className="mt-4 px-6 py-2 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600">Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {TABS.map(t => (
              <StatCard
                key={t.key}
                tab={t}
                count={summary[t.key] ?? 0}
                active={activeTab === t.key}
                onClick={() => { setActiveTab(t.key); setSearch(''); setStatusFilter('All'); }}
              />
            ))}
          </div>
        )}

        {/* ── Data Panel ── */}
        {!loading && !error && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Panel header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gray-50/40">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentTab?.color} flex items-center justify-center text-lg shadow-sm`}>{currentTab?.icon}</div>
                <div>
                  <h3 className="font-black text-gray-800">{currentTab?.label}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{filtered.length} records</p>
                </div>
              </div>

              {/* Search + Status filter + Export */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 w-52"
                  />
                </div>

                {/* Status filter */}
                {statusOptions.length > 1 && (
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 font-medium"
                  >
                    {statusOptions.map(s => (
                      <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                )}

                {/* Export CSV */}
                <button
                  onClick={() => downloadCSV(csvRows, `${activeTab}-report`)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-indigo-500 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>

            {/* Date filter row inside the card */}
            <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Range:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="px-3.5 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 font-medium text-gray-600"
                  />
                  <span className="text-gray-400 text-xs font-bold">—</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-3.5 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 font-medium text-gray-600"
                  />
                </div>
              </div>
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); setStatusFilter('All'); }}
                className="px-3 py-1.5 text-indigo-600 font-bold text-[10px] uppercase tracking-wider hover:bg-indigo-50 rounded-lg transition-all"
              >
                Reset Filters
              </button>
            </div>

            {/* Table */}
            {renderTable()}

            {/* Footer count */}
            {filtered.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Showing {filtered.length} of {Array.isArray(data?.[activeTab]) ? data[activeTab].length : 0} records
                </p>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                  Last refreshed: {new Date().toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default SystemReports;
