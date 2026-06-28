import React, { useState, useEffect, useCallback } from 'react';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';
import AdminLayout from '../../components/layout/AdminLayout';
import { getRoles, createRole, updateRole, deleteRole } from '../../services/api';
import toast from 'react-hot-toast';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // role to confirm delete
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    color: 'bg-gray-100 text-gray-800'
  });

  const colorOptions = [
    { label: 'Red (Admin)', value: 'bg-red-100 text-red-800' },
    { label: 'Purple (Management)', value: 'bg-purple-100 text-purple-800' },
    { label: 'Blue (Security)', value: 'bg-blue-100 text-blue-800' },
    { label: 'Green (Staff)', value: 'bg-green-100 text-green-800' },
    { label: 'Gray (Standard)', value: 'bg-gray-100 text-gray-800' },
    { label: 'Indigo (Special)', value: 'bg-indigo-100 text-indigo-800' },
    { label: 'Yellow (Restricted)', value: 'bg-yellow-100 text-yellow-800' }
  ];

  const { refreshKey } = useAutoRefreshSignal();

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRoles();
      const allRoles = data.data || data || [];
      setRoles(allRoles);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // Auto-refresh: re-fetch when the global 30s signal fires
  useEffect(() => { if (refreshKey > 0) fetchRoles(); }, [refreshKey]);

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        displayName: role.displayName || '',
        description: role.description || '',
        color: role.color || 'bg-gray-100 text-gray-800'
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        displayName: '',
        description: '',
        color: 'bg-gray-100 text-gray-800'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Client-side guard
    if (!formData.displayName.trim()) {
      toast.error('Display name is required');
      return;
    }
    if (!editingRole && !formData.name.trim()) {
      toast.error('System name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingRole) {
        // IMPORTANT: never send `name` on update — it's immutable & unique
        const updatePayload = {
          displayName: formData.displayName.trim(),
          description: formData.description.trim(),
          color: formData.color
        };
        await updateRole(editingRole._id, updatePayload);
        toast.success('Role updated successfully');
      } else {
        const createPayload = {
          name: formData.name.trim(),
          displayName: formData.displayName.trim(),
          description: formData.description.trim(),
          color: formData.color
        };
        await createRole(createPayload);
        toast.success('Role created successfully');
      }
      setIsModalOpen(false);
      setEditingRole(null);
      fetchRoles();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Error saving role';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const result = await deleteRole(deleteTarget._id);
      const count = result?.deletedUsersCount ?? 0;
      toast.success(
        count > 0
          ? `Role "${deleteTarget.displayName}" and ${count} user(s) permanently deleted.`
          : `Role "${deleteTarget.displayName}" deleted.`
      );
      setDeleteTarget(null);
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting role');
      setDeleteTarget(null);
    }
  };

  return (
    <AdminLayout title="Role Management">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">System Roles</h2>
          <p className="text-sm text-gray-400 font-medium">Define and manage account types across the campus.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Register New Role
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">No Roles Detected</h3>
              <p className="text-sm text-gray-400">The database appears to be empty. Register your first role to get started.</p>
            </div>
          ) : (
            roles.map((role) => (
              <div key={role._id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${role.color}`}>
                    {role.name}
                  </span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenModal(role)}
                      title="Edit role"
                      className="text-blue-500 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(role)}
                      title="Delete role"
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">{role.displayName}</h3>
                <p className="text-sm text-gray-500 mb-4 h-10 overflow-hidden">{role.description || 'No description provided.'}</p>
                <div className="pt-4 border-t border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Created: {new Date(role.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black text-gray-800 mb-6">
              {editingRole ? 'Edit Role' : 'New Role Registration'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* System Name — only editable on create */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  System Name (ID)
                </label>
                <input
                  type="text"
                  required={!editingRole}
                  disabled={!!editingRole}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="e.g. security_guard"
                />
                {editingRole && (
                  <p className="text-[10px] text-gray-400 mt-1">System name cannot be changed after creation.</p>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. Security Officer"
                />
              </div>

              {/* Visual Style */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Visual Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {colorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: opt.value })}
                      className={`px-3 py-2 rounded-lg text-[11px] font-bold text-left transition-all border-2 ${
                        formData.color === opt.value
                          ? 'border-indigo-600 ring-2 ring-indigo-100 bg-white'
                          : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${opt.value.split(' ')[0]}`}></span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  placeholder="What can this role do?"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {submitting ? 'Saving...' : (editingRole ? 'Update' : 'Register')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}></div>
          <div className="relative bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Delete Role &amp; Users?</h3>
            <p className="text-sm text-gray-500 mb-3">
              You are about to permanently delete the{' '}
              <span className="font-bold text-gray-800">"{deleteTarget.displayName}"</span> role.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-left">
              <p className="text-xs font-bold text-red-700 mb-1">⚠ This will also permanently delete:</p>
              <ul className="text-xs text-red-600 list-disc list-inside space-y-0.5">
                <li>All users assigned to this role</li>
                <li>Their login access immediately</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RoleManagement;
