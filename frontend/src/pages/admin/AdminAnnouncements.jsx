import React, { useState, useEffect, useCallback } from 'react';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';
import AdminLayout from '../../components/layout/AdminLayout';
import { createAnnouncement, getAnnouncements, deleteAnnouncement } from '../../services/api';
import { toast } from 'react-hot-toast';

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetRoles: ['all']
  });

  const rolesOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'student', label: 'Students' },
    { value: 'security', label: 'Security' },
    { value: 'clean', label: 'Cleaners' }
  ];

  const { refreshKey } = useAutoRefreshSignal();

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAnnouncements();
      setAnnouncements(data.results || []);
    } catch {
      toast.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  // Auto-refresh: re-fetch when the global 30s signal fires
  useEffect(() => { if (refreshKey > 0) fetchAnnouncements(); }, [refreshKey]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createAnnouncement(formData);
      toast.success('Announcement created successfully');
      setFormData({ title: '', message: '', targetRoles: ['all'] });
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create announcement');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await deleteAnnouncement(id);
        toast.success('Announcement deleted successfully');
        fetchAnnouncements();
      } catch {
        toast.error('Failed to delete announcement');
      }
    }
  };

  const handleRoleChange = (role) => {
    if (role === 'all') {
      setFormData({ ...formData, targetRoles: ['all'] });
    } else {
      let updatedRoles = formData.targetRoles.filter(r => r !== 'all');
      if (updatedRoles.includes(role)) {
        updatedRoles = updatedRoles.filter(r => r !== role);
      } else {
        updatedRoles.push(role);
      }
      if (updatedRoles.length === 0) updatedRoles = ['all'];
      setFormData({ ...formData, targetRoles: updatedRoles });
    }
  };

  return (
    <AdminLayout title="Manage Announcements">
      <div className="space-y-8 pb-8">
        {/* Create Announcement Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            Create New Announcement
          </h2>
          
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none"
                  placeholder="Important System Update"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Target Roles</label>
                <div className="flex flex-wrap gap-2">
                  {rolesOptions.map(role => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => handleRoleChange(role.value)}
                      className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest transition-all border ${
                        formData.targetRoles.includes(role.value)
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                          : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Message</label>
              <textarea
                required
                rows="4"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none resize-none"
                placeholder="Write your announcement details here..."
              ></textarea>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-8 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all hover:-translate-y-1 active:scale-95"
              >
                Post Announcement
              </button>
            </div>
          </form>
        </div>

        {/* Announcements List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Existing Announcements</h2>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">{announcements.length} Total</span>
          </div>

          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 mb-4"></div>
              <p className="text-gray-400 font-medium">Loading history...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-gray-400 font-medium italic">No announcements found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {announcements.map((ann) => (
                <div key={ann._id} className="p-8 hover:bg-gray-50/50 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-3 w-full">
                      <div className="flex justify-between items-start w-full">
                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{ann.title}</h3>
                        <button
                          onClick={() => handleDelete(ann._id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                          title="Delete Announcement"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      
                      <p className="text-gray-600 text-sm leading-relaxed max-w-4xl whitespace-pre-wrap">{ann.message}</p>

                      <div className="flex flex-wrap items-center gap-4 mt-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Priority</span>
                          <span className="text-xs font-bold text-red-600">{ann.priority || 'High'}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200"></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status</span>
                          <span className={`text-xs font-bold ${ann.isActive !== false ? 'text-green-600' : 'text-gray-500'}`}>{ann.isActive !== false ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200"></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Created By</span>
                          <span className="text-xs font-bold text-gray-700">{ann.createdBy?.fullName || ann.createdBy?.name || 'System Administrator'}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200"></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Date</span>
                          <span className="text-xs font-bold text-gray-600">{ann.createdAt ? new Date(ann.createdAt).toISOString().split('T')[0] : '—'}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200"></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Target Roles</span>
                          <div className="flex gap-1">
                            {ann.targetRoles && ann.targetRoles.map(role => (
                              <span key={role} className="bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded border border-indigo-200">
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnnouncements;
