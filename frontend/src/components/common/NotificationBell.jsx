import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const socket = useSocket();

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await getUserNotifications();
        setNotifications(data);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    loadNotifications();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (notif) => {
        // Prevent duplicates
        setNotifications(prev => {
          if (prev.find(n => n._id === notif.id || n._id === notif._id)) return prev;
          return [notif, ...prev];
        });

        // Sound or visual feedback
        const audio = new Audio('/notification-pop.mp3');
        audio.play().catch(() => {}); // Ignore if blocked by browser

        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 border-indigo-600`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-gray-900">{notif.title}</p>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{notif.message}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ), { duration: 5000, position: 'top-right' });
      };

      socket.on("notification:new", handleNewNotification);
      return () => socket.off("notification:new", handleNewNotification);
    }
  }, [socket]);

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
    const notifId = notification._id || notification.id;
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notifId);
        setNotifications(notifications.map(n => 
          (n._id === notifId || n.id === notifId) ? { ...n, isRead: true } : n
        ));
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    }
    setIsOpen(false);

    // Navigate logic based on notification type
    switch (notification.type) {
      case 'MATCH':
        navigate(`/admin/lost-items/${notification.relatedId || notification.relatedItemId}`);
        break;
      case 'CLAIM_SUBMITTED':
        navigate(`/admin/claims`);
        break;
      case 'SECURITY_ALERT':
        navigate(`/admin/incidents`);
        break;
      case 'CLASS_ISSUE_CREATED':
      case 'CLASS_ISSUE_UPDATED':
        navigate(`/admin/class-issues`);
        break;
      default:
        navigate('/notifications');
        break;
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`relative p-2 rounded-xl transition-all duration-300 flex items-center justify-center outline-none ${isOpen ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
      >
        <svg className={`w-6 h-6 ${unreadCount > 0 ? 'animate-swing' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-gradient-to-tr from-red-600 to-red-400 text-white text-[10px] font-black items-center justify-center border-2 border-white shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="font-black text-gray-800 text-lg">Notifications</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">System Alerts & Activity</p>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <p className="text-gray-500 font-bold">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">We'll alert you when something happens.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notification) => (
                  <div 
                    key={notification._id || notification.id} 
                    onClick={() => handleNotificationClick(notification)}
                    className={`group px-5 py-4 hover:bg-gray-50 cursor-pointer transition-all flex gap-4 ${!notification.isRead ? 'bg-indigo-50/30' : 'bg-white'}`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${
                        notification.type === 'MATCH' ? 'bg-blue-100 text-blue-600' :
                        notification.type === 'CLAIM_SUBMITTED' ? 'bg-yellow-100 text-yellow-600' :
                        notification.type === 'SECURITY_ALERT' ? 'bg-red-100 text-red-600' :
                        'bg-indigo-100 text-indigo-600'
                      }`}>
                        {notification.type === 'MATCH' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                        {notification.type === 'CLAIM_SUBMITTED' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        {notification.type === 'SECURITY_ALERT' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                        {!['MATCH', 'CLAIM_SUBMITTED', 'SECURITY_ALERT'].includes(notification.type) && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className={`text-sm truncate pr-2 ${!notification.isRead ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full mt-1 flex-shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{notification.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{getTimeAgo(notification.createdAt)}</span>
                        {notification.module && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">{notification.module}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-gray-50/80 px-5 py-3.5 border-t border-gray-100">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); navigate('/notifications'); }}
              className="group w-full py-2 bg-white hover:bg-indigo-600 border border-gray-200 hover:border-indigo-600 rounded-xl text-xs font-black text-gray-700 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
            >
              View Notification Center
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
