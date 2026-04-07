import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../services/api';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getUserNotifications();
      setNotifications(data);
    } catch (err) {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, isRead: true } : n
      ));
    } catch (err) {
      toast.error('Could not mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Could not complete action');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this notification permanently?')) {
      try {
        await deleteNotification(id);
        setNotifications(notifications.filter(n => n._id !== id));
        toast.success('Notification removed');
      } catch (err) {
        toast.error('Could not delete');
      }
    }
  };

  const navigateToRelated = (notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
    
    switch (notification.type) {
      case 'MATCH':
        navigate(`/admin/lost-items/${notification.relatedItemId}`);
        break;
      case 'CLAIM_SUBMITTED':
        navigate(`/admin/claims`);
        break;
      case 'CLAIM_APPROVED':
      case 'CLAIM_REJECTED':
        navigate(`/student/my-claims`);
        break;
      default:
        break;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <AdminLayout title="Notifications Center">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Your Activity & Alerts</h2>
          <p className="text-sm text-gray-500">Stay up to date with the latest matches and claim updates.</p>
        </div>
        
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Mark All as Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center border border-red-200">{error}</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {notifications.length === 0 ? (
            <div className="px-6 py-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <p className="text-gray-500 font-medium">You're all caught up!</p>
              <p className="text-sm text-gray-400">No new notifications at this time.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <li 
                  key={notification._id} 
                  className={`p-6 transition-colors hover:bg-gray-50 flex gap-4 ${!notification.isRead ? 'bg-indigo-50/20' : ''}`}
                >
                  <div className="flex-shrink-0">
                    {notification.type === 'MATCH' && (
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                    )}
                    {notification.type === 'CLAIM_SUBMITTED' && (
                      <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center shadow-inner">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                    )}
                    {notification.type === 'CLAIM_APPROVED' && (
                      <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-inner">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                    {notification.type === 'CLAIM_REJECTED' && (
                      <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-inner">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                       <h3 className={`text-lg cursor-pointer hover:underline ${!notification.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`} onClick={() => navigateToRelated(notification)}>
                         {notification.title}
                       </h3>
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <p className="text-gray-600 leading-relaxed mb-4">{notification.message}</p>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => navigateToRelated(notification)}
                        className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
                      >
                        View Details
                      </button>
                      {!notification.isRead && (
                        <button 
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="px-4 py-1.5 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg shadow-sm hover:bg-gray-200 transition-colors"
                        >
                          Mark as Read
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(notification._id)}
                        className="px-4 py-1.5 bg-red-50 text-red-600 text-sm font-bold rounded-lg shadow-sm hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default NotificationsPage;
