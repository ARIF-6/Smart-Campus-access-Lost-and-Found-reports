import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAutoRefreshSignal } from '../../context/AutoRefreshContext';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
  getStudentList
} from '../../services/api';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '../../utils/imageUtils';

/* ─────────────────────────────────────────────────────────────────────────
   Sub-component: Student Picker
   Shown inside the "Send to Specific Student" child tab.
───────────────────────────────────────────────────────────────────────── */
const StudentPicker = ({ onSelect, selected }) => {
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const fetchStudents = useCallback(async (q) => {
    setLoading(true);
    try {
      const res = await getStudentList(q);
      setStudents(Array.isArray(res) ? res : (res.data || []));
    } catch {
      toast.error('Could not load student list');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchStudents(''); }, [fetchStudents]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchStudents(val), 350);
  };

  return (
    <div className="space-y-3">
      {/* Search box */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          placeholder="Search by name or Student ID…"
          className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
        />
      </div>

      {/* Student list */}
      <div className="border border-gray-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-100 border-t-indigo-500" />
          </div>
        ) : students.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400 italic">No students found</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {students.map(s => {
              const isSelected = selected?._id === s._id;
              return (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => onSelect(isSelected ? null : s)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-indigo-50/60 ${isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden text-sm font-bold text-indigo-600">
                    {s.photoUrl
                      ? <img src={getImageUrl(s.photoUrl)} alt={s.fullName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
                      : (s.fullName?.[0] || '?').toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{s.fullName}</p>
                    <p className="text-[10px] text-gray-400 font-mono tracking-wide">
                      ID: {s.studentId || '—'}
                      {s.faculty?.name && ` · ${s.faculty.name}`}
                      {s.department?.name && ` · ${s.department.name}`}
                    </p>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs font-bold text-indigo-700">Sending to: {selected.fullName}</span>
          <button type="button" onClick={() => onSelect(null)} className="ml-auto text-indigo-400 hover:text-red-500 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Main Page Component
───────────────────────────────────────────────────────────────────────── */
const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetRoles: ['all']
  });

  // Student sub-tabs (only visible when 'student' is the sole target role)
  const [studentTab, setStudentTab] = useState('broadcast'); // 'broadcast' | 'specific'
  const [selectedStudent, setSelectedStudent] = useState(null);

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
  useEffect(() => { if (refreshKey > 0) fetchAnnouncements(); }, [refreshKey]);

  // Detect "students-only" mode
  const studentOnly =
    formData.targetRoles.length === 1 && formData.targetRoles[0] === 'student';

  const handleCreate = async (e) => {
    e.preventDefault();

    if (studentOnly && studentTab === 'specific') {
      if (!selectedStudent) {
        toast.error('Please select a student first');
        return;
      }
      try {
        await createAnnouncement({
          title: formData.title,
          message: formData.message,
          targetRoles: ['student'],
          recipientType: 'specific_student',
          recipientUserId: selectedStudent._id
        });
        toast.success(`Announcement sent to ${selectedStudent.fullName}`);
        setFormData({ title: '', message: '', targetRoles: ['all'] });
        setSelectedStudent(null);
        setStudentTab('broadcast');
        fetchAnnouncements();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to send announcement');
      }
      return;
    }

    // Broadcast / legacy path
    const payload = {
      title: formData.title,
      message: formData.message,
      targetRoles: formData.targetRoles,
      ...(studentOnly ? { recipientType: 'all_students' } : {})
    };
    try {
      await createAnnouncement(payload);
      toast.success('Announcement created successfully');
      setFormData({ title: '', message: '', targetRoles: ['all'] });
      setSelectedStudent(null);
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
    setSelectedStudent(null);
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
        {/* ── Create Announcement Form ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            Create New Announcement
          </h2>

          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
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

              {/* Target Roles */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Target Roles</label>
                <div className="flex flex-wrap gap-2">
                  {rolesOptions.map(role => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => handleRoleChange(role.value)}
                      className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest transition-all border ${formData.targetRoles.includes(role.value)
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

            {/* ── Student Child Tabs (only when Students is the sole target) ── */}
            {studentOnly && (
              <div className="border border-indigo-100 rounded-2xl overflow-hidden bg-indigo-50/40">
                {/* Tab bar */}
                <div className="flex border-b border-indigo-100">
                  <button
                    type="button"
                    onClick={() => { setStudentTab('broadcast'); setSelectedStudent(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${studentTab === 'broadcast'
                      ? 'bg-white text-indigo-700 border-b-2 border-indigo-600 shadow-sm'
                      : 'text-gray-400 hover:text-indigo-500 hover:bg-white/50'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    All Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentTab('specific')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${studentTab === 'specific'
                      ? 'bg-white text-indigo-700 border-b-2 border-indigo-600 shadow-sm'
                      : 'text-gray-400 hover:text-indigo-500 hover:bg-white/50'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Specific Student
                  </button>
                </div>

                {/* Tab content */}
                <div className="p-5">
                  {studentTab === 'broadcast' ? (
                    <div className="flex items-start gap-3 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>This announcement will be delivered to <strong>all registered students</strong>. Fill in the Title and Message below, then click <em>Post Announcement</em>.</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select a student recipient</p>
                      <StudentPicker selected={selectedStudent} onSelect={setSelectedStudent} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Message */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Message</label>
              <textarea
                required
                rows="4"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none resize-none"
                placeholder="Write your announcement details here..."
              />
            </div>

            {/* Specific-student warning if none selected */}
            {studentOnly && studentTab === 'specific' && !selectedStudent && (
              <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Please select a student from the list above before posting.
              </p>
            )}

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

        {/* ── Announcements List (unchanged) ──────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Existing Announcements</h2>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
              {announcements.length} Total
            </span>
          </div>

          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 mb-4" />
              <p className="text-gray-400 font-medium">Loading history...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-gray-400 font-medium italic">No announcements found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-5">Announcement</th>
                    <th className="px-6 py-5">Created By</th>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5">Target</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {announcements.map((ann) => (
                    <tr key={ann._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-tight">{ann.title}</h4>
                          <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap max-w-lg">{ann.message}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-gray-700">
                          {ann.createdBy?.fullName || ann.createdBy?.name || 'System Administrator'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-gray-400 font-mono">
                          {ann.createdAt ? new Date(ann.createdAt).toISOString().split('T')[0] : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          {/* Show personal badge if specific student */}
                          {ann.recipientType === 'specific_student' ? (
                            <span className="bg-violet-100 text-violet-700 text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded border border-violet-200 flex items-center gap-1">
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              Personal
                            </span>
                          ) : (
                            ann.targetRoles && ann.targetRoles.map(role => (
                              <span key={role} className="bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded border border-indigo-200">
                                {role}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDelete(ann._id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                          title="Delete Announcement"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
    </AdminLayout>
  );
};

export default AdminAnnouncements;
