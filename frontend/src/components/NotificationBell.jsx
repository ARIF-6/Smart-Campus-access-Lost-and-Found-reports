import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/api';
import { socket } from '../services/socket';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await getUserNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // const interval = setInterval(fetchNotifications, 10000); // Poll every 10 seconds tracking deprecated for immediate socket payload
    // return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socket.on("notification", (notif) => {
      setNotifications(prev => [notif, ...prev]);
      toast(notif.message, { 
        icon: '🔔', 
        duration: 5000,
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    });

    return () => socket.off("notification");
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification._id);
        setNotifications(notifications.map(n => 
          n._id === notification._id ? { ...n, isRead: true } : n
        ));
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    }
    setIsOpen(false);

    // Navigate logic based on notification type
    switch (notification.type) {
      case 'MATCH':
        navigate(`/admin/lost-items/${notification.relatedItemId}`);
        break;
      case 'CLAIM_SUBMITTED':
        navigate(`/admin/claims`);
        break;
      case 'CLAIM_APPROVED':
      case 'CLAIM_REJECTED':
        navigate(`/student/my-claims`); // Or wherever students view their claims
        break;
      default:
        break;
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // Difference in seconds

    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center justify-center outline-none"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 transform translate-x-1/4 -translate-y-1/4 flex h-4 w-4 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[9px] font-bold items-center justify-center border-2 border-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 origin-top-right animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                title="Mark all as read"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                You have no notifications right now.
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map((notification) => (
                  <li 
                    key={notification._id} 
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3 ${!notification.isRead ? 'bg-indigo-50/50' : 'bg-white'}`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {notification.type === 'MATCH' && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                      )}
                      {notification.type === 'CLAIM_SUBMITTED' && (
                        <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                      )}
                      {notification.type === 'CLAIM_APPROVED' && (
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                      {notification.type === 'CLAIM_REJECTED' && (
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className={`text-sm ${!notification.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && <span className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0"></span>}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-1">{notification.message}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{getTimeAgo(notification.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100 text-center">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); navigate('/notifications'); }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors w-full text-center"
            >
              View all notifications (coming soon)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
