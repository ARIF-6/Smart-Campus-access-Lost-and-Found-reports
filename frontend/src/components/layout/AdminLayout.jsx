import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import NotificationBell from '../common/NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { AutoRefreshProvider } from '../../context/AutoRefreshContext';

/**
 * AdminLayout - Main layout wrapper for admin pages
 * Handles the top header bar and sidebar.
 * Auto-refresh is provided to all child pages via AutoRefreshProvider (30s interval).
 */
const AdminLayout = ({ children, title = 'Smart Campus' }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getInitial = () => {
    const name = user?.fullName || user?.username || user?.name || '';
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const getDisplayName = () => {
    return user?.fullName || user?.username || user?.name || 'User';
  };

  return (
    <AutoRefreshProvider intervalMs={30000}>
      <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
        {/* Sidebar — owns its own width via collapsed state */}
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area — fills remaining space */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
          {/* Top Header */}
          <header className="bg-white border-b border-gray-200 z-10 flex-shrink-0" style={{ height: 56 }}>
            <div className="px-3 md:px-6 h-full flex items-center justify-between gap-3">
              {/* Left: Hamburger (mobile) + Page Title */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Hamburger — only on mobile */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Open navigation menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h2 className="text-base font-bold text-gray-800 truncate">
                  {title}
                </h2>
              </div>

              {/* Right: Bell + Welcome + Avatar */}
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <NotificationBell />
                <span className="text-sm text-gray-500 hidden sm:block">
                  Welcome, {getDisplayName()} ({user?.role || 'user'})
                </span>
                <div
                  className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  title={getDisplayName()}
                >
                  {getInitial()}
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Main Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 p-3 md:p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AutoRefreshProvider>
  );
};

export default AdminLayout;
