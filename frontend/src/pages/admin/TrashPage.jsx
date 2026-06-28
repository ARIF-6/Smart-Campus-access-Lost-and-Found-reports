import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  getTrashedUsers, restoreUser, permanentDeleteUser,
  getTrashedLostItems, restoreLostItem, permanentDeleteLostItem,
  getTrashedFoundItems, restoreFoundItem, permanentDeleteFoundItem,
  getTrashedClaims, restoreClaim, permanentDeleteClaim,
  getTrashedAnnouncements, restoreAnnouncement, permanentDeleteAnnouncement
} from '../../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiUser, FiBox, FiArchive, FiCheckSquare, FiBell, 
  FiRefreshCw, FiTrash2, FiAlertTriangle, FiInfo
} from 'react-icons/fi';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';

const TrashPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ show: false, type: '', id: null, action: '' });

  const tabs = [
    { id: 'users', label: 'Users', icon: <FiUser /> },
    { id: 'lost-items', label: 'Lost Items', icon: <FiBox /> },
    { id: 'found-items', label: 'Found Items', icon: <FiArchive /> },
    { id: 'claims', label: 'Claims', icon: <FiCheckSquare /> },
    { id: 'announcements', label: 'Announcements', icon: <FiBell /> },
  ];

  const { refreshKey } = useAutoRefreshSignal();

  const fetchTrashedItems = useCallback(async () => {
    setLoading(true);
    try {
      let data = [];
      switch (activeTab) {
        case 'users': data = await getTrashedUsers(); break;
        case 'lost-items': data = await getTrashedLostItems(); break;
        case 'found-items': data = await getTrashedFoundItems(); break;
        case 'claims': data = await getTrashedClaims(); break;
        case 'announcements': data = await getTrashedAnnouncements(); break;
        default: break;
      }
      setItems(data);
    } catch (error) {
      toast.error('Failed to load trashed items');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTrashedItems();
  }, [fetchTrashedItems]);

  // Auto-refresh: re-fetch when the global 30s signal fires
  useEffect(() => { if (refreshKey > 0) fetchTrashedItems(); }, [refreshKey]);

  const handleRestore = async (id) => {
    try {
      switch (activeTab) {
        case 'users': await restoreUser(id); break;
        case 'lost-items': await restoreLostItem(id); break;
        case 'found-items': await restoreFoundItem(id); break;
        case 'claims': await restoreClaim(id); break;
        case 'announcements': await restoreAnnouncement(id); break;
        default: break;
      }
      toast.success('Item restored successfully');
      fetchTrashedItems();
      setConfirmModal({ show: false, type: '', id: null, action: '' });
    } catch (error) {
      toast.error('Restoration failed');
    }
  };

  const handlePermanentDelete = async (id) => {
    try {
      switch (activeTab) {
        case 'users': await permanentDeleteUser(id); break;
        case 'lost-items': await permanentDeleteLostItem(id); break;
        case 'found-items': await permanentDeleteFoundItem(id); break;
        case 'claims': await permanentDeleteClaim(id); break;
        case 'announcements': await permanentDeleteAnnouncement(id); break;
        default: break;
      }
      toast.success('Deleted permanently');
      fetchTrashedItems();
      setConfirmModal({ show: false, type: '', id: null, action: '' });
    } catch (error) {
      toast.error('Permanent deletion failed');
    }
  };

  const openConfirm = (id, action) => {
    setConfirmModal({ show: true, type: activeTab, id, action });
  };

  return (
    <AdminLayout title="Trash & Recovery">
      <div className="space-y-6">
        
        {/* TAB NAVIGATION */}
        <div className="flex flex-wrap gap-2 bg-white/50 p-1.5 rounded-2xl border border-gray-100 backdrop-blur-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'text-gray-500 hover:bg-white hover:text-indigo-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 mb-4"></div>
              <p className="text-gray-400 font-medium">Scanning recycle bin...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center px-4">
              <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 mb-6">
                <FiTrash2 size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Trash is Empty</h3>
              <p className="text-gray-400 max-w-xs">No deleted {activeTab.replace('-', ' ')} found here. Your system is tidy!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 tracking-wider">
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase">Item Info</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase">Deleted Date</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm
                            ${activeTab === 'users' ? 'bg-blue-50 text-blue-600' : 
                              activeTab.includes('item') ? 'bg-orange-50 text-orange-600' : 
                              'bg-purple-50 text-purple-600'}`}
                          >
                            {activeTab === 'users' ? item.name?.charAt(0) : activeTab.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-none mb-1.5">
                              {item.name || item.title || 'Untitled'}
                            </p>
                            <p className="text-xs text-gray-400 font-medium">
                              ID: {item._id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-gray-700">{new Date(item.deletedAt).toLocaleDateString()}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(item.deletedAt).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openConfirm(item._id, 'restore')}
                            className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm shadow-green-100"
                            title="Restore"
                          >
                            <FiRefreshCw />
                          </button>
                          <button
                            onClick={() => openConfirm(item._id, 'delete')}
                            className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm shadow-red-100"
                            title="Delete Permanently"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* INFO CARD */}
        <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 flex items-start gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
            <FiInfo size={20} />
          </div>
          <div>
            <h4 className="font-bold text-indigo-900 mb-1">About Soft Deletion</h4>
            <p className="text-sm text-indigo-800/70 leading-relaxed">
              Soft-deleted items are hidden from the normal application flow but kept in the database for recovery. 
              Only "Permanent Deletion" will actually remove the record from the database.
            </p>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setConfirmModal({ ...confirmModal, show: false })}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 
              ${confirmModal.action === 'restore' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600 scale-animation'}`}
            >
              {confirmModal.action === 'restore' ? <FiRefreshCw size={40} /> : <FiAlertTriangle size={40} />}
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">
              {confirmModal.action === 'restore' ? 'Restore Item?' : 'Final Warning!'}
            </h2>
            <p className="text-gray-500 font-medium mb-8">
              {confirmModal.action === 'restore' 
                ? 'Are you sure you want to bring this item back to the main list?' 
                : 'This action is PERMANENT and cannot be undone. All data will be lost forever.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="flex-1 px-6 py-3.5 rounded-2xl font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmModal.action === 'restore' ? handleRestore(confirmModal.id) : handlePermanentDelete(confirmModal.id)}
                className={`flex-1 px-6 py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 
                  ${confirmModal.action === 'restore' ? 'bg-green-600 shadow-green-200 hover:bg-green-700' : 'bg-red-600 shadow-red-200 hover:bg-red-700'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scale-animation {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .scale-animation {
          animation: scale-animation 2s infinite;
        }
      `}} />

    </AdminLayout>
  );
};

export default TrashPage;
