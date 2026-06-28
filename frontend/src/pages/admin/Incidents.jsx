import React, { useState, useEffect, useCallback } from 'react';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';
import { getSecurityIncidents, updateIncidentStatus } from '../../services/api';
import { toast } from 'react-hot-toast';
import AdminLayout from '../../components/layout/AdminLayout';

const STATUS_STYLES = {
  pending:  { bg: '#FFF3CD', color: '#856404', label: 'Pending' },
  review:   { bg: '#CCE5FF', color: '#004085', label: 'Review' },
  resolved: { bg: '#D4EDDA', color: '#155724', label: 'Resolved' },
};

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const { refreshKey } = useAutoRefreshSignal();

  const fetchIncidentsData = useCallback(async () => {
    try {
      const data = await getSecurityIncidents();
      setIncidents(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to fetch incident reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIncidentsData(); }, [fetchIncidentsData]);
  useEffect(() => { if (refreshKey > 0) fetchIncidentsData(); }, [refreshKey]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateIncidentStatus(id, newStatus);
      setIncidents(prev => prev.map(i => i._id === id ? { ...i, status: newStatus } : i));
      toast.success('Incident status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = incidents.filter(i => {
    const sevOk = filterSeverity === 'all' || i.severity?.toLowerCase() === filterSeverity;
    const stOk  = filterStatus === 'all'   || (i.status || 'pending') === filterStatus;
    let dateOk  = true;
    if (filterDate && i.createdAt) {
      try { dateOk = new Date(i.createdAt).toISOString().split('T')[0] === filterDate; } catch {}
    }
    return sevOk && stOk && dateOk;
  });

  const getPriorityStyle = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':   return { bg: '#FDECEA', color: '#C0392B' };
      case 'medium': return { bg: '#FFF3CD', color: '#856404' };
      case 'low':    return { bg: '#D1ECF1', color: '#0C5460' };
      default:       return { bg: '#E2E3E5', color: '#383D41' };
    }
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const selectStyle = {
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    background: '#fff',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <AdminLayout title="Incident Reports">
      <div style={{ background: '#F7F8FC', minHeight: '100vh', padding: '32px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1A202C', margin: 0 }}>Incident Reports</h1>
              <p style={{ color: '#718096', marginTop: 4, fontSize: 14 }}>Review and manage security incidents on campus</p>
            </div>
            <button
              onClick={fetchIncidentsData}
              style={{ background: '#4C3BCF', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
            >
              ↻ Refresh
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <input
              type="date"
              style={selectStyle}
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
            <select style={selectStyle} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="review">Review</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #E2E8F0', borderTopColor: '#4C3BCF', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                  <thead>
                    <tr style={{ background: '#F7F8FC' }}>
                      {['Incident Info', 'Severity', 'Location', 'Reported By', 'Date & Time', 'Status'].map(h => (
                        <th key={h} style={{ padding: '14px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9AA0B0', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #F0F2F5' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: '#A0AEC0', fontSize: 15 }}>
                          No incident reports found for the selected criteria.
                        </td>
                      </tr>
                    ) : filtered.map(incident => {
                      const sevStyle  = getPriorityStyle(incident.severity);
                      const stKey     = (incident.status || 'pending');
                      const stStyle   = STATUS_STYLES[stKey] || STATUS_STYLES.pending;
                      return (
                        <tr key={incident._id} style={{ borderBottom: '1px solid #F5F6FA', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#FAFBFE'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#2D3748', marginBottom: 2 }}>
                              {incident.type?.replace(/_/g, ' ')}
                            </div>
                            <div style={{ fontSize: 12, color: '#718096', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {incident.description}
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                            <span style={{ background: sevStyle.bg, color: sevStyle.color, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                              {incident.severity}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 13, color: '#4A5568', whiteSpace: 'nowrap' }}>
                            {incident.location}
                          </td>
                          <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#4C3BCF' }}>
                                {incident.reportedBy?.fullName?.charAt(0) || 'S'}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>{incident.reportedBy?.fullName || 'Security'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 13, color: '#718096', whiteSpace: 'nowrap' }}>
                            {formatDate(incident.createdAt)}
                          </td>
                          <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                            <select
                              value={stKey}
                              onChange={e => handleStatusChange(incident._id, e.target.value)}
                              style={{
                                background: stStyle.bg, color: stStyle.color,
                                border: 'none', borderRadius: 8, padding: '5px 10px',
                                fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none',
                                appearance: 'auto',
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="review">Review</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
};

export default Incidents;
