import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell';

import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

const AdminLayout = ({ children, title = 'Smart Campus' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    socket.disconnect(); // optional but clean
  };

  React.useEffect(() => {
    if (user?._id) {
       socket.connect();
       socket.emit('register', user._id);
    }
  }, [user]);

  // Define nav items mapping based on user request
  const navItems = [];

  if (user?.role === 'student') {
    navItems.push(
      { label: 'Lost Items', path: '/admin/lost-items', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
      { label: 'My Claims', path: '/my-claims', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
      { label: 'My QR Code', path: '/qr-code', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /> }
    );
  }

  if (user?.role === 'security') {
    navItems.push(
      { label: 'Scan QR', path: '/scan-qr', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /> },
      { label: 'Found Items', path: '/admin/found-items', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> }
    );
  }

  if (user?.role === 'admin') {
    navItems.push(
      { label: 'Dashboard', path: '/admin/dashboard', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/> },
      { label: 'User Management', path: '/admin/users', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
      { label: 'Lost Items', path: '/admin/lost-items', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
      { label: 'Found Items', path: '/admin/found-items', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> },
      { label: 'Matches', path: '/admin/matches', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /> },
      { label: 'Claim Requests', path: '/admin/claims', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
      { label: 'Access Logs', path: '/admin/reports', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> }
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Fixed Sidebar */}
      <aside className="w-64 bg-indigo-900 text-white flex flex-col shadow-2xl z-20 hidden md:flex">
        <div className="p-6 border-b border-indigo-800 flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-inner">
            SC
          </div>
          <h1 className="text-xl font-bold tracking-wider">Smart Campus</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-indigo-800 text-white'
                  : 'text-indigo-300 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{item.icon}</svg>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button onClick={handleLogout} className="w-full flex items-center space-x-3 text-indigo-300 hover:text-white hover:bg-red-500 px-4 py-3 rounded-lg transition-all duration-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 z-10 h-20 flex-shrink-0">
          <div className="px-8 h-full flex justify-between items-center">
            {/* Mobile Menu Toggle (Visible only on small screens) */}
            <div className="md:hidden flex items-center">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold mr-3">SC</div>
              <h2 className="text-xl font-bold text-gray-800">Admin Portal</h2>
            </div>
            
            {/* Context title (Desktop) */}
            <h2 className="hidden md:block text-xl font-bold text-gray-800">{title}</h2>

            <div className="flex items-center space-x-4">
              <NotificationBell />
              <span className="text-sm font-medium text-gray-500 hidden sm:block">
                Welcome, {user?.name || 'User'} ({user?.role || 'user'})
              </span>
              <div className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-indigo-100 flex flex-col items-center justify-center text-indigo-700 font-bold shadow-sm uppercase">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              {/* Mobile Logout */}
              <button onClick={handleLogout} className="md:hidden text-gray-400 hover:text-red-500 transition-colors">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard View */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
             {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
