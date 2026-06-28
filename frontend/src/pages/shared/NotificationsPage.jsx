import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const navigate = useNavigate();
  const socket = useSocket();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getUserNotifications();
      setNotifications(data);
    } catch {
      toast.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleNew = (notif) => {
        setNotifications(prev => {
          if (prev.find(n => n._id === notif.id || n._id === notif._id)) return prev;
          return [notif, ...prev];
        });
      };
      socket.on('notification:new', handleNew);
      return () => socket.off('notification:new', handleNew);
    }
  }, [socket]);

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(notifications.map(n => 
        (n._id === id || n.id === id) ? { ...n, isRead: true } : n
      ));
    } catch {
      toast.error('Could not update status');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this notification?')) {
      try {
        await deleteNotification(id);
        setNotifications(notifications.filter(n => (n._id !== id && n.id !== id)));
        toast.success('Notification removed');
      } catch {
        toast.error('Delete failed');
      }
    }
  };

  const navigateToRelated = (notification) => {
    const notifId = notification._id || notification.id;
    if (!notification.isRead) {
      handleMarkAsRead(notifId);
    }
    
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
        break;
    }
  };

  const filteredNotifications = filter === 'ALL' 
    ? notifications 
    : notifications.filter(n => n.type === filter || n.module?.toUpperCase() === filter);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <AdminLayout title="Notification Center">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">System Monitor</h2>
              <p className="text-gray-500 font-medium">Real-time surveillance of all campus activities and alerts.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="flex-1 md:flex-none bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-6 py-3 rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Mark All Read
              </button>
            )}
            <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1">
               {['ALL', 'MATCH', 'SECURITY_ALERT', 'CLAIM_SUBMITTED'].map((f) => (
                 <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${filter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   {f === 'SECURITY_ALERT' ? 'ALERTS' : f === 'CLAIM_SUBMITTED' ? 'CLAIMS' : f}
                 </button>
               ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-20 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-100 border-t-indigo-600 mb-4"></div>
            <p className="text-gray-500 font-bold animate-pulse">Syncing with system...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {filteredNotifications.length === 0 ? (
              <div className="py-32 text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                </div>
                <p className="text-xl font-black text-gray-900">No events found</p>
                <p className="text-gray-400 font-medium mt-2">Try changing your filters or check back later.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredNotifications.map((notification) => (
                  <div 
                    key={notification._id || notification.id} 
                    className={`p-8 transition-all hover:bg-gray-50/50 flex flex-col sm:flex-row gap-6 ${!notification.isRead ? 'bg-indigo-50/20' : ''}`}
                  >
                    {/* Icon Column */}
                    <div className="flex-shrink-0 flex items-center justify-center">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm relative ${
                        notification.type === 'MATCH' ? 'bg-blue-600 text-white shadow-blue-100' :
                        notification.type === 'CLAIM_SUBMITTED' ? 'bg-amber-500 text-white shadow-amber-100' :
                        notification.type === 'SECURITY_ALERT' ? 'bg-red-600 text-white shadow-red-100' :
                        'bg-indigo-600 text-white shadow-indigo-100'
                      }`}>
                        {notification.type === 'MATCH' && <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                        {notification.type === 'CLAIM_SUBMITTED' && <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        {notification.type === 'SECURITY_ALERT' && <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                        {!['MATCH', 'CLAIM_SUBMITTED', 'SECURITY_ALERT'].includes(notification.type) && <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        {!notification.isRead && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-4 border-white rounded-full"></span>}
                      </div>
                    </div>

                    {/* Content Column */}
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row justify-between items-start mb-3">
                         <div className="cursor-pointer group" onClick={() => navigateToRelated(notification)}>
                           <h3 className={`text-xl font-black ${!notification.isRead ? 'text-gray-900 group-hover:text-indigo-600' : 'text-gray-700 group-hover:text-indigo-500'} transition-colors`}>
                             {notification.title}
                           </h3>
                           <div className="flex items-center gap-2 mt-1">
                             <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                notification.type === 'MATCH' ? 'bg-blue-50 text-blue-600' :
                                notification.type === 'CLAIM_SUBMITTED' ? 'bg-amber-50 text-amber-600' :
                                notification.type === 'SECURITY_ALERT' ? 'bg-red-50 text-red-600' :
                                'bg-indigo-50 text-indigo-600'
                             }`}>
                                {notification.type.replace('_', ' ')}
                             </span>
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                {new Date(notification.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                             </span>
                           </div>
                         </div>
                      </div>
                      <p className="text-gray-600 leading-relaxed text-base max-w-3xl mb-6">
                        {notification.message}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <button 
                          onClick={() => navigateToRelated(notification)}
                          className="px-6 py-2 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                        >
                          Take Action
                        </button>
                        {!notification.isRead && (
                          <button 
                            onClick={() => handleMarkAsRead(notification._id || notification.id)}
                            className="px-6 py-2 bg-indigo-50 text-indigo-600 text-xs font-black rounded-xl hover:bg-indigo-100 transition-all"
                          >
                            Mark Read
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(notification._id || notification.id)}
                          className="px-6 py-2 bg-white border border-red-100 text-red-500 text-xs font-black rounded-xl hover:bg-red-50 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default NotificationsPage;
