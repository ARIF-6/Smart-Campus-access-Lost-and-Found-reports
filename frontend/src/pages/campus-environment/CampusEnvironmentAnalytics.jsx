import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getCampusEnvironmentStats } from '../../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useSocket } from '../../context/SocketContext';

const CampusEnvironmentAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getCampusEnvironmentStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('dashboard:refresh', fetchStats);
      return () => socket.off('dashboard:refresh');
    }
  }, [socket]);

  if (loading) {
    return (
      <AdminLayout title="Campus Analytics">
        <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-100 border-t-indigo-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Crunching environmental data...</p>
        </div>
      </AdminLayout>
    );
  }

  const pieData = stats ? Object.keys(stats.status).map(key => ({
    name: key.replace('_', ' ').toUpperCase(),
    value: stats.status[key]
  })) : [];

  return (
    <AdminLayout title="Environment Analytics">
      <div className="space-y-8 pb-10">
        
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Complaints</p>
            <h3 className="text-4xl font-black text-slate-900">{stats?.total || 0}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resolved Cases</p>
            <h3 className="text-4xl font-black text-emerald-600">{stats?.status.resolved || 0}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Review</p>
            <h3 className="text-4xl font-black text-amber-600">{stats?.status.pending || 0}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Distribution */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h4 className="text-lg font-black text-slate-800 mb-6">Complaint Status Distribution</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Issue Categories */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h4 className="text-lg font-black text-slate-800 mb-6">Top Reported Issues</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.topIssues || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Hot Complaints Table */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h4 className="text-lg font-black text-slate-800 mb-6">Trending Complaints (Highest Support)</h4>
          <div className="space-y-4">
            {stats?.hotComplaints.map(complaint => (
              <div key={complaint._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center shadow-sm border border-slate-100">
                    <span className="text-xs font-black text-indigo-600">{complaint.supportCount}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase">Votes</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-700">{complaint.issueType?.issueName}</p>
                    <p className="text-xs text-slate-400 font-medium line-clamp-1">{complaint.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-white border border-slate-200`}>
                    {complaint.student?.class?.name || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default CampusEnvironmentAnalytics;
