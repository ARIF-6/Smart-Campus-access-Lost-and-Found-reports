import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFaculties, getDepartments, getClasses, getCampuses } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import TimePicker from '../common/TimePicker';

const EditUserModal = ({ isOpen, onClose, user, onSave, availableRoles = [] }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
  fullName: '',
  username: '',
  email: '',
  password: '',
  role: '',
  phone: '',
  address: '',
  studentId: '',
  parentNumber: '',
  qrCode: '',
  photoUrl: '',
  faculty: '',
  department: '',
  class: '',
  academicYear: '',
  campus: '',
  assignedShift: 'none',
  shiftStartTime: '',
  shiftEndTime: ''
});
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const photoInputRef = React.useRef(null);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        fullName: user.fullName || user.name || '',
        username: user.username || '',
        email: user.email || '',
        role: user.role || '',
        phone: user.phone || '',
        address: user.address || '',
        studentId: user.studentId || '',
        parentNumber: user.parentNumber || '',
        qrCode: user.qrCode || '',
        photoUrl: user.photoUrl || '',
        faculty: user.faculty ? (typeof user.faculty === 'object' ? user.faculty._id : user.faculty) : '',
        department: user.department ? (typeof user.department === 'object' ? user.department._id : user.department) : '',
        class: user.class ? (typeof user.class === 'object' ? user.class._id : user.class) : '',
        academicYear: user.academicYear || '',
        campus: user.campus ? (typeof user.campus === 'object' ? user.campus._id : user.campus) : '',
        assignedShift: user.assignedShift || 'none',
        shiftStartTime: user.shiftStartTime || '',
        shiftEndTime: user.shiftEndTime || ''
      });
      setPhotoFile(null);
      setPhotoPreview('');
      // Load university data
      const fetchData = async () => {
        try {
          const [facs, depts, cls, camps] = await Promise.all([
            getFaculties(),
            getDepartments(),
            getClasses(),
            getCampuses()
          ]);
          setFaculties(facs);
          setDepartments(depts);
          setClasses(cls);
          setCampuses(camps);
        } catch (err) {
          console.error('Error fetching university data:', err);
        }
      };
      fetchData();
    }
  }, [user, isOpen]);



  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (formData.faculty) {
      const filtered = departments.filter(d => d.faculty && (d.faculty._id === formData.faculty || d.faculty === formData.faculty));
      setFilteredDepartments(filtered);
    } else {
      setFilteredDepartments([]);
    }
  }, [formData.faculty, departments]);

  useEffect(() => {
    if (formData.department) {
      const filtered = classes.filter(c => c.department && (c.department._id === formData.department || c.department === formData.department));
      setFilteredClasses(filtered);
    } else {
      setFilteredClasses([]);
    }
  }, [formData.department, classes]);

  // Guard: render nothing when modal is closed or user data missing
  if (!isOpen || !user) {
    return null;
  }
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);

  // Build either FormData (when photo chosen) or plain object
  let payload;
  if (photoFile) {
    payload = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      if (v !== undefined && v !== null) payload.append(k, v);
    });
    payload.append('photo', photoFile);
  } else {
    payload = { ...formData };
  }

  const submitData = photoFile ? payload : { ...formData };

  // Clear student-only fields when not a student
  if (!photoFile) {
    if (submitData.role !== 'student') {
      submitData.studentId = '';
      submitData.faculty = '';
      submitData.department = '';
      submitData.class = '';
      submitData.academicYear = '';
      submitData.qrCode = '';
      submitData.photoUrl = '';
    }
    if (!['staff', 'clean', 'security'].includes(submitData.role)) {
      submitData.campus = '';
    }
    if (submitData.role !== 'security') {
      submitData.assignedShift = 'none';
      submitData.shiftStartTime = '';
      submitData.shiftEndTime = '';
    }
  }

  try {
    await onSave(user._id, photoFile ? payload : submitData);
  } catch (err) {
    console.error('Error updating user:', err);
  } finally {
    setIsLoading(false);
  }
};

  const isStudent = formData.role === 'student';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          {currentUser?.role === 'staff' && user?.role === 'admin' ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-500 mb-6">Staff members are not authorized to edit Administrator accounts.</p>
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Edit User Profile
                    </h3>

                    <div className="space-y-4">
                      {/* Role Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Account Role *</label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          required
                        >
                          {availableRoles.map((role) => (
                            <option key={role._id} value={role.name}>
                              {role.displayName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="animate-fadeIn space-y-4 pt-2 border-t border-gray-100">
                        {isStudent && (
                          <>
                            {/* Photo Upload Section */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Student Photo</label>
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0">
                                  {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                  ) : formData.photoUrl ? (
                                    <img
                                      src={getImageUrl(formData.photoUrl)}
                                      alt={formData.fullName}
                                      className="w-full h-full object-cover"
                                      onError={e => { e.target.style.display='none'; }}
                                    />
                                  ) : (
                                    <span className="text-lg font-black text-indigo-600">
                                      {(formData.fullName || '?')[0].toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <input
                                    ref={photoInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => {
                                      const f = e.target.files[0];
                                      if (f) {
                                        setPhotoFile(f);
                                        setPhotoPreview(URL.createObjectURL(f));
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    className="px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-all"
                                  >
                                    {formData.photoUrl || photoPreview ? 'Change Photo' : 'Upload Photo'}
                                  </button>
                                  {(photoFile || photoPreview) && (
                                    <button
                                      type="button"
                                      onClick={() => { setPhotoFile(null); setPhotoPreview(''); }}
                                      className="px-3 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Student ID *</label>
                              <input
                                type="text"
                                name="studentId"
                                value={formData.studentId}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required={isStudent}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Faculty *</label>
                              <select
                                name="faculty"
                                value={formData.faculty || ''}
                                onChange={e => {
                                  setFormData({ ...formData, faculty: e.target.value, department: '', class: '' });
                                }}
                                className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required={isStudent}
                              >
                                <option value="" disabled>Select Faculty</option>
                                {faculties.map(f => (
                                  <option key={f._id} value={f._id}>{f.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Department *</label>
                              <select
                                name="department"
                                value={formData.department || ''}
                                onChange={e => {
                                  setFormData({ ...formData, department: e.target.value, class: '' });
                                }}
                                className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required={isStudent}
                                disabled={!formData.faculty}
                              >
                                <option value="" disabled>Select Department</option>
                                {filteredDepartments.map(d => (
                                  <option key={d._id} value={d._id}>{d.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Class *</label>
                              <select
                                name="class"
                                value={formData.class || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required={isStudent}
                                disabled={!formData.department}
                              >
                                <option value="" disabled>Select Class</option>
                                {filteredClasses.map(c => (
                                  <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Academic Year *</label>
                              <input
                                type="text"
                                name="academicYear"
                                value={formData.academicYear || ''}
                                onChange={handleChange}
                                placeholder="e.g. 21/22 or 2021/2022"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required={isStudent}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Parent Number <span className="text-xs text-gray-400">(min. 9 digits)</span></label>
                              <input
                                type="number"
                                name="parentNumber"
                                value={formData.parentNumber || ''}
                                onChange={handleChange}
                                placeholder="e.g. 252345678"
                                min="100000000"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              {formData.parentNumber && String(formData.parentNumber).replace(/\D/g,'').length < 9 && (
                                <p className="mt-1 text-xs text-red-500 font-medium">⚠ Must be at least 9 digits</p>
                              )}
                            </div>
                          </>
                        )}

                        {['staff', 'clean', 'security'].includes(formData.role) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Assigned Campus *</label>
                            <select
                              name="campus"
                              value={formData.campus || ''}
                              onChange={handleChange}
                              className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              required
                            >
                              <option value="" disabled>Select Campus</option>
                              {campuses.map(camp => (
                                <option key={camp._id} value={camp._id}>{camp.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {formData.role === 'security' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Assigned Shift *</label>
                              <select
                                name="assignedShift"
                                value={formData.assignedShift}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required
                              >
                                <option value="none" disabled>Select Shift</option>
                                <option value="morning">Morning Shift</option>
                                <option value="afternoon">Afternoon Shift</option>
                              </select>
                            </div>

                            {/* Shift Time Window */}
                            <div className="grid grid-cols-2 gap-3">
                              <TimePicker
                                label="Shift Start Time"
                                name="shiftStartTime"
                                value={formData.shiftStartTime}
                                onChange={(fieldName, val) => setFormData(prev => ({ ...prev, [fieldName]: val }))}
                              />
                              <TimePicker
                                label="Shift End Time"
                                name="shiftEndTime"
                                value={formData.shiftEndTime}
                                onChange={(fieldName, val) => setFormData(prev => ({ ...prev, [fieldName]: val }))}
                              />
                            </div>
                          </>
                        )}

                        {['staff', 'clean', 'security'].includes(formData.role) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Username</label>
                            <input
                              type="text"
                              name="username"
                              value={formData.username || ''}
                              onChange={handleChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                          <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            required
                          />
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 transition-all"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
