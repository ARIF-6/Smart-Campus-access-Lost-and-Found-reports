import React, { useRef, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────
// Icon helper — renders an SVG icon child
// ─────────────────────────────────────────────────────────────────
const Icon = ({ children, className = 'w-[18px] h-[18px]' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    {children}
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// Tooltip shown when sidebar is collapsed
// ─────────────────────────────────────────────────────────────────
const Tooltip = ({ label, children }) => (
  <div className="relative group/tip flex items-center">
    {children}
    <div
      className="pointer-events-none absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-lg
                 bg-gray-900 text-white text-xs font-medium whitespace-nowrap shadow-xl
                 opacity-0 -translate-x-1 group-hover/tip:opacity-100 group-hover/tip:translate-x-0
                 transition-all duration-150"
    >
      {label}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Collapse-toggle icon (matches the screenshot)
// ─────────────────────────────────────────────────────────────────
const CollapseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const AdminSidebar = ({ isOpen = false, onClose = () => {} }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navRef = useRef(null);

  // ── Collapse state (persisted) ───────────────────────────────
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  // ── Duty toggle (student / cleaner) ─────────────────────────
  const [isOnDuty, setIsOnDuty] = useState(() => {
    if (user?.role === 'student') return localStorage.getItem('student_campus_status') !== 'off';
    return localStorage.getItem('cleaner_duty_status') === 'on';
  });

  const toggleDuty = () => {
    const next = !isOnDuty;
    setIsOnDuty(next);
    if (user?.role === 'student') localStorage.setItem('student_campus_status', next ? 'on' : 'off');
    else localStorage.setItem('cleaner_duty_status', next ? 'on' : 'off');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  // Close sidebar on route change (mobile)
  useEffect(() => { onClose(); /* eslint-disable-next-line */ }, [location.pathname]);

  // Preserve sidebar scroll position
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const saved = sessionStorage.getItem('sidebarScrollTop');
    if (saved !== null) nav.scrollTop = parseInt(saved, 10);
    const onScroll = () => sessionStorage.setItem('sidebarScrollTop', nav.scrollTop);
    nav.addEventListener('scroll', onScroll);
    return () => nav.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  const handleLogout = () => logout();

  // ============================================================
  // NAVIGATION CONFIG
  // ============================================================
  const navItems = [];

  const iconPath = {
    dashboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    category: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h16M4 18h16" />,
    university: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    lostItems: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    foundItems: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />,
    claims: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    visitors: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
    incidents: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
    blacklist: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />,
    shifts: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    accessLogs: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    auditLogs: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
    announcements: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />,
    roles: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />,
    reports: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></>,
    issues: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
  };

  const adminNavSections = [
    {
      title: 'Core Operations',
      items: [
        { label: 'Dashboard',           path: '/admin/dashboard',         icon: iconPath.dashboard },
        { label: 'Announcements',       path: '/admin/announcements',     icon: iconPath.announcements },
      ]
    },
    {
      title: 'Campus Management',
      items: [
        { label: 'University',          path: '/admin/university',        icon: iconPath.university },
        { label: 'Categories',          path: '/admin/categories',        icon: iconPath.category },
        { label: 'Role Management',     path: '/admin/roles',             icon: iconPath.roles },

      ]
    },
    {
      title: 'User Directories',
      items: [
        { label: 'Users',               path: '/admin/users',             icon: iconPath.users },
        { label: 'Blacklist',           path: '/admin/blacklist',         icon: iconPath.blacklist },
      ]
    },
    {
      title: 'Security & Logs',
      items: [
        { label: 'Access Logs',         path: '/admin/access-logs',       icon: iconPath.accessLogs },
        { label: 'Audit Logs',          path: '/admin/audit-logs',        icon: iconPath.auditLogs },
        { label: 'Visitors',            path: '/admin/visitors',          icon: iconPath.visitors },
        { label: 'Incidents',           path: '/admin/incidents',         icon: iconPath.incidents },
      ]
    },
    {
      title: 'Lost & Found',
      items: [
        { label: 'Lost Items',          path: '/admin/lost-items',        icon: iconPath.lostItems },
        { label: 'Found Items',         path: '/admin/found-items',       icon: iconPath.foundItems },
        { label: 'Claims',              path: '/admin/claims',            icon: iconPath.claims },
      ]
    },
    {
      title: 'Reports & Issues',
      items: [
        { label: 'System Reports',      path: '/admin/system-reports',    icon: iconPath.reports },
        {
          label: 'Issues',
          path: '/admin/class-issues',
          icon: iconPath.issues,
          children: [
            { label: 'Class Issues',  path: '/admin/class-issues' },
            { label: 'Campus Issues', path: '/admin/campus-environment' },
          ],
        },
      ]
    }
  ];

  // ============================================================
  // STUDENT / CLEANER sidebar  (white card design – unchanged)
  // ============================================================
  if (user?.role === 'student' || user?.role === 'clean') {
    const isStudent = user?.role === 'student';
    const initials = getInitials(user?.fullName || user?.name);

    const sidebarItems = isStudent
      ? [
          { label: 'QR Scanner',  path: '/qr-code',           iconColor: 'bg-blue-50 text-blue-500',   icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /> },
          { label: 'Access Logs', path: '/my-claims',         iconColor: 'bg-teal-50 text-teal-600',   icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
          { label: 'Visitors',    path: '/report-lost-item',  iconColor: 'bg-purple-50 text-purple-500', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /> },
          { label: 'Incidents',   path: '/admin/lost-items',  iconColor: 'bg-red-50 text-red-500',     icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> },
        ]
      : [
          { label: 'QR Scanner',     path: '/report-found-item', iconColor: 'bg-blue-50 text-blue-500',   icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /> },
          { label: 'Access Logs',    path: '/admin/found-items', iconColor: 'bg-teal-50 text-teal-600',   icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
          { label: 'Lost Directory', path: '/admin/lost-items',  iconColor: 'bg-purple-50 text-purple-500', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
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

  // ============================================================
  // ADMIN / STAFF — Light collapsible sidebar
  // ============================================================
  const sidebarWidth = isCollapsed ? 'w-[68px]' : 'w-[232px]';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={onClose} />}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col
          bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          ${sidebarWidth}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:z-auto md:flex
          overflow-hidden flex-shrink-0
        `}
        style={{ minHeight: '100vh' }}
      >
        {/* ── Header row: logo + collapse toggle ──────────────── */}
        <div className={`h-[56px] flex items-center flex-shrink-0 px-3 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {/* Logo */}
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
                SC
              </div>
              <span className="text-[15px] font-bold text-gray-800 tracking-tight truncate">Smart Campus</span>
            </div>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`
              hidden md:flex items-center justify-center rounded-lg
              text-gray-400 hover:text-gray-700 hover:bg-gray-100
              transition-all duration-150 flex-shrink-0
              ${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'}
            `}
          >
            <CollapseIcon />
          </button>

          {/* Mobile close button */}
          {!isCollapsed && (
            <button
              onClick={onClose}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav
          ref={navRef}
          className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5 scrollbar-hide"
        >
          {adminNavSections.map((section) => {
            const hasVisibleItem = section.items.length > 0;
            if (!hasVisibleItem) return null;

            return (
              <div key={section.title} className="space-y-1">
                {/* Section Title */}
                {!isCollapsed && (
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest px-3 mb-1 block">
                    {section.title}
                  </span>
                )}

                {section.items.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.children && item.children.some((c) => location.pathname.startsWith(c.path)));

                  const hasActiveChild =
                    item.children && item.children.some((c) => location.pathname.startsWith(c.path));

                  const showChildren = !isCollapsed && item.children && (isActive || hasActiveChild);

                  const rowClasses = `
                    flex items-center gap-3 rounded-xl cursor-pointer
                    transition-all duration-150 group select-none
                    ${isCollapsed ? 'w-10 h-10 mx-auto justify-center' : 'px-3 py-2.5 w-full'}
                    ${isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `;

                  const renderBadge = () => {
                    if (!item.badge) return null;
                    if (item.badge.type === 'blue') {
                      return (
                        <span className="ml-auto bg-[#4d4ef7] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                          {item.badge.text}
                        </span>
                      );
                    }
                    if (item.badge.type === 'gradient') {
                      return (
                        <span className="ml-auto bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                          {item.badge.text}
                        </span>
                      );
                    }
                    return null;
                  };

                  return (
                    <div key={item.path}>
                      {isCollapsed ? (
                        <Tooltip label={item.label}>
                          <Link to={item.path} className={rowClasses}>
                            <Icon>{item.icon}</Icon>
                          </Link>
                        </Tooltip>
                      ) : (
                        <Link to={item.path} className={rowClasses}>
                          <Icon>{item.icon}</Icon>
                          <span className="text-[13.5px] font-medium truncate leading-none">{item.label}</span>
                          


                          {/* Chevron for children */}
                          {item.children && (
                            <svg
                              className={`ml-auto w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 text-gray-300 ${showChildren ? 'rotate-90' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </Link>
                      )}

                      {/* Sub-items */}
                      {showChildren && (
                        <div className="ml-7 mt-1 space-y-1">
                          {item.children.map((child) => {
                            const childActive = location.pathname === child.path;
                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                className={`
                                  block px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors duration-150
                                  ${childActive
                                    ? 'text-indigo-700 bg-indigo-50 font-semibold'
                                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}
                                `}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default AdminSidebar;
