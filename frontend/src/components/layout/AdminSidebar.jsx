import React, { useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminSidebar = ({ isOpen = false, onClose = () => {} }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navRef = useRef(null);

  const [isOnDuty, setIsOnDuty] = React.useState(() => {
    if (user?.role === 'student') {
      return localStorage.getItem('student_campus_status') !== 'off';
    }
    return localStorage.getItem('cleaner_duty_status') === 'on';
  });

  const toggleDuty = () => {
    const nextStatus = !isOnDuty;
    setIsOnDuty(nextStatus);
    if (user?.role === 'student') {
      localStorage.setItem('student_campus_status', nextStatus ? 'on' : 'off');
    } else {
      localStorage.setItem('cleaner_duty_status', nextStatus ? 'on' : 'off');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Preserve sidebar scroll position across navigations
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const saved = sessionStorage.getItem('sidebarScrollTop');
    if (saved !== null) nav.scrollTop = parseInt(saved, 10);
    const handleScroll = () => sessionStorage.setItem('sidebarScrollTop', nav.scrollTop);
    nav.addEventListener('scroll', handleScroll);
    return () => nav.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleLogout = () => logout();

  // ============================================
  // SIDEBAR NAVIGATION CONFIGURATION
  // ============================================
  const navItems = [];

  if (user?.role === 'admin') {
    navItems.push(
      { label: 'Dashboard', path: '/admin/dashboard', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
      { label: 'Users Management', path: '/admin/users', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
      { label: 'Category Management', path: '/admin/categories', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
      { label: 'University Management', path: '/admin/university', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
      { label: 'Lost Items', path: '/admin/lost-items', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
      { label: 'Found Items', path: '/admin/found-items', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> },
      { label: 'Claim Requests', path: '/admin/claims', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
      { label: 'Visitors', path: '/admin/visitors', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
      { label: 'Incidents', path: '/admin/incidents', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> },
      { label: 'Blacklist', path: '/admin/blacklist', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /> },
      { label: 'Security Shifts', path: '/admin/security-shifts', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
      { label: 'Access Logs', path: '/admin/access-logs', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
      { label: 'Announcements', path: '/admin/announcements', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /> },
      { label: 'Role Management', path: '/admin/roles', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /> },
      { label: 'System Reports', path: '/admin/system-reports', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></> },
      {
        label: 'Issues',
        path: '/admin/class-issues',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
        children: [
          { label: 'Class Issues', path: '/admin/class-issues' },
          { label: 'Campus Issues', path: '/admin/campus-environment' }
        ]
      },
    );
  }

  if (user?.role === 'staff') {
    navItems.push(
      { label: 'Dashboard', path: '/staff/dashboard', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
      { label: 'Users Management', path: '/admin/users', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
      { label: 'Category Management', path: '/admin/categories', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
      { label: 'University Management', path: '/admin/university', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
      { label: 'Lost Items', path: '/admin/lost-items', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
      { label: 'Found Items', path: '/admin/found-items', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> },
      { label: 'Claim Requests', path: '/admin/claims', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
      { label: 'Visitors', path: '/admin/visitors', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
      { label: 'Incidents', path: '/admin/incidents', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> },
      { label: 'Blacklist', path: '/admin/blacklist', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /> },
      { label: 'Security Shifts', path: '/admin/security-shifts', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
      { label: 'Access Logs', path: '/admin/access-logs', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
      { label: 'Announcements', path: '/admin/announcements', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /> },
      { label: 'System Reports', path: '/admin/system-reports', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></> },
      {
        label: 'Issues',
        path: '/admin/class-issues',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
        children: [
          { label: 'Class Issues', path: '/admin/class-issues' },
          { label: 'Campus Issues', path: '/admin/campus-environment' }
        ]
      },
    );
  }

  // ============================================
  // STUDENT / CLEANER sidebar
  // ============================================
  if (user?.role === 'student' || user?.role === 'clean') {
    const isStudent = user?.role === 'student';
    const initials = getInitials(user?.fullName || user?.name);

    const sidebarItems = isStudent
      ? [
          { label: 'QR Scanner', path: '/qr-code', iconColor: 'bg-blue-50 text-blue-500', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /> },
          { label: 'Access Logs', path: '/my-claims', iconColor: 'bg-teal-50 text-teal-600', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
          { label: 'Visitors', path: '/report-lost-item', iconColor: 'bg-purple-50 text-purple-500', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /> },
          { label: 'Incidents', path: '/admin/lost-items', iconColor: 'bg-red-50 text-red-500', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> }
        ]
      : [
          { label: 'QR Scanner', path: '/report-found-item', iconColor: 'bg-blue-50 text-blue-500', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /> },
          { label: 'Access Logs', path: '/admin/found-items', iconColor: 'bg-teal-50 text-teal-600', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
          { label: 'Lost Directory', path: '/admin/lost-items', iconColor: 'bg-purple-50 text-purple-500', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> }
        ];

    return (
      <>
        {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />}
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white flex flex-col shadow-2xl border-r border-gray-100 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:z-auto md:flex`}>
          <button className="absolute top-4 right-4 md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="p-5">
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col items-center text-center">
              <div className="absolute top-[-15%] right-[-15%] w-32 h-32 rounded-full bg-white/5 pointer-events-none"></div>
              <div className="absolute bottom-[-15%] left-[-15%] w-32 h-32 rounded-full bg-white/5 pointer-events-none"></div>
              <div className="w-20 h-20 rounded-full bg-blue-950 border-[3px] border-amber-400 flex items-center justify-center font-bold text-2xl shadow-[0_0_15px_rgba(251,191,36,0.6)] uppercase tracking-wide">{initials}</div>
              <h3 className="mt-4 font-bold text-xl leading-tight tracking-wide drop-shadow-sm truncate max-w-full">{user?.fullName || user?.name || 'User'}</h3>
              <p className="text-xs text-blue-200/80 mt-1 truncate max-w-full font-medium">{user?.email || 'user@gmail.com'}</p>
              <button onClick={toggleDuty} className="mt-4 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider text-blue-100 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1.5 transition-all duration-200 active:scale-95 shadow-sm">
                <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`}></span>
                {isStudent ? (isOnDuty ? 'ON CAMPUS' : 'OFF CAMPUS') : (isOnDuty ? 'ON DUTY' : 'OFF DUTY')}
              </button>
            </div>
          </div>
          <div className="flex-1 px-5 py-4 flex flex-col justify-between overflow-y-auto">
            <div>
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest px-3 mb-4 block">OPERATIONS</span>
              <nav className="space-y-3">
                {sidebarItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} className={`flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 group ${isActive ? 'bg-gray-50/80 shadow-sm border border-gray-100' : 'hover:bg-gray-50/50'}`}>
                      <div className="flex items-center">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 ${item.iconColor}`}>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{item.icon}</svg>
                        </div>
                        <span className={`ml-4 text-[14px] font-bold tracking-wide transition-colors ${isActive ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}`}>{item.label}</span>
                      </div>
                      <svg className={`w-3.5 h-3.5 transition-all duration-300 ${isActive ? 'text-indigo-600 translate-x-0.5' : 'text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="py-4 mt-6">
              <button onClick={handleLogout} className="flex items-center justify-center space-x-2.5 w-full py-3.5 border-2 border-red-500/20 hover:border-red-500/30 text-red-600 hover:text-red-700 rounded-2xl hover:bg-red-50/60 transition-all duration-200 font-bold text-sm active:scale-98 shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>
      </>
    );
  }

  // ============================================
  // ADMIN / STAFF sidebar — WHITE design
  // ============================================
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 bg-white flex flex-col border-r border-gray-200 flex-shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:z-auto md:flex`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-100 flex-shrink-0 gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm text-white flex-shrink-0">SC</div>
          <h1 className="text-base font-bold text-gray-800 tracking-tight flex-1 min-w-0 truncate">Smart Campus</h1>
          <button className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Navigation */}
        <nav ref={navRef} className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.children && item.children.some((c) => location.pathname.startsWith(c.path)));
            return (
              <div key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                  <svg className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {item.icon}
                  </svg>
                  <span className="truncate">{item.label}</span>
                </Link>
                {item.children && (location.pathname.startsWith(item.path) || item.children.some((c) => location.pathname.startsWith(c.path))) && (
                  <div className="ml-7 mt-0.5 space-y-0.5">
                    {item.children.map((child) => (
                      <Link key={child.path} to={child.path} className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${location.pathname === child.path ? 'text-indigo-700 bg-indigo-50 font-semibold' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="p-3 border-t border-gray-100 flex-shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
