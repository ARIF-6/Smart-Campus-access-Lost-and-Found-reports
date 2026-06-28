import React from 'react';
import { useAuth } from '../../context/AuthContext';

const UserTable = ({ users, onEdit, onDelete, onChangeRole, onChangeStatus, onView, availableRoles = [], allRoles = [] }) => {
  const { user: currentUser } = useAuth();

  const getRoleStyle = (roleName) => {
    const role = allRoles.find(r => r.name === roleName) || availableRoles.find(r => r.name === roleName);
    return role?.color || 'bg-gray-100 text-gray-800';
  };

  const getRoleDisplayName = (roleName) => {
    const role = allRoles.find(r => r.name === roleName) || availableRoles.find(r => r.name === roleName);
    return role?.displayName || roleName;
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden mt-6">
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="text-lg font-bold text-gray-800">System Users</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Username / ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              {currentUser?.role !== 'staff' && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              )}
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr><td colSpan={currentUser?.role === 'staff' ? "4" : "5"} className="px-6 py-8 text-center text-gray-500">No users found matching your criteria.</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {(user.fullName || user.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-bold text-gray-900">{user.fullName || user.name}</div>
                        <div className="text-[11px] text-gray-400 font-medium uppercase tracking-tighter">Joined {new Date(user.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 font-medium">
                      {user.role === 'student'
                        ? (user.studentId || <span className="text-gray-300 italic">No ID</span>)
                        : user.username
                          ? <span className="font-mono text-gray-700">{user.username}</span>
                          : (user.email || <span className="text-gray-300 italic">N/A</span>)
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Role Display & Selector Logic */}
                    {(!availableRoles.some(r => r.name === user.role) || (currentUser?.role !== 'admin' && user.role === 'admin')) ? (
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200 ${getRoleStyle(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    ) : (
                      <select
                        className={`text-[10px] font-black uppercase tracking-widest rounded-full px-4 py-1.5 cursor-pointer outline-none border transition-all hover:shadow-sm
                          ${getRoleStyle(user.role)}
                        `}
                        value={user.role}
                        onChange={(e) => onChangeRole(user, e.target.value)}
                      >
                        {availableRoles.map((role) => (
                          <option key={role._id} value={role.name} className="bg-white text-gray-800 lowercase first-letter:uppercase">
                            {role.displayName}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  {currentUser?.role !== 'staff' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {['staff', 'clean', 'security'].includes(user.role) ? (
                        <div className="flex items-center">
                          <button
                            onClick={() => onChangeStatus && onChangeStatus(user, !user.isActive)}
                            disabled={currentUser?.role !== 'admin'}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${currentUser?.role !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''} ${user.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`}
                            role="switch"
                            aria-checked={user.isActive !== false}
                          >
                            <span className="sr-only">Toggle Status</span>
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.isActive !== false ? 'translate-x-4' : 'translate-x-0'}`}
                            />
                          </button>
                          <span className={`ml-3 text-xs font-semibold uppercase tracking-widest ${user.isActive !== false ? 'text-green-600' : 'text-red-600'}`}>
                            {user.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic text-xs">N/A</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => onView(user)}
                        disabled={user.role === 'admin'}
                        className={`p-2 rounded-lg transition-all ${user.role === 'admin' ? 'text-gray-300 bg-gray-550 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200'}`}
                        title={user.role === 'admin' ? "Action not allowed on Main Admin" : "View Full Profile Details"}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onEdit(user)}
                        disabled={user.role === 'admin'}
                        className={`p-2 rounded-lg transition-all ${user.role === 'admin' ? 'text-gray-300 bg-gray-550 cursor-not-allowed opacity-50' : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-900 border border-transparent hover:border-indigo-100'}`}
                        title={user.role === 'admin' ? "Action not allowed on Main Admin" : "Edit User Profile"}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={() => onDelete(user)}
                        disabled={user.role === 'admin'}
                        className={`p-2 rounded-lg transition-all ${user.role === 'admin' ? 'text-gray-300 bg-gray-550 cursor-not-allowed opacity-50' : 'text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100'}`}
                        title={user.role === 'admin' ? "Action not allowed on Main Admin" : "Delete User Account"}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
  );
};

export default UserTable;
