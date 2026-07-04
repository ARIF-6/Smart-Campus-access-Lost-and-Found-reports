import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getShifts } from '../../services/api';
import SearchBar from '../../components/common/SearchBar';
import Filter from '../../components/common/Filter';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../../components/common/Skeleton';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';

const SecurityShifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    totalIncidents: 0
  });
  const { refreshKey } = useAutoRefreshSignal();

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getShifts();
      const data = response.data || response || [];
      setShifts(data);
      
      // Calculate mini-stats
      setStats({
        active: data.filter(s => s.status === 'active').length,
        completed: data.filter(s => s.status === 'completed').length,
        totalIncidents: data.reduce((acc, curr) => acc + (curr.incidentsCount || 0), 0)
      });
    } catch (err) {
      toast.error('Failed to load shift records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Auto-refresh: re-fetch when the global 30s signal fires
  useEffect(() => { if (refreshKey > 0) fetchShifts(); }, [refreshKey]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const calculateDuration = (start, end) => {
    if (!end) return 'Ongoing';
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  const filteredShifts = shifts.filter(shift => {
    if (!filterDate) return true;
    if (!shift.shiftStart) return true;
    try {
      const shiftDate = new Date(shift.shiftStart).toISOString().split('T')[0];
      return shiftDate === filterDate;
    } catch(e) {
      return true;
    }
  });

  return (
    <AdminLayout title="Shift Monitoring">
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">Shift Monitoring</h2>
            <p className="text-gray-500 text-sm mt-1 font-medium">Real-time oversight of security personnel and patrol activities.</p>
          </div>
          <div className="flex gap-4 items-center">
            <input
              type="date"
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-sm"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Active Guards', value: stats.active, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Completed Shifts', value: stats.completed, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Incidents Logged', value: stats.totalIncidents, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'text-red-600', bg: 'bg-red-50' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
              <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color}`}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} /></svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-gray-800">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Shift Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <TableSkeleton rows={10} />
          ) : filteredShifts.length === 0 ? (
            <div className="py-32 text-center">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No shift records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnel</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Time</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">End Time</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredShifts.map((shift) => (
                    <tr key={shift._id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
                            {(shift.guardId?.fullName || shift.guardId?.name || 'G').charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-800">{shift.guardId?.fullName || shift.guardId?.name || 'Unknown Guard'}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">{shift.guardId?.role || 'Security'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs font-medium text-gray-600">
                        {new Date(shift.shiftStart).toLocaleString()}
                      </td>
                      <td className="px-6 py-5 text-xs font-medium text-gray-600">
                        {shift.shiftEnd ? new Date(shift.shiftEnd).toLocaleString() : <span className="text-green-500 font-bold">In Progress</span>}
                      </td>
                      <td className="px-6 py-5 text-xs font-bold text-gray-500">
                        {calculateDuration(shift.shiftStart, shift.shiftEnd)}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border border-opacity-50 ${getStatusBadge(shift.status)}`}>
                          {shift.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1" title="Scans Performance">
                            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                            <span className="text-xs font-bold text-gray-700">{shift.scansCount || 0}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Incidents Reported">
                            <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <span className="text-xs font-bold text-gray-700">{shift.incidentsCount || 0}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default SecurityShifts;
