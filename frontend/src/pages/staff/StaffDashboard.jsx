import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  getDashboardStats, 
  getDashboardLostVsFound, 
  getDashboardCategories, 
  getDashboardActivityLine, 
  getUserNotifications,
  getSystemStatus
} from '../../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const StaffDashboard = () => {
  const [stats, setStats] = useState(null);
  const [lostVsFound, setLostVsFound] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activityLine, setActivityLine] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuth();

  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const fetchDashboardData = async () => {
    try {
      const [statsData, lvfData, catData, actLineData, notifData, statusData] = await Promise.all([
        getDashboardStats(),
        getDashboardLostVsFound(),
        getDashboardCategories(),
        getDashboardActivityLine(),
        getUserNotifications(),
        getSystemStatus()
      ]);

      setStats(statsData);
      setLostVsFound(lvfData);
      setCategories(catData);
      setActivityLine(actLineData);
      setNotifications(notifData.slice(0, 8));
      setSystemStatus(statusData);
      setError(null);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        navigate('/login');
      } else {
        setError('Failed to load dashboard analytics. Ensure the server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [navigate]);

  useEffect(() => {
    if (socket) {
      socket.on('dashboard:refresh', fetchDashboardData);
      socket.on('notification:new', (notif) => {
        setNotifications(prev => [notif, ...prev.slice(0, 7)]);
      });
      return () => {
        socket.off('dashboard:refresh');
        socket.off('notification:new');
      };
    }
  }, [socket]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <AdminLayout title="System Overview">
        <div className="flex flex-col items-center justify-center p-20 min-h-[70vh]">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-6 text-gray-500 font-black uppercase tracking-[0.2em] animate-pulse text-center">Initializing Dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
       <AdminLayout title="System Overview">
        <div className="flex items-center justify-center p-4 min-h-[60vh]">
          <div className="bg-white border border-red-100 p-10 rounded-[2rem] shadow-2xl text-center max-w-md animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-3xl font-black mb-3 text-gray-900 tracking-tight">Sync Interrupted</h2>
            <p className="text-gray-500 mb-8 leading-relaxed font-medium text-center">{error}</p>
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-200 uppercase tracking-widest text-sm">Attempt Reconnection</button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Staff Command Center">
      <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* TOP: KPI CARDS */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Lost Items', value: stats.totalLost, icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', color: 'red', sub: 'Active Reports' },
              { label: 'Found Items', value: stats.totalFound, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'emerald', sub: 'In Inventory' },
              { label: 'Total Claims', value: stats.totalClaims, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'indigo', sub: 'Life-to-date' },
              { label: 'Pending Action', value: stats.pendingClaims, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'amber', sub: 'Needs Review' }
            ].map((card, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group overflow-hidden relative">
                <div className={`absolute top-0 right-0 w-24 h-24 bg-${card.color}-500/5 rounded-bl-full translate-x-8 -translate-y-8 group-hover:translate-x-4 group-hover:-translate-y-4 transition-transform duration-500`}></div>
                <div className="flex items-center justify-between relative z-10 mb-4">
                  <div className={`w-12 h-12 bg-${card.color}-50 rounded-2xl flex items-center justify-center text-${card.color}-600 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} /></svg>
                  </div>
                  <span className={`text-[10px] font-black text-${card.color}-600 bg-${card.color}-50 px-2 py-1 rounded-lg uppercase tracking-tighter`}>{card.sub}</span>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-gray-600 transition-colors text-center sm:text-left">{card.label}</p>
                <h3 className="text-4xl font-black text-gray-900 tracking-tight text-center sm:text-left">{card.value}</h3>
              </div>
            ))}
          </div>
        )}

        {/* MIDDLE: MAIN ANALYTICS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Main Trend Chart - System Dynamics */}
          <div className="bg-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col h-[500px] transition-all hover:shadow-[0_30px_60px_rgba(99,102,241,0.1)] group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  System Dynamics
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                </h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1.5">Lost vs Found Performance Analytics</p>
              </div>
              <div className="flex gap-3 justify-center">
                <div className="flex items-center gap-2 bg-rose-50/50 px-4 py-2 rounded-2xl border border-rose-100 shadow-sm transition-all hover:bg-rose-50">
                   <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"></span>
                   <span className="text-[11px] font-black text-rose-600 uppercase tracking-tighter">Lost Items</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50/50 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm transition-all hover:bg-emerald-50">
                   <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                   <span className="text-[11px] font-black text-emerald-600 uppercase tracking-tighter">Found Items</span>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lostVsFound} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }} 
                    dy={15} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }} 
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 min-w-[180px] animate-in fade-in zoom-in duration-200">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">{label} Insights</p>
                            <div className="space-y-3">
                              {payload.map((entry, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-6">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">{entry.name}</span>
                                  </div>
                                  <span className="text-sm font-black text-gray-900">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lost" 
                    name="Lost" 
                    stroke="#f43f5e" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorLost)" 
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#f43f5e' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="found" 
                    name="Found" 
                    stroke="#10b981" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorFound)" 
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Categorical Distribution - Item Distribution */}
          <div className="bg-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col h-[500px] transition-all hover:shadow-[0_30px_60px_rgba(99,102,241,0.1)] group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="mb-10">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Item Distribution</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1.5">Top Volume Categories Analysis</p>
              </div>
            <div className="flex-1 w-full relative">
              {categories.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <p className="font-black uppercase tracking-[0.3em] text-[9px] text-gray-400">Waiting for Data Ingestion</p>
                </div>
              ) : (
                <div className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories}
                        cx="50%"
                        cy="45%"
                        innerRadius={100}
                        outerRadius={140}
                        paddingAngle={10}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={12}
                      >
                        {categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{payload[0].name}</p>
                                <p className="text-lg font-black">{payload[0].value} <span className="text-[10px] text-gray-400 uppercase">Items</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        iconType="circle" 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center" 
                        wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text for Pie */}
                  <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Total Items</p>
                    <h4 className="text-4xl font-black text-gray-900 tabular-nums">{categories.reduce((acc, c) => acc + c.value, 0)}</h4>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* BOTTOM: MONITORING & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Activity Stream */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-[500px] transition-all hover:shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Live Activity Feed</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Real-time System Events</p>
              </div>
              <button onClick={() => navigate('/notifications')} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all text-center">Audit Center</button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-4">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                  <div className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center mb-4">
                    <div className="w-2 h-2 bg-gray-200 rounded-full animate-ping"></div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">Listening for events...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {notifications.map((notif, index) => (
                    <div key={notif._id || index} className="group flex items-center gap-5 p-4 rounded-3xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm 
                        ${notif.type === 'SECURITY_ALERT' ? 'bg-red-500 text-white shadow-red-100' : 
                          notif.type === 'MATCH' ? 'bg-indigo-500 text-white shadow-indigo-100' : 
                          'bg-white text-gray-400'}`}
                      >
                        {notif.type === 'SECURITY_ALERT' ? '🚨' : notif.type === 'MATCH' ? '⚡' : '✨'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className={`text-sm leading-tight line-clamp-1 ${!notif.isRead ? 'font-black text-gray-900' : 'font-bold text-gray-600'}`}>{notif.message}</p>
                          <span className="text-[9px] font-black text-gray-300 uppercase whitespace-nowrap ml-4">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest 
                            ${notif.type === 'SECURITY_ALERT' ? 'bg-red-100 text-red-600' : 
                              notif.type === 'MATCH' ? 'bg-indigo-100 text-indigo-600' : 
                              'bg-gray-200 text-gray-500'}`}
                          >
                            {notif.type}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{notif.module || 'System'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* QUICK ACTIONS & ROLE INSIGHTS */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-200 text-white flex flex-col h-[240px] relative overflow-hidden group">
               <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
               <div className="relative z-10 h-full flex flex-col justify-between">
                 <div>
                   <h3 className="text-xl font-black tracking-tight text-center sm:text-left">Quick Launcher</h3>
                   <p className="text-indigo-100/70 text-xs font-medium mt-1 text-center sm:text-left">Accelerate your workflow</p>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => navigate('/admin/claims')} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 border border-white/10 text-center">
                     <span className="text-lg">📋</span>
                     <span className="text-[9px] font-black uppercase tracking-widest">Verify Claims</span>
                   </button>
                   <button onClick={() => navigate('/admin/users')} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 border border-white/10 text-center">
                     <span className="text-lg">👥</span>
                     <span className="text-[9px] font-black uppercase tracking-widest">Manage Users</span>
                   </button>
                 </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-[228px] group hover:shadow-xl transition-all">
               <div className="mb-6 flex items-center justify-between">
                 <h3 className="text-xl font-black text-gray-900 tracking-tight">Active Duty</h3>
                 <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-[10px]">3</div>
               </div>
               <div className="space-y-4">
                 <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/admin/claims')}>
                   <div className="w-1.5 h-10 bg-amber-400 rounded-full"></div>
                   <div className="flex-1">
                     <p className="text-xs font-black text-gray-800">Pending Review</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">5 New Claims Today</p>
                   </div>
                   <button className="w-8 h-8 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                   </button>
                 </div>
                 <div className="flex items-center gap-4 opacity-50 grayscale">
                    <div className="w-1.5 h-10 bg-indigo-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-800">Report Export</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Monthly Summary Ready</p>
                    </div>
                 </div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
};

export default StaffDashboard;
