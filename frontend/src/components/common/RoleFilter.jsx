import React from 'react';

const RoleFilter = ({ selectedRole, setSelectedRole }) => {
  return (
    <div className="relative">
      <select
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.target.value)}
        className="block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm appearance-none select-chevron transition-colors"
      >
        <option value="All">All Roles</option>
        <option value="admin">Admins</option>
        <option value="student">Students</option>
        <option value="security">Security</option>
        <option value="clean">Cleaners</option>
      </select>
    </div>
  );
};

export default RoleFilter;
