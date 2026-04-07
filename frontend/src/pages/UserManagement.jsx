import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import UserTable from '../components/UserTable';
import SearchBar from '../components/SearchBar';
import RoleFilter from '../components/RoleFilter';
import EditUserModal from '../components/EditUserModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { getAllUsers, updateUser, deleteUser, changeUserRole } from '../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Pagination & Filtering Search State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modal State Control
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);

  // Throttler utility hook
  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllUsers(page, 10, roleFilter, search);
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotalUsersCount(data.totalUsers);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        window.location.href = '/login';
      } else {
        setError('Failed to fetch user index.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCommit = () => {
    setPage(1); // Jump back to start
    fetchUsers();
  };

  // Toast UI Pop
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Action Triggers
  const openEdit = (user) => {
    setActiveUser(user);
    setIsEditOpen(true);
  };

  const openDelete = (user) => {
    setActiveUser(user);
    setIsDeleteOpen(true);
  };

  // Executing Endpoints
  const handleSaveEdit = async (id, updatedData) => {
    try {
      await updateUser(id, updatedData);
      showToast('User profile updated successfully.');
      setIsEditOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating user.', 'error');
    }
  };

  const handleDeleteConfirm = async (id) => {
    try {
      await deleteUser(id);
      showToast('User deleted permanently from the database.');
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error attempting to delete user.', 'error');
    }
  };

  const handleChangeRoleInline = async (user, newRole) => {
    // Only dispatch if they actually swapped it
    if (newRole === user.role) return;
    try {
      await changeUserRole(user._id, newRole);
      showToast(`User role elegantly shifted to ${newRole}`);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error mutating role.', 'error');
    }
  };

  return (
    <AdminLayout title="Manage Users">
      
      {/* Toast Notification Mount */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-sm font-semibold flex items-center transition-all ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
           <span className="mr-2">
             {toast.type === 'success' ? '✅' : '🚨'}
           </span>
           {toast.message}
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Roster</h2>
          <p className="text-gray-500 text-sm mt-1">Manage, query, and enforce policies on current {totalUsersCount} active users.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar search={search} setSearch={setSearch} onSearch={handleSearchCommit} />
          <RoleFilter selectedRole={roleFilter} setSelectedRole={(role) => { setRoleFilter(role); setPage(1); } } />
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl shadow border border-red-200 text-center">
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
           <UserTable 
              users={users} 
              onEdit={openEdit} 
              onDelete={openDelete} 
              onChangeRole={handleChangeRoleInline}
           />
           
           {/* Pagination Footer */}
           {totalPages > 1 && (
             <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button 
                     disabled={page === 1}
                     onClick={() => setPage(page - 1)}
                     className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 text-indigo-600"
                  >
                     Previous
                  </button>
                  <button 
                     disabled={page === totalPages}
                     onClick={() => setPage(page + 1)}
                     className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 text-indigo-600"
                  >
                     Next
                  </button>
                </div>
             </div>
           )}
        </div>
      )}

      {/* Popovers */}
      <EditUserModal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        user={activeUser} 
        onSave={handleSaveEdit} 
      />
      
      <DeleteConfirmModal 
        isOpen={isDeleteOpen} 
        onClose={() => setIsDeleteOpen(false)} 
        user={activeUser} 
        onConfirm={handleDeleteConfirm} 
      />
    </AdminLayout>
  );
};

export default UserManagement;
