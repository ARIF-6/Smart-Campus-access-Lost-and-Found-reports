import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 focus:outline-none hover:bg-gray-50 p-1.5 rounded-xl transition-all select-none"
                  >
                    {/* User profile image or avatar */}
                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 hidden sm:block">
                      {getDisplayName()}
                    </span>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <>
                      {/* Background click listener overlay to close dropdown */}
                      <div className="fixed inset-0 z-20" onClick={() => setDropdownOpen(false)} />
                      
                      {/* Menu Card */}
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl py-1 z-30 overflow-hidden transform origin-top-right transition-all">
                        <Link
                          to="/admin/profile"
                          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>My Profile</span>
                        </Link>
                        
                        <button
                          onClick={() => {
                            logout();
                            setDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100 text-left"
                        >
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Logout</span>
                        </button>
                      </div>
                    </>
                  )}
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
