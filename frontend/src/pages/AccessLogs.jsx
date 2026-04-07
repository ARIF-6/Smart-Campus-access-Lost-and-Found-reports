import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getAccessLogs } from '../services/api';

const AccessLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await getAccessLogs();
        if (response.success && response.data) {
          setLogs(response.data);
        } else {
           setLogs([]);
        }
      } catch (err) {
        setError('Failed to fetch access logs.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <AdminLayout title="Access Logs">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Campus Access History</h2>
              <p className="text-sm text-gray-500 mt-1">Real-time log of security QR scans and campus entry/exit events.</p>
            </div>
            <span className="px-4 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 uppercase tracking-wider">
               {logs.length} Total Entries
            </span>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500 bg-red-50">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center text-gray-400">No access logs found in the system.</div>
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
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${log.userId?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                             {log.userId?.name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex flex-col">
                             <span className="font-semibold text-gray-900">{log.userId?.name || 'Unknown User'}</span>
                             <span className="text-[10px] text-gray-500 font-medium">{log.userId?.email}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${log.userId?.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                           {log.userId?.role || 'student'}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                       {log.exitTime ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-orange-600">
                             <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></span>
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
                       {log.exitTime ? new Date(log.exitTime).toLocaleString() : <span className="text-gray-300 italic">Still on premises</span>}
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
