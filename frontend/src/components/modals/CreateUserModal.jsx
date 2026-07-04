import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { getFaculties, getDepartments, getClasses, getCampuses } from '../../services/api';

const generatePassword = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const CreateUserModal = ({ isOpen, onClose, onSave, availableRoles = [] }) => {
  const initialState = {
    fullName: '',
    username: '',
    password: generatePassword(),
    role: '',
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
  };

  const { user } = useAuth();
  const [formData, setFormData] = useState(initialState);
  const [photoFile, setPhotoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pwdCopied, setPwdCopied] = useState(false);
  const fileInputRef = useRef(null);

  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);

  React.useEffect(() => {
    if (isOpen) {
      setFormData({ ...initialState, password: generatePassword() });
      setPhotoFile(null);
      setImagePreview(null);
      setPwdCopied(false);
      const fetchData = async () => {
        try {
          const [facs, depts, clses, camps] = await Promise.all([
            getFaculties(),
            getDepartments(),
            getClasses(),
            getCampuses()
          ]);
          setFaculties(facs);
          setDepartments(depts);
          setClasses(clses);
          setCampuses(camps);
        } catch (err) {
          console.error('Error fetching university data:', err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (formData.faculty) {
      const filtered = departments.filter(d => {
        const fid = d.facultyId || (d.faculty && (d.faculty._id || d.faculty));
        return fid && String(fid) === String(formData.faculty);
      });
      setFilteredDepartments(filtered);
    } else {
      setFilteredDepartments([]);
    }
  }, [formData.faculty, departments]);

  React.useEffect(() => {
    if (formData.department) {
      const filtered = classes.filter(c => {
        const did = c.departmentId || (c.department && (c.department._id || c.department));
        return did && String(did) === String(formData.department);
      });
      setFilteredClasses(filtered);
    } else {
      setFilteredClasses([]);
    }
  }, [formData.department, classes]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPG, JPEG, PNG, and WEBP image files are allowed');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPhotoFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Student-specific front-end validation
      if (formData.role === 'student') {
        // Validate parentNumber: must be integer with at least 9 digits
        const pn = String(formData.parentNumber || '').replace(/\D/g, '');
        if (!pn || pn.length < 9) {
          toast.error('Parent number must be at least 9 digits');
          setIsLoading(false);
          return;
        }
        // Photo is required for students
        if (!photoFile) {
          toast.error('Student profile photo is required');
          setIsLoading(false);
          return;
        }
      }

      const submitData = new FormData();
      submitData.append('fullName', formData.fullName.trim());
      submitData.append('password', formData.password);
      submitData.append('role', formData.role);
      
      if (['staff', 'clean', 'security', 'admin'].includes(formData.role) && formData.username) {
        submitData.append('username', formData.username.trim());
      }

      if (formData.role === 'student') {
        if (formData.studentId) submitData.append('studentId', formData.studentId.trim());
        if (formData.parentNumber) submitData.append('parentNumber', formData.parentNumber);
        if (formData.faculty) submitData.append('faculty', formData.faculty);
        if (formData.department) submitData.append('department', formData.department);
        if (formData.class) submitData.append('class', formData.class);
        if (formData.academicYear) submitData.append('academicYear', formData.academicYear.trim());
        if (photoFile) {
          submitData.append('photo', photoFile);
        }
      } else if (['staff', 'clean', 'security'].includes(formData.role)) {
        if (formData.campus) submitData.append('campus', formData.campus);
        if (formData.role === 'security') {
          submitData.append('assignedShift', formData.assignedShift);
          if (formData.shiftStartTime) submitData.append('shiftStartTime', formData.shiftStartTime);
          if (formData.shiftEndTime) submitData.append('shiftEndTime', formData.shiftEndTime);
        }
      }

      await onSave(submitData);

      setFormData({ ...initialState, password: generatePassword() });
      setPhotoFile(null);
      setImagePreview(null);
      setPwdCopied(false);
    } catch {
      // Parent shows the API error toast; keep the form values for correction.
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegeneratePassword = () => {
    setFormData(prev => ({ ...prev, password: generatePassword() }));
    setPwdCopied(false);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(formData.password).then(() => {
      setPwdCopied(true);
      toast.success('Password copied!');
      setTimeout(() => setPwdCopied(false), 2000);
    });
  };

  const isStudent = formData.role === 'student';
  const roleSelected = formData.role !== '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Register New User
                  </h3>

                  <div className="space-y-4">
                    {/* Role is always selected first */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Role *</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm animate-none"
                        required
                      >
                        <option value="" disabled>Select Role</option>
                        {availableRoles.map((role) => (
                          <option key={role._id} value={role.name}>
                            {role.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {roleSelected && (
                      <div className="animate-fadeIn space-y-4 pt-2 border-t border-gray-100">
                        {isStudent && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Student ID *</label>
                              <input
                                type="text"
                                name="studentId"
                                value={formData.studentId}
                                onChange={handleChange}
                                placeholder="e.g. CS2026001"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                required={isStudent}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Parent Number * <span className="text-xs text-gray-400">(min. 9 digits)</span></label>
                              <input
                                type="number"
                                name="parentNumber"
                                value={formData.parentNumber}
                                onChange={handleChange}
                                placeholder="e.g. 252345678"
                                min="100000000"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                required={isStudent}
                              />
                              {formData.parentNumber && String(formData.parentNumber).replace(/\D/g,'').length < 9 && (
                                <p className="mt-1 text-xs text-red-500 font-medium">⚠ Must be at least 9 digits</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Faculty *</label>
                              <select
                                name="faculty"
                                value={formData.faculty || ''}
                                onChange={(e) => {
                                  setFormData({ ...formData, faculty: e.target.value, department: '', class: '' });
                                }}
                                className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                required={isStudent}
                              >
                                <option value="" disabled>Select Faculty</option>
                                {faculties.map((f) => (
                                  <option key={f._id} value={f._id}>
                                    {f.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Department *</label>
                              <select
                                name="department"
                                value={formData.department || ''}
                                onChange={(e) => {
                                  setFormData({ ...formData, department: e.target.value, class: '' });
                                }}
                                className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                required={isStudent}
                                disabled={!formData.faculty}
                              >
                                <option value="" disabled>Select Department</option>
                                {filteredDepartments.map((d) => (
                                  <option key={d._id} value={d._id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Class *</label>
                              <select
                                name="class"
                                value={formData.class || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                required={isStudent}
                                disabled={!formData.department}
                              >
                                <option value="" disabled>Select Class</option>
                                {filteredClasses.map((c) => (
                                  <option key={c._id} value={c._id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Academic Year *</label>
                              <input
                                type="text"
                                name="academicYear"
                                value={formData.academicYear}
                                onChange={handleChange}
                                placeholder="e.g. 21/22 or 2021/2022"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                required={isStudent}
                              />
                            </div>
                            
                            {/* Image Upload Field - REQUIRED for students */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Profile Photo <span className="text-red-500">*</span>
                                <span className="text-xs text-gray-400 ml-1">(required for students)</span>
                              </label>
                              <div 
                                className={`relative group cursor-pointer border-2 border-dashed rounded-xl p-4 transition-all ${
                                  imagePreview 
                                    ? 'border-indigo-500 bg-indigo-50/30' 
                                    : 'border-red-300 hover:border-indigo-400 hover:bg-gray-50 bg-red-50/30'
                                }`}
                                onClick={() => fileInputRef.current.click()}
                              >
                                <input 
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={handleImageChange}
                                  accept="image/jpeg,image/jpg,image/png,image/webp"
                                  className="hidden"
                                />
                                
                                {imagePreview ? (
                                  <div className="relative flex flex-col items-center">
                                    <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-xl shadow-md border border-gray-200" />
                                    <button 
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); removeImage(); }}
                                      className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                    <p className="mt-2 text-xs text-gray-500 truncate max-w-full px-2">{photoFile?.name}</p>
                                  </div>
                                ) : (
                                  <div className="text-center py-2">
                                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                    <p className="text-xs font-semibold text-red-600">Click to upload student photo <span className="text-red-500">(required)</span></p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG or WEBP up to 5MB</p>
                                  </div>
                                )}
                              </div>
                              {!imagePreview && <p className="mt-1 text-xs text-red-500 font-medium">⚠ A student photo is required</p>}
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
                              className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              required
                            >
                              <option value="" disabled>Select Campus</option>
                              {campuses.map((camp) => (
                                <option key={camp._id} value={camp._id}>
                                  {camp.name}
                                </option>
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
                                className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                required
                              >
                                <option value="none" disabled>Select Shift</option>
                                <option value="morning">Morning Shift</option>
                                <option value="afternoon">Afternoon Shift</option>
                              </select>
                            </div>

                            {/* Shift Time Window */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Shift Start Time</label>
                                <input
                                  type="time"
                                  name="shiftStartTime"
                                  value={formData.shiftStartTime}
                                  onChange={handleChange}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Shift End Time</label>
                                <input
                                  type="time"
                                  name="shiftEndTime"
                                  value={formData.shiftEndTime}
                                  onChange={handleChange}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                          <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          />
                        </div>

                        {['staff', 'clean', 'security', 'admin'].includes(formData.role) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Username *</label>
                            <input
                              type="text"
                              name="username"
                              value={formData.username}
                              onChange={handleChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              required
                            />
                          </div>
                        )}

                        {/* Auto-Generated Password */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="block w-full border border-indigo-200 bg-indigo-50 rounded-md shadow-sm py-2 px-3 text-sm font-mono text-indigo-800"
                              />
                            </div>
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={handleCopyPassword}
                              title="Copy password"
                              className={`flex-shrink-0 p-2 rounded-md border transition-all ${
                                pwdCopied
                                  ? 'border-green-400 bg-green-50 text-green-600'
                                  : 'border-gray-300 bg-white text-gray-500 hover:border-indigo-400 hover:text-indigo-600'
                              }`}
                            >
                              {pwdCopied ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                            {/* Regenerate button */}
                            <button
                              type="button"
                              onClick={handleRegeneratePassword}
                              title="Generate new password"
                              className="flex-shrink-0 p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">Copy this password before creating the user.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading || !roleSelected}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 transition-all"
              >
                {isLoading ? 'Creating...' : 'Create User'}
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
        </div>
      </div>
    </div>
  );
};

export default CreateUserModal;
