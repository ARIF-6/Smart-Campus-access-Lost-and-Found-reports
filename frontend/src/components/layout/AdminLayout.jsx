import React from 'react';
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
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
          {/* Top Header — matches screenshot */}
          <header className="bg-white border-b border-gray-200 z-10 flex-shrink-0" style={{ height: 56 }}>
            <div className="px-6 h-full flex items-center justify-between">
              {/* Page Title */}
              <h2 className="text-base font-bold text-gray-800 truncate">
                {title}
              </h2>

              {/* Right: Bell + Welcome text + Avatar */}
              <div className="flex items-center gap-3 flex-shrink-0">
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
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
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
