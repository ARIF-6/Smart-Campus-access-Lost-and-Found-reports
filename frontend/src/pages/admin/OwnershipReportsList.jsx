import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getOwnershipReports, getOwnershipDisputes } from '../../services/api';
import OwnershipReportDetailsModal from '../../components/modals/OwnershipReportDetailsModal';
import OwnershipDisputeDetailsModal from '../../components/modals/OwnershipDisputeDetailsModal';

const OwnershipReportsList = () => {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'disputes'
  const [reports, setReports] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedDisputeId, setSelectedDisputeId] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getOwnershipReports();
      const reportsList = res?.data || (Array.isArray(res) ? res : []);
      setReports(reportsList);
    } catch (err) {
      setError('Failed to load ownership reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getOwnershipDisputes();
      const disputesList = res?.data || (Array.isArray(res) ? res : []);
      setDisputes(disputesList);
    } catch (err) {
      setError('Failed to load ownership disputes.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(() => {
    if (activeTab === 'reports') {
      fetchReports();
    } else {
      fetchDisputes();
    }
  }, [activeTab, fetchReports, fetchDisputes]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-[10px] font-black uppercase tracking-widest border border-yellow-200">Pending</span>;
      case 'approved':
      case 'resolved_original':
      case 'resolved_new':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200">{status.replace('_', ' ')}</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-200">Rejected</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">{status || 'Unknown'}</span>;
    }
  };

  return (
    <AdminLayout title="Student Ownership Claims">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Student Ownership Reports</h2>
          <p className="text-sm text-gray-400 font-medium">Verify claims and resolve disputes on returned items.</p>
        </div>
        
        {/* Tab Controls */}
        <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1 self-start md:self-auto border border-gray-200/50 shadow-sm">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'reports'
                ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/20'
                : 'text-gray-400 hover:text-gray-650'
            }`}
          >
            Claims ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'disputes'
                ? 'bg-white text-red-700 shadow-sm border border-gray-200/20'
                : 'text-gray-400 hover:text-gray-650'
            }`}
          >
            Disputes ({disputes.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 min-h-[40vh]">
          <div className={`animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mb-4 ${activeTab === 'reports' ? 'border-indigo-600' : 'border-red-600'}`}></div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading reports...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-8 rounded-2xl text-center border border-red-100 font-bold uppercase tracking-tight shadow-sm">{error}</div>
      ) : activeTab === 'reports' ? (
        /* Claims list */
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8 animate-in fade-in duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                <tr>
                  <th className="px-6 py-5">Claimant Student</th>
                  <th className="px-6 py-5">Found Item</th>
                  <th className="px-6 py-5">Reason</th>
                  <th className="px-6 py-5">Submitted</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">
                      No ownership claims submitted yet
                    </td>
                  </tr>
                ) : (
                  reports.map(report => (
                    <tr key={report._id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{report.student?.fullName || 'Unknown Student'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">ID: {report.student?.studentId || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-800">{report.foundItem?.title || 'Unknown Item'}</div>
                        <div className="text-[10px] text-gray-400">Loc: {report.foundItem?.location || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600 max-w-xs truncate" title={report.reason}>
                          {report.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedReportId(report._id)}
                          className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Disputes list */
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8 animate-in fade-in duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                <tr>
                  <th className="px-6 py-5">Found Item</th>
                  <th className="px-6 py-5">Original Receiver</th>
                  <th className="px-6 py-5">New Claimant</th>
                  <th className="px-6 py-5">Disputed At</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {disputes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">
                      No ownership disputes reported yet
                    </td>
                  </tr>
                ) : (
                  disputes.map(dispute => (
                    <tr key={dispute._id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{dispute.foundItem?.title || 'Unknown Item'}</div>
                        <div className="text-[10px] text-gray-400">Loc: {dispute.foundItem?.location || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-800">{dispute.originalReturnedStudent?.fullName || 'Unknown Student'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">ID: {dispute.originalReturnedStudent?.studentId || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-indigo-600">{dispute.newClaimant?.fullName || 'Unknown Claimant'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">ID: {dispute.newClaimant?.studentId || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                        {new Date(dispute.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(dispute.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedDisputeId(dispute._id)}
                          className="px-4 py-2 bg-red-50 text-red-650 hover:bg-red-100 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                          View Dispute
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OwnershipReportDetailsModal
        isOpen={!!selectedReportId}
        onClose={() => setSelectedReportId(null)}
        reportId={selectedReportId}
        onSuccess={refreshData}
      />

      <OwnershipDisputeDetailsModal
        isOpen={!!selectedDisputeId}
        onClose={() => setSelectedDisputeId(null)}
        disputeId={selectedDisputeId}
        onSuccess={refreshData}
      />
    </AdminLayout>
  );
};

export default OwnershipReportsList;
