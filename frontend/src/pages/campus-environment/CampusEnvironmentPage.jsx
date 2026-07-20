import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getComplaints, updateComplaintStatus, getAllUsers } from '../../services/api';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../services/categoryService';
import toast from 'react-hot-toast';
import { customConfirm } from '../../utils/confirm';
import { useSocket } from '../../context/SocketContext';
import ComplaintDetailsModal from '../../components/campus-environment/ComplaintDetailsModal';

const CampusEnvironmentPage = () => {
  const [subTab, setSubTab] = useState('issues'); // issues, categories

  const [complaints, setComplaints]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [staffUsers, setStaffUsers]     = useState([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const socket = useSocket();

  // Categories state
  const [categories, setCategories]             = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [newCategoryName, setNewCategoryName]     = useState('');
  const [isEditCatOpen, setIsEditCatOpen]         = useState(false);
  const [isViewCatOpen, setIsViewCatOpen]         = useState(false);
  const [selectedCategory, setSelectedCategory]   = useState(null);
  const [editCategoryName, setEditCategoryName]   = useState('');
  const [editCategoryStatus, setEditCategoryStatus] = useState('active');

  /* ── Fetch Complaints ── */
  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await getComplaints(params);
      setComplaints(data.complaints || []);
    } catch {
      toast.error('Failed to load campus complaints');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchStaffUsers = async () => {
    try {
      const data = await getAllUsers({ role: 'staff' });
      setStaffUsers(data.users || []);
    } catch { /* silent */ }
  };

  const fetchCategoriesData = async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetchCategories('campus_issue', true);
      let arr = [];
      if (res) {
        if (Array.isArray(res.data)) arr = res.data;
        else if (res.data && Array.isArray(res.data.data)) arr = res.data.data;
        else if (Array.isArray(res)) arr = res;
      }
      setCategories(arr);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); fetchStaffUsers(); }, [fetchComplaints]);
  useEffect(() => { if (subTab === 'categories') fetchCategoriesData(); }, [subTab]);
  useEffect(() => {
    if (!socket) return;
    socket.on('dashboard:refresh', fetchComplaints);
    return () => socket.off('dashboard:refresh', fetchComplaints);
  }, [socket, fetchComplaints]);

  /* ── Status change ── */
  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateComplaintStatus(id, { status: newStatus, note: 'Status updated via Admin Portal' });
      toast.success('Status updated');
      fetchComplaints();
    } catch (err) {
      const serverMsg = err?.response?.data?.message || '';
      toast.error(serverMsg || "The supports doesn't reach the target");
    }
  };

  // Category CRUD
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) { toast.error('Category name is required'); return; }
    try {
      await createCategory({ name: newCategoryName.trim(), categoryType: 'campus_issue', status: 'active' });
      toast.success('Category created successfully.');
      setNewCategoryName('');
      fetchCategoriesData();
    } catch (err) {
      const msg = err.response?.data?.message || '';
      toast.error(msg.toLowerCase().includes('already exists') || err.response?.status === 409
        ? 'This category already exists.' : 'Unable to create category.');
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editCategoryName.trim()) { toast.error('Category name is required'); return; }
    try {
      await updateCategory(selectedCategory._id, { name: editCategoryName.trim(), status: editCategoryStatus });
      toast.success('Category updated successfully');
      setIsEditCatOpen(false);
      fetchCategoriesData();
    } catch { toast.error('Failed to update category'); }
  };

  const handleToggleCategoryStatus = async (cat) => {
    const next = cat.status === 'active' ? 'inactive' : 'active';
    try {
      await updateCategory(cat._id, { status: next });
      toast.success(`Category ${next === 'active' ? 'activated' : 'deactivated'}`);
      fetchCategoriesData();
    } catch { toast.error('Failed to change category status'); }
  };

  const handleDeleteCategory = async (id) => {
    const confirmed = await customConfirm('Delete this category?');
    if (!confirmed) return;
    try {
      await deleteCategory(id);
      toast.success('Category deleted');
      fetchCategoriesData();
    } catch { toast.error('Failed to delete category'); }
  };

  // Filter counts
  const counts = {
    all:       complaints.length,
    pending:   complaints.filter(c => c.status === 'pending').length,
    in_review: complaints.filter(c => c.status === 'in_review').length,
    resolved:  complaints.filter(c => c.status === 'resolved').length,
    // completed: complaints.filter(c => c.status === 'completed').length,
  };

  const filters = [
    { key: '',          label: 'All',       count: counts.all },
    { key: 'pending',   label: 'Pending',   count: counts.pending },
    { key: 'in_review', label: 'In Review', count: counts.in_review },
    { key: 'resolved',  label: 'Resolved',  count: counts.resolved },
    // { key: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <AdminLayout title="Campus Environment">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Environmental Issues</h2>
        <p className="text-sm text-gray-500 mt-1">Monitor and review campus maintenance and environment complaints.</p>

        {/* Sub-tabs */}
        <div className="flex gap-8 mt-5 border-b border-gray-200">
          {[
            { key: 'issues',     label: '1. Issues' },
            { key: 'categories', label: '2. Categories' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`pb-3 text-sm font-semibold transition-all ${
                subTab === t.key
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: Issues ── */}
      {subTab === 'issues' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Filter badges header */}
          <div className="p-5 border-b border-gray-200 bg-gray-50/50">
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                    statusFilter === f.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">STUDENT ID</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">STUDENT NAME</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">CLASS</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">ISSUE NAME</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : complaints.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-16 text-center text-gray-400 font-medium">
                      No campus complaints found.
                    </td>
                  </tr>
                ) : (
                  complaints.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                        {item.student?.studentId || 'N/A'}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {item.student?.fullName || 'Unknown'}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {item.student?.class?.name || '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {item.title || item.issueType?.issueName || item.category?.name || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={item.status}
                            onChange={e => handleStatusChange(item._id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_review">In Review</option>
                            <option value="resolved">Resolved</option>
                            
                            <option value="rejected">Rejected</option>
                          </select>
                          <button
                            onClick={() => setSelectedComplaintId(item._id)}
                            className="text-xs font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-md transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: Categories ── */}
      {subTab === 'categories' && (
        <div className="space-y-5">
          {/* Add New Category Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-800">Add New Category</h3>
            <form onSubmit={handleCreateCategory} className="flex gap-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Category Name (e.g. Broken AC)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                required
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
              >
                Add
              </button>
            </form>
          </div>

          {/* Categories Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {categoriesLoading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Category Name</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-5 py-12 text-center text-gray-400">No categories found.</td>
                      </tr>
                    ) : categories.map((cat, idx) => (
                      <tr key={cat._id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-600 font-bold">{categories.length - idx}</td>
                        <td className="px-5 py-3 text-gray-800">{cat.name}</td>
                        <td className="px-5 py-3 text-right space-x-3">
                          <button
                            onClick={() => { setSelectedCategory(cat); setEditCategoryName(cat.name); setEditCategoryStatus(cat.status); setIsEditCatOpen(true); }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat._id)}
                            className="text-xs font-bold text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complaint Details Modal */}
      {selectedComplaintId && (
        <ComplaintDetailsModal
          complaintId={selectedComplaintId}
          staffUsers={staffUsers}
          onClose={() => setSelectedComplaintId(null)}
          onUpdate={fetchComplaints}
        />
      )}

      {/* Category Edit Modal */}
      {isEditCatOpen && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Edit Category</h3>
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category Name</label>
                <input type="text" required value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select value={editCategoryStatus} onChange={e => setEditCategoryStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsEditCatOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category View Modal */}
      {isViewCatOpen && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Category Info</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Category ID',   value: selectedCategory._id, mono: true },
                { label: 'Category Name', value: selectedCategory.name },
                { label: 'Status',        value: selectedCategory.status, capitalize: true },
                { label: 'Created By',    value: selectedCategory.createdBy?.fullName || 'System Admin' },
                { label: 'Created Date',  value: new Date(selectedCategory.createdAt).toLocaleString() },
              ].map(row => (
                <div key={row.label} className="border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-400">{row.label}</span>
                  <p className={`mt-0.5 font-medium text-gray-800 ${row.mono ? 'font-mono text-xs' : ''} ${row.capitalize ? 'capitalize' : ''}`}>{row.value}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-5">
              <button onClick={() => setIsViewCatOpen(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default CampusEnvironmentPage;
