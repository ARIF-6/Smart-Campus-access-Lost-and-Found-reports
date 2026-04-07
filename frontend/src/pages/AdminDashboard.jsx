import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { 
  getDashboardStats, 
  getDashboardLostVsFound, 
  getDashboardCategories, 
  getDashboardActivityLine, 
  getDashboardRecentActivity 
} from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [lostVsFound, setLostVsFound] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activityLine, setActivityLine] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const [statsData, lvfData, catData, actLineData, recentActData] = await Promise.all([
          getDashboardStats(),
          getDashboardLostVsFound(),
          getDashboardCategories(),
          getDashboardActivityLine(),
          getDashboardRecentActivity()
        ]);

        setStats(statsData);
        setLostVsFound(lvfData);
        setCategories(catData);
        setActivityLine(actLineData);
        setRecentActivity(recentActData);
      } catch (err) {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Failed to load dashboard analytics. Ensure the server is running.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  if (loading) {
    return (
      <AdminLayout title="System Overview">
        <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-100 border-t-indigo-600 mb-4"></div>
          <p className="text-gray-500 font-medium animate-pulse">Loading analytics data...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
       <AdminLayout title="System Overview">
        <div className="flex items-center justify-center p-4 min-h-[60vh]">
          <div className="bg-red-50 text-red-600 p-8 rounded-2xl shadow-xl border border-red-100 text-center max-w-md">
            <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <h2 className="text-2xl font-bold mb-2 text-red-800">Connection Error</h2>
            <p className="text-red-600/80 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md shadow-red-200 transition-all active:scale-95">Reload Dashboard</button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics Dashboard">
      <div className="space-y-8 pb-8">
        
        {/* TOP: KPI CARDS */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-red-400 transition-colors">Total Lost Items</p>
                <h3 className="text-4xl font-black text-gray-800 tracking-tight">{stats.totalLost}</h3>
              </div>
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 group-hover:scale-110 group-hover:bg-red-100 transition-all">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-green-400 transition-colors">Total Found Items</p>
                <h3 className="text-4xl font-black text-gray-800 tracking-tight">{stats.totalFound}</h3>
              </div>
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 group-hover:scale-110 group-hover:bg-green-100 transition-all">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">Total Claims</p>
                <h3 className="text-4xl font-black text-gray-800 tracking-tight">{stats.totalClaims}</h3>
              </div>
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:bg-indigo-100 transition-all">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-yellow-500 transition-colors">Pending Claims</p>
                <h3 className="text-4xl font-black text-gray-800 tracking-tight">{stats.pendingClaims}</h3>
              </div>
              <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600 group-hover:scale-110 group-hover:bg-yellow-100 transition-all">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>
        )}

        {/* MIDDLE: CHARTS (2 COLUMNS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-96 transition-all hover:shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Lost vs Found (6 Months)
            </h3>
            <div className="flex-1 min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lostVsFound} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    cursor={{ fill: '#F3F4F6' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="lost" name="Lost Items" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="found" name="Found Items" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-96 transition-all hover:shadow-md">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              Distribution by Category
            </h3>
            <div className="flex-1 min-h-[300px] w-full relative">
              {categories.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">No category data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} items`, 'Count']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', color: '#4B5563' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

        {/* BOTTOM: LINE CHART & RECENT ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Line Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-96 transition-all hover:shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
              Recent Weekly Activity
            </h3>
            <div className="flex-1 min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityLine} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Line type="monotone" dataKey="count" name="Total Reports" stroke="#6366F1" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity List */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-96 transition-all hover:shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                System Logs
              </div>
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {recentActivity.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No recent activity detected.</div>
              ) : (
                <ul className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                  {recentActivity.map((activity, index) => (
                    <li key={index} className="relative flex items-center gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 z-10 
                        ${activity.type === 'lost' ? 'bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.2)]' : 
                          activity.type === 'found' ? 'bg-green-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]' : 
                          'bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]'}`}
                      ></div>
                      <div className="bg-gray-50 p-3 rounded-xl flex-1 border border-gray-100 hover:border-gray-300 transition-colors">
                        <p className="text-sm text-gray-800 font-medium leading-snug">{activity.message}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{activity.date}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
