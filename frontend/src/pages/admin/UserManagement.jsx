import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import CreateUserModal from '../../components/modals/CreateUserModal';
import EditUserModal from '../../components/modals/EditUserModal';
import DeleteConfirmModal from '../../components/modals/DeleteConfirmModal';
import ViewUserModal from '../../components/modals/ViewUserModal';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  changeUserStatus,
  getRoles,
  importStudentsExcel,
  getDepartments,
  getClasses
} from '../../services/api';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../../components/common/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';
import { getImageUrl } from '../../utils/imageUtils';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const { section } = useParams();
  const navigate = useNavigate();

  // State Management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Available roles for registration
  const [availableRoles, setAvailableRoles] = useState([]);
  const [allRoles, setAllRoles] = useState([]);

  // Academic data for student filters
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);

  // Search & Filter States
  const [keyword, setKeyword] = useState('');
  const [selectedRole, setSelectedRole] = useState(''); // Sub-role filter inside Admin Management
  const [selectedDept, setSelectedDept] = useState(''); // Dept filter for Student Management
  const [selectedClass, setSelectedClass] = useState(''); // Class filter for Student Management
  const [selectedStatus, setSelectedStatus] = useState(''); // Status filter

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState('fullName');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  // Modal Controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [excelImportResult, setExcelImportResult] = useState(null);
  const [excelImporting, setExcelImporting] = useState(false);
  const [recentlyRegistered, setRecentlyRegistered] = useState([]);
  const excelFileRef = useRef(null);

  // Helper to determine allowed sections
  const allowedSections = currentUser?.role === 'staff'
    ? ['students', 'securities', 'cleaners']
    : ['admins', 'students', 'securities', 'cleaners'];

  const currentSection = allowedSections.includes(section) ? section : allowedSections[0];

  // Map section to roles for API query
  const getSectionRoles = (sec) => {
    switch (sec) {
      case 'admins':
        return 'admin,staff';
      case 'students':
        return 'student';
      case 'securities':
        return 'security';
      case 'cleaners':
        return 'clean';
      default:
        return '';
    }
  };

  // Enforce redirection on invalid route or empty section parameter
  useEffect(() => {
    if (!section || !allowedSections.includes(section)) {
      navigate(`/admin/users/${allowedSections[0]}`, { replace: true });
    }
  }, [section, allowedSections, navigate]);

  // Fetch departments and classes for filtering
  useEffect(() => {
    const fetchAcademicData = async () => {
      try {
        const [depts, clses] = await Promise.all([getDepartments(), getClasses()]);
        setDepartments(depts || []);
        setClasses(clses || []);
      } catch (err) {
        console.error('Failed to fetch academic details for filters:', err);
      }
    };
    if (currentSection === 'students') {
      fetchAcademicData();
    }
  }, [currentSection]);

  // Build role options for creation based on logged-in user clearance
  const fetchRoles = async () => {
    const fallbackRoles = [
      { _id: 'admin', name: 'admin', displayName: 'Admin', color: 'bg-red-100 text-red-800' },
      //{ _id: 'superadmin', name: 'superadmin', displayName: 'Super Admin', color: 'bg-indigo-100 text-indigo-800' },
      { _id: 'staff', name: 'staff', displayName: 'Staff', color: 'bg-purple-100 text-purple-800' },
      { _id: 'student', name: 'student', displayName: 'Student', color: 'bg-blue-100 text-blue-800' },
      { _id: 'security', name: 'security', displayName: 'Security', color: 'bg-green-100 text-green-800' },
      { _id: 'clean', name: 'clean', displayName: 'Cleaner', color: 'bg-yellow-100 text-yellow-800' }
    ];

    try {
      const data = await getRoles();
      const roles = data.data || data;
      let allRolesData = Array.isArray(roles) && roles.length > 0 ? roles : fallbackRoles;
      setAllRoles(allRolesData);

      let allowedNames = [];
      if (currentUser?.role === 'superadmin' || currentUser?.role === 'admin') {
        allowedNames = ['superadmin', 'admin', 'staff', 'student', 'security', 'clean'];
      } else if (currentUser?.role === 'staff') {
        allowedNames = ['student', 'security', 'clean'];
      }

      const filteredRoles = allRolesData.filter(r => allowedNames.includes(r.name.toLowerCase()));
      setAvailableRoles(filteredRoles);
    } catch (err) {
      setAllRoles(fallbackRoles);
      let allowedNames = [];
      if (currentUser?.role === 'superadmin' || currentUser?.role === 'admin') {
        allowedNames = ['superadmin', 'admin', 'staff', 'student', 'security', 'clean'];
      } else if (currentUser?.role === 'staff') {
        allowedNames = ['student', 'security', 'clean'];
      }
      setAvailableRoles(fallbackRoles.filter(r => allowedNames.includes(r.name.toLowerCase())));
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [currentUser]);

  const { refreshKey } = useAutoRefreshSignal();

  // Main fetch users method
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 10,
        sort: sortOrder === 'asc' ? sortField : `-${sortField}`
      };

      // Set section role constraint
      params.role = getSectionRoles(currentSection);

      // Section-specific sub-role filtering (Admin Management only)
      if (currentSection === 'admins' && selectedRole && selectedRole !== 'all') {
        params.role = selectedRole;
      }

      // Add common filters
      if (keyword) params.search = keyword;
      if (selectedStatus) params.status = selectedStatus;

      // Academic filters for students
      if (currentSection === 'students') {
        if (selectedDept) params.department = selectedDept;
        if (selectedClass) params.class = selectedClass;
      }

      const data = await getAllUsers(params);
      setUsers(data.users || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        window.location.href = '/login';
      } else {
        setError('Failed to fetch users.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, currentSection, selectedRole, keyword, selectedStatus, selectedDept, selectedClass, sortField, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Auto-refresh: re-fetch when the global refresh signal fires
  useEffect(() => {
    if (refreshKey > 0) fetchUsers();
  }, [refreshKey]);

  // Reset pagination/filters when switching sections
  useEffect(() => {
    setPage(1);
    setKeyword('');
    setSelectedRole('');
    setSelectedDept('');
    setSelectedClass('');
    setSelectedStatus('');
  }, [currentSection]);

  // Actions
  const handleSaveCreate = async (userData) => {
    try {
      await createUser(userData);
      toast.success('User registered successfully');
      setIsCreateOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating user.');
      throw err;
    }
  };

  const handleSaveEdit = async (id, updatedData) => {
    try {
      await updateUser(id, updatedData);
      toast.success('User profile updated successfully.');
      setIsEditOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating user.');
    }
  };

  const handleDeleteConfirm = async (id) => {
    try {
      await deleteUser(id);
      toast.success('User permanently deleted.');
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting user.');
    }
  };

  const handleChangeStatusInline = async (user, newStatus) => {
    try {
      await changeUserStatus(user._id, newStatus);
      toast.success(`User status updated to ${newStatus ? 'Active' : 'Inactive'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status.');
    }
  };

  const handleExcelImport = async (file) => {
    if (!file) return;
    setExcelImporting(true);
    try {
      const formData = new FormData();
      formData.append('excel', file);
      const result = await importStudentsExcel(formData);
      setExcelImportResult(result);
      if (result.created?.length > 0) {
        setRecentlyRegistered(result.created);
      }
      toast.success(result.message || 'Import completed!');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error importing Excel file.');
    } finally {
      setExcelImporting(false);
    }
  };

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Section details
  const getSectionTitle = () => {
    switch (currentSection) {
      case 'admins': return 'Admin Management';
      case 'students': return 'Student Management';
      case 'securities': return 'Security Management';
      case 'cleaners': return 'Cleaner Management';
      default: return 'User Management';
    }
  };

  const getSectionDescription = () => {
    switch (currentSection) {
      case 'admins': return 'View and manage Super Admins, Admins, and Staff clearance levels.';
      case 'students': return 'Manage student profiles, import data from Excel spreadsheets, and register new students.';
      case 'securities': return 'Monitor and update profiles for campus security guards.';
      case 'cleaners': return 'Manage cleaners profiles and active statuses.';
      default: return '';
    }
  };

  const getRegisterButtonLabel = () => {
    switch (currentSection) {
      case 'admins': return 'Register New Admin User';
      case 'students': return 'Register New Student';
      case 'securities': return 'Register New Security User';
      case 'cleaners': return 'Register New Cleaner User';
      default: return 'Register New User';
    }
  };

  const getCreateDefaultRole = () => {
    switch (currentSection) {
      case 'students': return 'student';
      case 'securities': return 'security';
      case 'cleaners': return 'clean';
      default: return '';
    }
  };

  const getCreateModalRoles = () => {
    if (currentSection === 'admins') {
      return availableRoles.filter((r) => ['admin', 'staff', 'superadmin'].includes(r.name.toLowerCase()));
    }
    return availableRoles;
  };

  return (
    <AdminLayout title="User Management">
      {/* Redesigned Header Area */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{getSectionTitle()}</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">{getSectionDescription()}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {currentSection === 'students' && (
            <button
              onClick={() => { setExcelImportResult(null); setIsExcelOpen(true); }}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Import Students (Excel)
            </button>
          )}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-sm shadow-indigo-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            {getRegisterButtonLabel()}
          </button>
        </div>
      </div>

      {/* Tabs Menu Section */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {allowedSections.includes('admins') && (
            <button
              onClick={() => navigate('/admin/users/admins')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all duration-200 ${currentSection === 'admins'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Admin Management
            </button>
          )}
          <button
            onClick={() => navigate('/admin/users/students')}
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all duration-200 ${currentSection === 'students'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Student Management
          </button>
          <button
            onClick={() => navigate('/admin/users/securities')}
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all duration-200 ${currentSection === 'securities'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Security Management
          </button>
          <button
            onClick={() => navigate('/admin/users/cleaners')}
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all duration-200 ${currentSection === 'cleaners'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Cleaner Management
          </button>
        </nav>
      </div>

      {/* Dynamic Filtering Ribbon */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Search Users</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all placeholder:text-gray-400"
              placeholder={currentSection === 'students' ? 'Search students by name, ID...' : 'Search by name, username...'}
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {/* Admin role filter */}
          {currentSection === 'admins' && (
            <div className="w-full sm:w-auto min-w-[160px]">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Clearance Level</label>
              <select
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                value={selectedRole}
                onChange={(e) => { setSelectedRole(e.target.value); setPage(1); }}
              >
                <option value="all">All Roles</option>
                {/* <option value="superadmin">Super Admin</option> */}
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          )}

          {/* Student filters */}
          {currentSection === 'students' && (
            <>
              <div className="w-full sm:w-auto min-w-[160px]">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Department</label>
                <select
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                  value={selectedDept}
                  onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-auto min-w-[160px]">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Class</label>
                <select
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setPage(1); }}
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Status filter */}
          {currentSection !== 'admins' && (
            <div className="w-full sm:w-auto min-w-[140px]">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Status</label>
              <select
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          <button
            onClick={() => {
              setKeyword('');
              setSelectedRole('');
              setSelectedDept('');
              setSelectedClass('');
              setSelectedStatus('');
              setPage(1);
            }}
            className="px-5 py-2.5 text-xs font-extrabold text-indigo-600 uppercase tracking-wider hover:bg-indigo-50 rounded-xl transition-all duration-200 border border-transparent hover:border-indigo-100 flex items-center justify-center gap-1.5 self-end"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Recently Registered Banner */}
      {recentlyRegistered.length > 0 && currentSection === 'students' && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 bg-emerald-100/60 border-b border-emerald-200">
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 text-lg">🎉</span>
              <span className="font-black text-emerald-800 text-sm">
                Recently Registered — {recentlyRegistered.length} student{recentlyRegistered.length !== 1 ? 's' : ''} just imported
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* <button
                onClick={() => {
                  const text = recentlyRegistered.map(s => `${s.fullName} | ID: ${s.studentId} | Password: ${s.password}`).join('\n');
                  navigator.clipboard.writeText(text);
                  toast.success('Credentials copied!');
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 bg-white/70 hover:bg-white rounded-lg border border-emerald-200 transition-all"
              >
                📋 Copy All Credentials
              </button> */}
              <button
                onClick={() => setRecentlyRegistered([])}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 px-3 py-1.5 bg-white/70 hover:bg-white rounded-lg border border-emerald-200 transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-100/40">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {recentlyRegistered.map((s, i) => (
                  <tr key={i} className="hover:bg-emerald-50 transition-colors">
                    <td className="px-6 py-3 text-xs font-bold text-emerald-500">{i + 1}</td>
                    <td className="px-6 py-3 font-semibold text-gray-800">{s.fullName}</td>
                    <td className="px-6 py-3 font-mono font-bold text-indigo-700">{s.studentId}</td>
                    <td className="px-6 py-3 font-mono font-bold text-emerald-700">{s.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Table View */}
      {error ? (
        <div className="bg-red-50 text-red-700 p-8 rounded-2xl border border-red-200 text-center font-bold shadow-sm">
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <TableSkeleton rows={8} cols={5} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
            <table className="min-w-full divide-y divide-gray-200 border-collapse">
              {/* Sticky Headers */}
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th
                    onClick={() => handleSort('fullName')}
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      Full Name
                      {sortField === 'fullName' && (
                        <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>

                  {currentSection === 'students' ? (
                    <>
                      <th
                        onClick={() => handleSort('studentId')}
                        className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          Student ID
                          {sortField === 'studentId' && (
                            <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Class</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Academic Year</th>
                    </>
                  ) : (
                    <th
                      onClick={() => handleSort('username')}
                      className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        Username
                        {sortField === 'username' && (
                          <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                  )}

                  {currentSection === 'admins' && (
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  )}

                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-sm font-semibold text-gray-400">
                      No accounts found in this section matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Name Details */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-100">
                            {item.photoUrl ? (
                              <img
                                src={getImageUrl(item.photoUrl)}
                                alt={item.fullName}
                                className="h-full w-full object-cover"
                                onError={e => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.classList.add('bg-indigo-50');
                                  e.target.insertAdjacentHTML('afterend', `<span class="text-indigo-700 font-extrabold text-sm uppercase">${(item.fullName || 'U')[0]}</span>`);
                                }}
                              />
                            ) : (
                              <div className="h-full w-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-extrabold text-sm uppercase">
                                {item.fullName ? item.fullName.charAt(0) : 'U'}
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-bold text-gray-900">{item.fullName}</div>
                            <div className="text-[11px] text-gray-400 font-semibold tracking-tighter">
                              Created {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>


                      {/* Section Specific columns */}
                      {currentSection === 'students' ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-indigo-700">
                            {item.studentId || <span className="text-gray-300 italic">None</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-semibold">
                            {typeof item.department === 'object' ? item.department?.name : item.department || <span className="text-gray-300 italic">None</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-semibold">
                            {typeof item.class === 'object' ? item.class?.name : item.class || <span className="text-gray-300 italic">None</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-700">
                            {item.academicYear || <span className="text-gray-300 italic">None</span>}
                          </td>
                        </>
                      ) : (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700 font-semibold">
                          {item.username || <span className="text-gray-300 italic">None</span>}
                        </td>
                      )}

                      {/* Admin Clearance badge */}
                      {currentSection === 'admins' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.role === 'superadmin' ? 'bg-indigo-100 text-indigo-800' :
                            item.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                            {item.role === 'superadmin' ? 'Super Admin' :
                              item.role === 'admin' ? 'Admin' : 'Staff'}
                          </span>
                        </td>
                      )}

                      {/* Toggle status control */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <button
                            onClick={() => handleChangeStatusInline(item, !item.isActive)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.isActive !== false ? 'bg-emerald-500' : 'bg-red-400'
                              }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${item.isActive !== false ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                          </button>
                          <span className={`ml-2 text-xs font-bold tracking-wide ${item.isActive !== false ? 'text-emerald-600' : 'text-red-500'
                            }`}>
                            {item.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      {/* Operations */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => { setActiveUser(item); setIsViewOpen(true); }}
                            className="p-1.5 bg-gray-50 border border-gray-100 hover:border-gray-200 text-gray-600 hover:text-gray-900 rounded-lg transition-all"
                            title="View Detailed Profile"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { setActiveUser(item); setIsEditOpen(true); }}
                            className="p-1.5 bg-indigo-50/50 border border-indigo-100/50 hover:border-indigo-200 text-indigo-600 hover:text-indigo-800 rounded-lg transition-all"
                            title="Edit User Info"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { setActiveUser(item); setIsDeleteOpen(true); }}
                            className="p-1.5 bg-red-50/50 border border-red-100/50 hover:border-red-200 text-red-500 hover:text-red-700 rounded-lg transition-all"
                            title="Delete User"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

      {/* Modern pagination */}
      <div className="flex items-center justify-between bg-white px-6 py-4 border border-gray-200 rounded-2xl shadow-sm">
        <div className="text-sm font-semibold text-gray-500">
          Showing <span className="text-gray-900">{users.length}</span> of <span className="text-gray-900">{total}</span> users
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            Prev
          </button>
          <div className="flex items-center px-3 text-xs font-bold text-gray-600">
            Page {page} of {pages}
          </div>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            Next
          </button>
        </div>
      </div>

      {/* Excel Import Modal */}
      {isExcelOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 opacity-60" onClick={() => setIsExcelOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Import Students from Excel</h3>
                </div>
                <button onClick={() => setIsExcelOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-full hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {!excelImportResult ? (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                    <p className="text-sm font-semibold text-blue-800 mb-2">📋 Required Excel Columns (exact names, no extras allowed):</p>
                    <div className="grid grid-cols-3 gap-2 text-xs text-blue-700 font-mono mb-2">
                      <span className="bg-blue-100 rounded px-2 py-1">StudentID</span>
                      <span className="bg-blue-100 rounded px-2 py-1">FullName</span>
                      <span className="bg-blue-100 rounded px-2 py-1">Faculty</span>
                      <span className="bg-blue-100 rounded px-2 py-1">Department</span>
                      <span className="bg-blue-100 rounded px-2 py-1">Class</span>
                      <span className="bg-blue-100 rounded px-2 py-1">ParentNumber</span>
                    </div>
                  </div>

                  <div
                    className="border-2 border-dashed border-emerald-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                    onClick={() => excelFileRef.current?.click()}
                  >
                    <input
                      ref={excelFileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleExcelImport(file);
                      }}
                    />
                    {excelImporting ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-semibold text-emerald-700">Processing Excel file...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-700">Click to upload Excel file</p>
                          <p className="text-xs text-gray-400 mt-0.5">.xlsx or .xls — max 10MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-5">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Rows</p>
                        <p className="text-2xl font-black text-gray-700 mt-1">
                          {(excelImportResult.created?.length || 0) + (excelImportResult.errors?.length || 0)}
                        </p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Imported</p>
                        <p className="text-2xl font-black text-emerald-700 mt-1">
                          {excelImportResult.created?.length || 0}
                        </p>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center">
                        <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Skipped</p>
                        <p className="text-2xl font-black text-rose-700 mt-1">
                          {excelImportResult.errors?.length || 0}
                        </p>
                      </div>
                    </div>

                    {excelImportResult.created?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-800 text-sm">✅ Registered Students ({excelImportResult.created.length})</h4>
                          <button
                            onClick={() => {
                              const text = excelImportResult.created.map(s => `${s.fullName} | ID: ${s.studentId} | Password: ${s.password}`).join('\n');
                              navigator.clipboard.writeText(text);
                              toast.success('Credentials copied to clipboard!');
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
                          >
                            Copy All Credentials
                          </button>
                        </div>
                        <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                          <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                  <th className="px-4 py-2 text-left font-bold text-gray-600 uppercase tracking-wider">Full Name</th>
                                  <th className="px-4 py-2 text-left font-bold text-gray-600 uppercase tracking-wider">StudentID</th>
                                  <th className="px-4 py-2 text-left font-bold text-gray-600 uppercase tracking-wider">Password</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {excelImportResult.created.map((s, i) => (
                                  <tr key={i} className="hover:bg-white">
                                    <td className="px-4 py-2 font-medium text-gray-800">{s.fullName}</td>
                                    <td className="px-4 py-2 font-mono text-indigo-700">{s.studentId}</td>
                                    <td className="px-4 py-2 font-mono text-emerald-700 font-bold">{s.password}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {excelImportResult.errors?.length > 0 && (
                      <div>
                        <h4 className="font-bold text-rose-700 text-sm mb-2">⚠️ Skipped Records & Reasons ({excelImportResult.errors.length})</h4>
                        <div className="bg-rose-50/50 rounded-xl border border-rose-100 p-4 max-h-48 overflow-y-auto space-y-1.5">
                          {excelImportResult.errors.map((err, i) => (
                            <p key={i} className="text-xs text-rose-800 font-medium leading-relaxed">• {err}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => { setExcelImportResult(null); if (excelFileRef.current) excelFileRef.current.value = ''; }}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all"
                    >
                      Import Another File
                    </button>
                    <button
                      onClick={() => setIsExcelOpen(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shared Modals */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveCreate}
        availableRoles={getCreateModalRoles()}
        defaultRole={getCreateDefaultRole()}
        showRoleSelector={currentSection === 'admins'}
        modalTitle={getRegisterButtonLabel()}
      />
      {activeUser && (
        <>
          <EditUserModal
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            user={activeUser}
            onSave={handleSaveEdit}
            availableRoles={availableRoles}
          />
          <ViewUserModal
            isOpen={isViewOpen}
            onClose={() => { setIsViewOpen(false); fetchUsers(); }}
            user={activeUser}
            allRoles={allRoles}
            availableRoles={availableRoles}
            viewerRole={currentUser?.role}
          />
          <DeleteConfirmModal
            isOpen={isDeleteOpen}
            onClose={() => setIsDeleteOpen(false)}
            user={activeUser}
            onConfirm={handleDeleteConfirm}
          />
        </>
      )}
    </AdminLayout>
  );
};

export default UserManagement;
