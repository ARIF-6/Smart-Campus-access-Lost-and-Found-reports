import React, { useState, useEffect, useCallback } from 'react';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';
import toast from 'react-hot-toast';
import {
  getFaculties,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getHalls,
  createHall,
  updateHall,
  deleteHall,
  getClassStudents,
  assignClassLeader,
  getCampuses,
  createCampus,
  updateCampus,
  deleteCampus,
  getCampusQR,
  downloadCampusQRPDF,
} from '../../services/api';
import { QRCodeSVG } from 'qrcode.react';

const UniversityManagement = () => {
  const [activeTab, setActiveTab] = useState('campuses'); // campuses, faculties, departments, halls, classes
  const [searchQuery, setSearchQuery] = useState('');
  const [hallCampusFilter, setHallCampusFilter] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInspectOpen, setIsInspectOpen] = useState(false);

  // Exploration / Inspection states
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedClassHall, setSelectedClassHall] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [selectedClassTotalStudents, setSelectedClassTotalStudents] = useState(0);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  // Data States
  const [campuses, setCampuses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [halls, setHalls] = useState([]);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form Input States (Create)
  const [campusForm, setCampusForm] = useState({ name: '', locationLink: '', latitude: '', longitude: '', radius: '120' });
  const [facultyForm, setFacultyForm] = useState({ name: '', description: '' });
  const [deptForm, setDeptForm] = useState({ name: '', description: '', facultyId: '' });
  const [classForm, setClassForm] = useState({ name: '', departmentId: '', academicYear: '', campusId: '', hallId: '' });
  const [hallForm, setHallForm] = useState({ name: '', capacity: '', campusId: '' });

  // Edit/Delete state
  const [editItem, setEditItem] = useState(null); // item being edited
  const [editForm, setEditForm] = useState({});
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name, type }
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  // Campus QR modal state
  const [selectedCampusQR, setSelectedCampusQR] = useState(null); // { _id, name, qrCode, qrGeneratedAt, qrExpiresAt, isExpired }
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isQRLoading, setIsQRLoading] = useState(false);
  const [isPDFLoading, setIsPDFLoading] = useState(false);

  const { refreshKey } = useAutoRefreshSignal();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [facList, deptList, classList, hallList, campusList] = await Promise.all([
        getFaculties(),
        getDepartments(),
        getClasses(),
        getHalls(),
        getCampuses()
      ]);
      setFaculties(facList);
      setDepartments(deptList);
      setClasses(classList);
      setHalls(hallList);
      setCampuses(campusList);
    } catch (error) {
      toast.error('Failed to fetch university structure data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh: re-fetch when the global 30s signal fires
  useEffect(() => {
    if (refreshKey > 0) {
      fetchData();
      if (isInspectOpen && selectedClass) {
        fetchClassStudents(selectedClass._id);
      }
    }
  }, [refreshKey]);

  // Submit Handlers (Create)
  const handleCampusSubmit = async (e) => {
    e.preventDefault();
    if (!campusForm.name.trim()) return toast.error('Campus Name is required');
    if (campusForm.locationLink && !/^https?:\/\//i.test(campusForm.locationLink.trim())) {
      return toast.error('Location Link must be a valid URL (starting with http:// or https://)');
    }

    setIsActionLoading(true);
    try {
      await createCampus({
        name: campusForm.name.trim(),
        locationLink: campusForm.locationLink.trim(),
        latitude: campusForm.latitude !== '' ? Number(campusForm.latitude) : null,
        longitude: campusForm.longitude !== '' ? Number(campusForm.longitude) : null,
        radius: campusForm.radius !== '' ? Number(campusForm.radius) : 120,
      });
      toast.success('Campus registered successfully');
      setCampusForm({ name: '', locationLink: '', latitude: '', longitude: '', radius: '120' });
      setIsCreateOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register Campus');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    if (!facultyForm.name.trim()) return toast.error('Faculty Name is required');

    setIsActionLoading(true);
    try {
      await createFaculty(facultyForm);
      toast.success('Faculty registered successfully');
      setFacultyForm({ name: '', description: '' });
      setIsCreateOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register Faculty');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim() || !deptForm.facultyId) {
      return toast.error('Name and Faculty association are required');
    }

    setIsActionLoading(true);
    try {
      await createDepartment(deptForm);
      toast.success('Department registered successfully');
      setDeptForm({ name: '', description: '', facultyId: '' });
      setIsCreateOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register Department');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    if (!classForm.name.trim() || !classForm.departmentId) {
      return toast.error('Name and Department association are required');
    }

    setIsActionLoading(true);
    try {
      await createClass(classForm);
      toast.success('Class registered successfully');
      setClassForm({ name: '', departmentId: '', academicYear: '', campusId: '', hallId: '' });
      setIsCreateOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register Class');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleHallSubmit = async (e) => {
    e.preventDefault();
    if (!hallForm.name.trim() || !hallForm.capacity || !hallForm.campusId) {
      return toast.error('Name, Capacity, and Campus associations are required');
    }

    setIsActionLoading(true);
    try {
      const payload = {
        name: hallForm.name.trim(),
        capacity: Number(hallForm.capacity),
        campus: hallForm.campusId
      };
      await createHall(payload);
      toast.success('Hall registered successfully');
      setHallForm({ name: '', capacity: '', campusId: '' });
      setIsCreateOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register Hall');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Edit Handlers
  const openEdit = (item, type) => {
    setEditItem({ ...item, _type: type });
    if (type === 'campuses') setEditForm({ name: item.name, locationLink: item.locationLink || '', latitude: item.latitude ?? '', longitude: item.longitude ?? '', radius: item.radius ?? 120 });
    else if (type === 'faculties') setEditForm({ name: item.name, description: item.description || '' });
    else if (type === 'departments') setEditForm({ name: item.name, description: item.description || '', facultyId: item.facultyId || item.faculty?._id || '' });
    else if (type === 'classes') setEditForm({ name: item.name, departmentId: item.departmentId || item.department?._id || '', academicYear: item.academicYear || '', campusId: item.hall?.campusId || '', hallId: item.hall?._id || '' });
    else if (type === 'halls') setEditForm({ name: item.name, capacity: item.capacity || '', classId: item.class?._id || item.class || '', campusId: item.campus?._id || item.campus || '' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setIsEditLoading(true);
    try {
      const type = editItem._type;
      const id = editItem._id;
      if (type === 'campuses') await updateCampus(id, editForm);
      else if (type === 'faculties') await updateFaculty(id, editForm);
      else if (type === 'departments') await updateDepartment(id, editForm);
      else if (type === 'classes') await updateClass(id, editForm);
      else if (type === 'halls') {
        const payload = { name: editForm.name, capacity: Number(editForm.capacity), class: editForm.classId, campus: editForm.campusId };
        await updateHall(id, payload);
      }
      toast.success('Updated successfully');
      setEditItem(null);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setIsEditLoading(false);
    }
  };

  // Delete Handlers
  const openDelete = (item, type) => setDeleteTarget({ id: item._id, name: item.name, type });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleteLoading(true);
    try {
      const { id, type } = deleteTarget;
      if (type === 'campuses') await deleteCampus(id);
      else if (type === 'faculties') await deleteFaculty(id);
      else if (type === 'departments') await deleteDepartment(id);
      else if (type === 'classes') await deleteClass(id);
      else if (type === 'halls') await deleteHall(id);
      toast.success('Deleted successfully');
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const fetchClassStudents = async (classId) => {
    setIsStudentsLoading(true);
    try {
      const res = await getClassStudents(classId);
      const payload = res?.data || res || {};
      const students = payload.students || [];
      setStudentsList(students);
      setSelectedClassTotalStudents(payload.totalStudents ?? students.length);
      setSelectedClassHall(payload.hall || payload.classInfo?.hall || null);
      if (payload.classInfo) {
        setSelectedClass(payload.classInfo);
      }
    } catch (err) {
      toast.error('Failed to load class students');
      console.error(err);
    } finally {
      setIsStudentsLoading(false);
    }
  };

  const handleInspectClass = async (c) => {
    setSelectedClass(c);
    setIsInspectOpen(true);
    await fetchClassStudents(c._id);
  };

  const handleAssignClassLeader = async (studentUserId) => {
    if (!selectedClass) return;
    setIsActionLoading(true);
    try {
      const res = await assignClassLeader(selectedClass._id, studentUserId);
      toast.success(res?.message || 'Class Leader assigned successfully');
      await fetchClassStudents(selectedClass._id);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign Class Leader');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filter lists based on search query
  const getFilteredData = () => {
    const query = searchQuery.toLowerCase().trim();
    if (activeTab === 'campuses') {
      return campuses.filter(c => c.name.toLowerCase().includes(query));
    } else if (activeTab === 'faculties') {
      return faculties.filter(f => f.name.toLowerCase().includes(query) || (f.description && f.description.toLowerCase().includes(query)));
    } else if (activeTab === 'departments') {
      return departments.filter(d =>
        d.name.toLowerCase().includes(query) ||
        (d.faculty && d.faculty.name.toLowerCase().includes(query))
      );
    } else if (activeTab === 'classes') {
      return classes.filter(c =>
        c.name.toLowerCase().includes(query) ||
        (c.department && c.department.name.toLowerCase().includes(query)) ||
        (c.faculty && c.faculty.name.toLowerCase().includes(query)) ||
        (c.academicYear && c.academicYear.toLowerCase().includes(query))
      );
    } else {
      return halls.filter(h => {
        const matchesSearch =
          h.name.toLowerCase().includes(query) ||
          (h.classes && h.classes.some(c => c.name.toLowerCase().includes(query))) ||
          (h.campus && h.campus.name.toLowerCase().includes(query));
        const matchesCampus = !hallCampusFilter ||
          (h.campus && (h.campus._id === hallCampusFilter || h.campus === hallCampusFilter));
        return matchesSearch && matchesCampus;
      });
    }
  };

  const filteredItems = getFilteredData();

  const getSectionTitle = () => {
    switch (activeTab) {
      case 'campuses': return 'Campus Registration';
      case 'faculties': return 'Faculty Management';
      case 'departments': return 'Department Registration';
      case 'halls': return 'Hall Registration';
      case 'classes': return 'Class Registration';
      default: return 'University Management';
    }
  };

  const getSectionDescription = () => {
    switch (activeTab) {
      case 'campuses': return 'Manage all campuses structure and locations';
      case 'faculties': return 'Configure educational faculties within the university';
      case 'departments': return 'Define organizational departments under faculties';
      case 'halls': return 'Register lecture halls, study rooms, and maximum capacities';
      case 'classes': return 'Structure classes, academic sessions, and design leaders';
      default: return 'Manage university structure and registrations';
    }
  };

  const getRegisterButtonLabel = () => {
    switch (activeTab) {
      case 'campuses': return 'Register New Campus';
      case 'faculties': return 'Register New Faculty';
      case 'departments': return 'Register New Department';
      case 'halls': return 'Register New Hall';
      case 'classes': return 'Register New Class';
      default: return 'Add Record';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 sm:p-8 animate-fadeIn">
      {/* Redesigned Header Area (like UserManagement) */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{getSectionTitle()}</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">{getSectionDescription()}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
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

      {/* Tabs Menu Section in exact requested sequence: Campuses -> Faculties -> Departments -> Halls -> Classes */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => { setActiveTab('campuses'); setSearchQuery(''); setHallCampusFilter(''); }}
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all duration-200 ${activeTab === 'campuses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            1. Campus Registration
          </button>
          <button
            onClick={() => { setActiveTab('faculties'); setSearchQuery(''); setHallCampusFilter(''); }}
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all duration-200 ${activeTab === 'faculties'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            2. Faculty Management
          </button>
          <button
            onClick={() => { setActiveTab('departments'); setSearchQuery(''); setHallCampusFilter(''); }}
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all duration-200 ${activeTab === 'departments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            3. Department Registration
          </button>
          <button
            onClick={() => { setActiveTab('halls'); setSearchQuery(''); }}
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all duration-200 ${activeTab === 'halls'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            4. Hall Registration
          </button>
          <button
            onClick={() => { setActiveTab('classes'); setSearchQuery(''); setHallCampusFilter(''); }}
            className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all duration-200 ${activeTab === 'classes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            5. Class Registration
          </button>
        </nav>
      </div>

      {/* Dynamic Search Ribbon */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm mb-6 flex items-end gap-4">
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Search {getSectionTitle()}</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all placeholder:text-gray-400"
              placeholder={`Search by name...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {activeTab === 'halls' && (
          <div className="w-64">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Filter by Campus</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              <select
                value={hallCampusFilter}
                onChange={(e) => setHallCampusFilter(e.target.value)}
                className="block w-full pl-10 pr-8 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700 appearance-none cursor-pointer"
              >
                <option value="">All Campuses</option>
                {campuses.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Excel-style table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-20 text-sm font-semibold text-gray-400">Loading university data...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2m16 4h-2a2 2 0 00-2 2v1a2 2 0 002 2h2a2 2 0 002-2v-1a2 2 0 00-2-2z" />
                </svg>
              </div>
              <h4 className="text-sm font-black text-gray-700 mb-1">No structures registered</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {searchQuery ? 'Adjust your search query or clear filters to locate matches.' : `Start by registering your first ${activeTab.substring(0, activeTab.length - 1)}.`}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {activeTab === 'campuses' && (
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Campus Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Coordinates</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Radius</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">QR Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date Registered</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                )}
                {activeTab === 'faculties' && (
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Faculty Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date Registered</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                )}
                {activeTab === 'departments' && (
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Associated Faculty</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date Registered</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                )}
                {activeTab === 'halls' && (
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hall Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Campus</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Capacity</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Class</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date Registered</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                )}
                {activeTab === 'classes' && (
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department & Faculty</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Hall</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date Registered</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                )}
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-sm font-semibold text-gray-700">
                {/* ... */}
                {activeTab === 'campuses' && filteredItems.map((c, index) => (
                  <tr key={c._id} className="hover:bg-indigo-50/30 transition-colors cursor-pointer">
                    <td className="px-6 py-4 text-gray-500 font-bold w-16">{index + 1}</td>
                    <td className="px-6 py-4 text-gray-900 font-bold">{c.name}</td>
                    <td className="px-6 py-4">
                      {c.locationLink ? (
                        <a href={c.locationLink} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-semibold transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          View Map
                        </a>
                      ) : <span className="text-gray-300 italic text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                      {c.latitude != null && c.longitude != null
                        ? <span className="text-gray-700">{Number(c.latitude).toFixed(6)}, {Number(c.longitude).toFixed(6)}</span>
                        : <span className="text-gray-300 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 font-semibold">
                      {c.radius != null ? `${c.radius} m` : <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {c.qrExpiresAt ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${new Date() < new Date(c.qrExpiresAt)
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${new Date() < new Date(c.qrExpiresAt) ? 'bg-green-500' : 'bg-red-500'}`} />
                          {new Date() < new Date(c.qrExpiresAt) ? 'QR Active' : 'QR Expired'}
                        </span>
                      ) : <span className="text-gray-300 italic text-xs">No QR</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">{new Date(c.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={async () => {
                            setIsQRLoading(true);
                            setIsQRModalOpen(true);
                            try {
                              const qrData = await getCampusQR(c._id);
                              setSelectedCampusQR(qrData);
                            } catch {
                              toast.error('Failed to load campus QR code');
                              setIsQRModalOpen(false);
                            } finally {
                              setIsQRLoading(false);
                            }
                          }}
                          className="p-1.5 bg-violet-50/60 border border-violet-100 hover:border-violet-300 text-violet-600 hover:text-violet-800 rounded-lg transition-all"
                          title="View QR Code"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                        </button>
                        <button onClick={() => openEdit(c, 'campuses')} className="p-1.5 bg-indigo-50/50 border border-indigo-100/50 hover:border-indigo-205 text-indigo-600 hover:text-indigo-800 rounded-lg transition-all" title="Edit"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => openDelete(c, 'campuses')} className="p-1.5 bg-red-50/50 border border-red-100/50 hover:border-red-200 text-red-500 hover:text-red-700 rounded-lg transition-all" title="Delete"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeTab === 'faculties' && filteredItems.map((f, index) => (
                  <tr key={f._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-bold w-16">{index + 1}</td>
                    <td className="px-6 py-4 text-gray-900 font-bold">{f.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-medium max-w-xs truncate">{f.description || <span className="text-gray-300 italic">No description</span>}</td>
                    <td className="px-6 py-4 text-xs text-gray-400">{new Date(f.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(f, 'faculties')} className="p-1.5 bg-indigo-50/50 border border-indigo-100/50 hover:border-indigo-205 text-indigo-600 hover:text-indigo-800 rounded-lg transition-all" title="Edit"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => openDelete(f, 'faculties')} className="p-1.5 bg-red-50/50 border border-red-100/50 hover:border-red-200 text-red-500 hover:text-red-700 rounded-lg transition-all" title="Delete"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeTab === 'departments' && filteredItems.map((d, index) => (
                  <tr key={d._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-bold w-16">{index + 1}</td>
                    <td className="px-6 py-4 text-gray-900 font-bold">{d.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {d.faculty?.name || 'Unknown Faculty'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium max-w-xs truncate">{d.description || <span className="text-gray-300 italic">No description</span>}</td>
                    <td className="px-6 py-4 text-xs text-gray-400">{new Date(d.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(d, 'departments')} className="p-1.5 bg-indigo-50/50 border border-indigo-100/50 hover:border-indigo-205 text-indigo-600 hover:text-indigo-800 rounded-lg transition-all" title="Edit"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => openDelete(d, 'departments')} className="p-1.5 bg-red-50/50 border border-red-100/50 hover:border-red-200 text-red-500 hover:text-red-700 rounded-lg transition-all" title="Delete"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeTab === 'halls' && filteredItems.map((h, index) => (
                  <tr key={h._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-bold w-16">{index + 1}</td>
                    <td className="px-6 py-4 text-gray-900 font-bold">{h.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-semibold">
                      {h.campus ? h.campus.name : (h.location || <span className="text-gray-300 italic">No campus</span>)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-150 text-gray-800 border border-gray-200 text-xs font-mono font-bold">
                        {h.capacity || <span className="text-gray-300 italic">N/A</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {h.classes && h.classes.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {h.classes.map(cls => (
                            <span key={cls._id} className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
                              {cls.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-305 italic text-xs font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">{new Date(h.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(h, 'halls')} className="p-1.5 bg-indigo-50/50 border border-indigo-100/50 hover:border-indigo-205 text-indigo-600 hover:text-indigo-800 rounded-lg transition-all" title="Edit"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => openDelete(h, 'halls')} className="p-1.5 bg-red-50/50 border border-red-100/50 hover:border-red-200 text-red-500 hover:text-red-700 rounded-lg transition-all" title="Delete"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeTab === 'classes' && filteredItems.map((c, index) => (
                  <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-bold w-16">{index + 1}</td>
                    <td className="px-6 py-4 text-gray-900 font-bold">{c.name}</td>
                    <td className="px-6 py-4 space-y-0.5">
                      <span className="block font-bold text-gray-700 text-xs">{c.department?.name || 'Unknown Department'}</span>
                      <span className="block text-[10px] text-gray-400 font-medium">{c.faculty?.name || 'Unknown Faculty'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {c.hall ? (
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
                          {c.hall.name}
                        </span>
                      ) : (
                        <span className="text-gray-300 italic text-xs font-medium">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">{new Date(c.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleInspectClass(c)} className="p-1.5 bg-gray-50 border border-gray-100 hover:border-gray-200 text-gray-650 hover:text-gray-900 rounded-lg transition-all" title="Inspect Class / Students"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                        <button onClick={() => openEdit(c, 'classes')} className="p-1.5 bg-indigo-50/50 border border-indigo-100/50 hover:border-indigo-205 text-indigo-600 hover:text-indigo-800 rounded-lg transition-all" title="Edit"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => openDelete(c, 'classes')} className="p-1.5 bg-red-50/50 border border-red-100/50 hover:border-red-200 text-red-500 hover:text-red-700 rounded-lg transition-all" title="Delete"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── CREATE MODAL (like UserManagement) ────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-650 bg-gray-600 opacity-60 transition-opacity" onClick={() => setIsCreateOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 z-10 animate-scaleUp">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">{getRegisterButtonLabel()}</h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-50 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {activeTab === 'campuses' && (
                <form onSubmit={handleCampusSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Campus Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Main Campus"
                      value={campusForm.name}
                      onChange={(e) => setCampusForm({ ...campusForm, name: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Location Link (Google Maps URL)</label>
                    <input
                      type="url"
                      placeholder="https://maps.app.goo.gl/..."
                      value={campusForm.locationLink}
                      onChange={(e) => setCampusForm({ ...campusForm, locationLink: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g., 2.047300"
                        value={campusForm.latitude}
                        onChange={(e) => setCampusForm({ ...campusForm, latitude: e.target.value })}
                        className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g., 45.344800"
                        value={campusForm.longitude}
                        onChange={(e) => setCampusForm({ ...campusForm, longitude: e.target.value })}
                        className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Allowed Radius (meters)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g., 120"
                      value={campusForm.radius}
                      onChange={(e) => setCampusForm({ ...campusForm, radius: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                    />
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-2.5 border border-gray-250 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                    <button type="submit" disabled={isActionLoading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50">
                      {isActionLoading ? 'Saving...' : 'Register Campus'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'faculties' && (
                <form onSubmit={handleFacultySubmit} className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Faculty Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Faculty of Computer Science"
                      value={facultyForm.name}
                      onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Description</label>
                    <textarea
                      placeholder="Enter description..."
                      value={facultyForm.description}
                      onChange={(e) => setFacultyForm({ ...facultyForm, description: e.target.value })}
                      rows={3}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700 resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-2.5 border border-gray-250 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                    <button type="submit" disabled={isActionLoading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50">
                      {isActionLoading ? 'Saving...' : 'Register Faculty'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'departments' && (
                <form onSubmit={handleDeptSubmit} className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Parent Faculty *</label>
                    <select
                      value={deptForm.facultyId}
                      onChange={(e) => setDeptForm({ ...deptForm, facultyId: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      required
                    >
                      <option value="" disabled>Select Faculty</option>
                      {faculties.map(f => (
                        <option key={f._id} value={f._id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Department Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Software Engineering"
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Description</label>
                    <textarea
                      placeholder="Enter description..."
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                      rows={2}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700 resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-2.5 border border-gray-250 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                    <button type="submit" disabled={isActionLoading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50">
                      {isActionLoading ? 'Saving...' : 'Register Department'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'halls' && (
                <form onSubmit={handleHallSubmit} className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Hall Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Auditorium A"
                      value={hallForm.name}
                      onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Capacity *</label>
                    <input
                      type="number"
                      placeholder="e.g., 150"
                      value={hallForm.capacity}
                      onChange={(e) => setHallForm({ ...hallForm, capacity: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Assign Campus *</label>
                    <select
                      value={hallForm.campusId}
                      onChange={(e) => setHallForm({ ...hallForm, campusId: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      required
                    >
                      <option value="" disabled>Select Campus</option>
                      {campuses.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-2.5 border border-gray-250 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                    <button type="submit" disabled={isActionLoading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50">
                      {isActionLoading ? 'Saving...' : 'Register Hall'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'classes' && (
                <form onSubmit={handleClassSubmit} className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Associated Department *</label>
                    <select
                      value={classForm.departmentId}
                      onChange={(e) => setClassForm({ ...classForm, departmentId: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      required
                    >
                      <option value="" disabled>Select Department</option>
                      {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.name} ({d.faculty?.name || 'Faculty Office'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Class Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., CS 2026 A"
                      value={classForm.name}
                      onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Campus *</label>
                    <select
                      value={classForm.campusId}
                      onChange={(e) => setClassForm({ ...classForm, campusId: e.target.value, hallId: '' })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      required
                    >
                      <option value="" disabled>Select Campus</option>
                      {campuses.map(camp => (
                        <option key={camp._id} value={camp._id}>{camp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Assign Hall *</label>
                    <select
                      value={classForm.hallId}
                      onChange={(e) => setClassForm({ ...classForm, hallId: e.target.value })}
                      className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                      required
                    >
                      <option value="" disabled>Select Hall</option>
                      {halls
                        .filter(h => {
                          if (classForm.campusId && (h.campus?._id || h.campus) !== classForm.campusId) {
                            return false;
                          }
                          return !h.classes || h.classes.length < 3;
                        })
                        .map(h => (
                          <option key={h._id} value={h._id}>{h.name} (Capacity: {h.capacity})</option>
                        ))
                      }
                    </select>
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-2.5 border border-gray-250 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                    <button type="submit" disabled={isActionLoading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50">
                      {isActionLoading ? 'Saving...' : 'Register Class'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL (like UserManagement) ────────────────────────────── */}
      {editItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-650 bg-gray-600 opacity-60 transition-opacity" onClick={() => setEditItem(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 z-10 animate-scaleUp">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">Edit {editItem._type === 'campuses' ? 'Campus' : editItem._type === 'faculties' ? 'Faculty' : editItem._type === 'departments' ? 'Department' : editItem._type === 'classes' ? 'Class' : 'Hall'}</h3>
                <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-50 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                {editItem._type === 'campuses' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Campus Name *</label>
                      <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Location Link (Google Maps URL)</label>
                      <input type="url" placeholder="https://maps.app.goo.gl/..." value={editForm.locationLink || ''} onChange={e => setEditForm({ ...editForm, locationLink: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Latitude</label>
                        <input type="number" step="any" placeholder="e.g., 2.047300" value={editForm.latitude ?? ''} onChange={e => setEditForm({ ...editForm, latitude: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Longitude</label>
                        <input type="number" step="any" placeholder="e.g., 45.344800" value={editForm.longitude ?? ''} onChange={e => setEditForm({ ...editForm, longitude: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Allowed Radius (meters)</label>
                      <input type="number" min="1" placeholder="e.g., 120" value={editForm.radius ?? 120} onChange={e => setEditForm({ ...editForm, radius: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" />
                    </div>
                  </>
                )}

                {editItem._type === 'faculties' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Faculty Name *</label>
                      <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Description</label>
                      <textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700 resize-none" />
                    </div>
                  </>
                )}

                {editItem._type === 'departments' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Parent Faculty *</label>
                      <select value={editForm.facultyId || ''} onChange={e => setEditForm({ ...editForm, facultyId: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" required>
                        <option value="" disabled>Select Faculty</option>
                        {faculties.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Department Name *</label>
                      <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Description</label>
                      <textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700 resize-none" />
                    </div>
                  </>
                )}

                {editItem._type === 'classes' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Associated Department *</label>
                      <select value={editForm.departmentId || ''} onChange={e => setEditForm({ ...editForm, departmentId: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" required>
                        <option value="" disabled>Select Department</option>
                        {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Class Name *</label>
                      <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Campus *</label>
                      <select
                        value={editForm.campusId || ''}
                        onChange={(e) => setEditForm({ ...editForm, campusId: e.target.value, hallId: '' })}
                        className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                        required
                      >
                        <option value="" disabled>Select Campus</option>
                        {campuses.map(camp => (
                          <option key={camp._id} value={camp._id}>{camp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Assign Hall *</label>
                      <select
                        value={editForm.hallId || ''}
                        onChange={(e) => setEditForm({ ...editForm, hallId: e.target.value })}
                        className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700"
                        required
                      >
                        <option value="" disabled>Select Hall</option>
                        {halls
                          .filter(h => {
                            if (editForm.campusId && (h.campus?._id || h.campus) !== editForm.campusId) {
                              return false;
                            }
                            return !h.classes || h.classes.length < 3 || h.classes.some(c => c._id === editItem._id || c === editItem._id);
                          })
                          .map(h => (
                            <option key={h._id} value={h._id}>{h.name} (Capacity: {h.capacity})</option>
                          ))
                        }
                      </select>
                    </div>
                  </>
                )}

                {editItem._type === 'halls' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Hall Name *</label>
                      <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Capacity *</label>
                      <input type="number" value={editForm.capacity || ''} onChange={e => setEditForm({ ...editForm, capacity: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Campus *</label>
                      <select value={editForm.campusId || ''} onChange={e => setEditForm({ ...editForm, campusId: e.target.value })} className="block w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-semibold text-gray-700" required>
                        <option value="" disabled>Select Campus</option>
                        {campuses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-3">
                  <button type="button" onClick={() => setEditItem(null)} className="flex-1 py-2.5 border border-gray-250 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                  <button type="submit" disabled={isEditLoading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50">
                    {isEditLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM DIALOG (like UserManagement) ────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-650 bg-gray-600 opacity-60" onClick={() => setDeleteTarget(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 animate-scaleUp">
              <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-base font-black text-gray-800 text-center mb-1">Delete Record</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteTarget.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-250 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={handleDeleteConfirm} disabled={isDeleteLoading} className="flex-1 py-2.5 bg-red-650 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50">
                  {isDeleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INSPECT CLASS MODAL ────────────────────────────────────────── */}
      {isInspectOpen && selectedClass && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-600 opacity-60" onClick={() => setIsInspectOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 z-10 animate-scaleUp">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500">Class Inspection</span>
                  <h3 className="text-2xl font-black text-gray-900 mt-1">{selectedClass.name}</h3>
                </div>
                <button onClick={() => setIsInspectOpen(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-50 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {isStudentsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-9 h-9 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading class info...</span>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {/* Class Name */}
                    <div className="bg-gray-50 border border-gray-200/80 rounded-xl px-5 py-4">
                      <span className="block text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1">Class Name</span>
                      <span className="block font-black text-gray-800 text-base">{selectedClass.name}</span>
                    </div>
                    {/* Assigned Hall */}
                    <div className="bg-gray-50 border border-gray-200/80 rounded-xl px-5 py-4">
                      <span className="block text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1">Assigned Lecture Hall</span>
                      <span className="block font-black text-gray-800 text-base">{selectedClassHall?.name || 'Unassigned'}</span>
                      {selectedClassHall?.campus && (
                        <span className="block text-[10px] text-gray-400 font-semibold mt-0.5">
                          {selectedClassHall.campus?.name || selectedClassHall.campus}
                        </span>
                      )}
                    </div>
                    {/* Total Students */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4">
                      <span className="block text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-1">Total Students</span>
                      <span className="block font-black text-indigo-700 text-2xl">{selectedClassTotalStudents}</span>
                    </div>
                    {/* Available Seats */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4">
                      <span className="block text-[9px] uppercase font-black tracking-widest text-emerald-500 mb-1">Available Seats</span>
                      {selectedClassHall?.capacity != null ? (
                        <>
                          <span className="block font-black text-emerald-700 text-2xl">
                            {Math.max(0, (selectedClassHall.capacity || 0) - selectedClassTotalStudents)}
                          </span>
                          <span className="block text-[10px] text-emerald-500 font-semibold mt-0.5">
                            Hall capacity: {selectedClassHall.capacity}
                          </span>
                        </>
                      ) : (
                        <span className="block font-black text-gray-400 text-sm mt-1">No hall assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Class Leader */}
                  <div className="border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4">
                    {(() => {
                      const leaderName = selectedClass.classLeader?.fullName
                        || studentsList.find(s => s.isClassLeader)?.fullName;
                      const leaderEmail = selectedClass.classLeader?.email
                        || studentsList.find(s => s.isClassLeader)?.email;
                      const leaderStudentId = selectedClass.classLeader?.studentId
                        || studentsList.find(s => s.isClassLeader)?.studentId;
                      return leaderName ? (
                        <>
                          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-base font-black flex-shrink-0">
                            {leaderName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-gray-800 text-sm">{leaderName}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 border border-amber-200">
                                Class Leader
                              </span>
                            </div>
                            {leaderStudentId && (
                              <span className="text-[10px] font-mono font-semibold text-gray-500 mt-0.5 block">ID: {leaderStudentId}</span>
                            )}
                            {leaderEmail && (
                              <span className="text-[10px] text-gray-400 font-semibold block">{leaderEmail}</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 text-gray-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase font-black tracking-widest text-gray-400 mb-0.5">Designated Leader</span>
                            <span className="font-bold text-gray-400 italic text-sm">No leader assigned</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CAMPUS QR CODE MODAL ────────────────────────────────────────── */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-600 opacity-60" onClick={() => setIsQRModalOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 animate-scaleUp">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500">Campus Access Code</span>
                  <h3 className="text-xl font-black text-gray-900 mt-1">
                    {selectedCampusQR ? selectedCampusQR.name : 'Loading...'}
                  </h3>
                </div>
                <button onClick={() => setIsQRModalOpen(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-50 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {isQRLoading || !selectedCampusQR ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-9 h-9 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Generating Secure QR...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {/* Status Badge */}
                  <div className="mb-4">
                    {new Date() < new Date(selectedCampusQR.qrExpiresAt) ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Active & Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Expired / Needs Refresh
                      </span>
                    )}
                  </div>

                  {/* QR Image Display */}
                  <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 mb-6 flex justify-center items-center shadow-inner">
                    <QRCodeSVG
                      value={selectedCampusQR.qrCode}
                      size={200}
                      level="H"
                      includeMargin={true}
                      className="rounded-lg bg-white p-2"
                    />
                  </div>

                  {/* QR Details */}
                  <div className="w-full space-y-3 mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-400">Generated At:</span>
                      <span className="text-gray-700 font-bold">{new Date(selectedCampusQR.qrGeneratedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-400">Expires At:</span>
                      <span className="text-gray-700 font-bold">{new Date(selectedCampusQR.qrExpiresAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={async () => {
                      setIsPDFLoading(true);
                      try {
                        await downloadCampusQRPDF(selectedCampusQR._id, selectedCampusQR.name);
                        toast.success('Printable PDF downloaded successfully');
                      } catch {
                        toast.error('Failed to download PDF');
                      } finally {
                        setIsPDFLoading(false);
                      }
                    }}
                    disabled={isPDFLoading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isPDFLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Generating Document...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Printable PDF
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityManagement;
