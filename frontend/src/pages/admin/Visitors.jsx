import React, { useState, useEffect, useCallback } from 'react';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';
import { getVisitors } from '../../services/api';
import { toast } from 'react-hot-toast';
import AdminLayout from '../../components/layout/AdminLayout';

const Visitors = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const { refreshKey } = useAutoRefreshSignal();

  const fetchVisitorsData = useCallback(async () => {
    try {
      const data = await getVisitors();
      setVisitors(data);
    } catch (error) {
      toast.error('Failed to fetch visitors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVisitorsData(); }, [fetchVisitorsData]);

  // Auto-refresh: re-fetch when the global 30s signal fires
  useEffect(() => { if (refreshKey > 0) fetchVisitorsData(); }, [refreshKey]);

  const filteredVisitors = Array.isArray(visitors) ? visitors.filter(visitor => {
    const matchesSearch = visitor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          visitor.hostStudentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          visitor.hostName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          visitor.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
                          
    let matchesDate = true;
    if (filterDate && visitor.entryTime) {
      // Compare the YYYY-MM-DD part
      const visitorDate = new Date(visitor.entryTime).toISOString().split('T')[0];
      matchesDate = visitorDate === filterDate;
    }
    
    return matchesSearch && matchesDate;
  }) : [];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout title="Visitor Management">
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Visitor Registrations</h1>
              <p className="text-gray-600 mt-1">Monitor campus visitors and their activities</p>
            </div>
            <div className="flex gap-3">
              <input
                type="date"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search visitors..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Visitor Info</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Purpose</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Host Info</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entry Time</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredVisitors.map((visitor) => (
                    <tr key={visitor._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {visitor.name?.charAt(0) || 'V'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{visitor.name}</div>
                            <div className="text-sm text-gray-500">ID: {visitor.visitorId || visitor.idNumber || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{visitor.purpose}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{visitor.hostName || 'N/A'}</div>
                        <div className="text-xs text-gray-400 font-mono">
                          {visitor.hostStudentId || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(visitor.entryTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          visitor.status === 'inside' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {visitor.status === 'inside' ? 'Inside' : 'Exited'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredVisitors.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No visitor registrations found matching your search.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Visitors;
