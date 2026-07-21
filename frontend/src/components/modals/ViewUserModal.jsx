import React, { useState } from 'react';
import { getImageUrl } from '../../utils/imageUtils';
import { resetDeviceRegistration, changeDeviceRegistrationStatus } from '../../services/api';
import toast from 'react-hot-toast';

// Helper: convert "HH:mm" to 12-hour AM/PM format
const to12h = (timeStr) => {
  if (!timeStr) return '-';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
};

const ViewUserModal = ({ isOpen, onClose, user, allRoles = [], availableRoles = [], viewerRole }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [use12h, setUse12h] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [updatingDeviceStatus, setUpdatingDeviceStatus] = useState(false);

  const [localUser, setLocalUser] = useState(user);
  if (isOpen && localUser !== user) {
    setLocalUser(user);
  }

  if (!isOpen || !user) return null;

  const deviceRegistrationStatus = localUser.deviceRegistrationStatus || 'Active';
  const isDeviceRegistered = localUser.isActivated && localUser.deviceId;

  const handleResetDevice = async () => {
    if (!window.confirm("Are you sure you want to reset this student's device registration? They will need to log in again on their new device.")) return;
    setResetting(true);
    try {
      await resetDeviceRegistration(localUser._id);
      toast.success('Device registration reset successfully!');
      setLocalUser(prev => ({
        ...prev,
        isActivated: false,
        deviceId: null,
        deviceRegistrationStatus: 'Active'
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset device registration.');
    } finally {
      setResetting(false);
    }
  };

  const handleDeviceStatusChange = async (nextStatus) => {
    if (nextStatus === deviceRegistrationStatus) return;

    const confirmMessage = nextStatus === 'Inactive'
      ? "Setting device registration to Inactive will clear the student's registered device. Continue?"
      : "Setting device registration to Active will allow the student to register a new device on their next login. Continue?";

    if (!window.confirm(confirmMessage)) return;

    setUpdatingDeviceStatus(true);
    try {
      const res = await changeDeviceRegistrationStatus(localUser._id, nextStatus);
      toast.success(`Device registration status updated to ${nextStatus}.`);
      setLocalUser(prev => ({
        ...prev,
        ...res,
        deviceRegistrationStatus: nextStatus,
        isActivated: res.isActivated ?? (nextStatus === 'Active' && prev.deviceId ? prev.isActivated : false),
        deviceId: res.deviceId ?? (nextStatus === 'Inactive' ? null : prev.deviceId)
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update device registration status.');
    } finally {
      setUpdatingDeviceStatus(false);
    }
  };

  const nonAdminRoles = ['student', 'security', 'clean', 'staff'];
  const staffVisibleRoles = ['student', 'security', 'clean'];

  const canSeePassword = (
    viewerRole === 'admin' && nonAdminRoles.includes(localUser.role)
  ) || (
    viewerRole === 'staff' && staffVisibleRoles.includes(localUser.role)
  );

  const passwordLabel = {
    student: 'Student Password',
    security: 'Security Password',
    clean: 'Cleaner Password',
    staff: 'Staff Password',
  }[localUser.role] || 'Password';

  const getRoleDisplayName = (roleName) => {
    const role = allRoles.find(r => r.name === roleName) || availableRoles.find(r => r.name === roleName);
    return role?.displayName || roleName;
  };

  const getProfileImageUrl = (path) => {
    return getImageUrl(path);
  };

  const getAcademicDisplay = (value, fallbackLabel) => {
    if (!value) return '-';
    if (typeof value === 'object') return value.name || '-';
    return /^[0-9a-fA-F]{24}$/.test(String(value)) ? `Unknown ${fallbackLabel}` : value;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-600 opacity-60 backdrop-blur-sm"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-middle bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-gray-100">
          
          <div className="relative bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-6 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-xl shadow-lg">
                {(localUser.fullName || localUser.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Complete User Information</h3>
                <p className="text-white/70 text-xs font-semibold">Account Clearance: {getRoleDisplayName(localUser.role)}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-4 bg-gray-50/50">
            
            {localUser.photoUrl && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2 w-full text-left">Profile Photo</span>
                <div className="h-32 w-32 rounded-2xl overflow-hidden border border-gray-100 shadow-inner flex items-center justify-center bg-gray-50">
                  <img src={getProfileImageUrl(localUser.photoUrl)} alt={localUser.fullName || localUser.name} className="h-full w-full object-cover animate-fadeIn" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Full Name</span>
              <span className="text-sm font-bold text-gray-800">{localUser.fullName || localUser.name || '-'}</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm font-medium">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                {localUser.role === 'student' ? 'Student ID (Login)' : localUser.email ? 'Email Address' : 'Username (Login)'}
              </span>
              <span className="text-sm font-bold text-indigo-600 break-all">
                {localUser.role === 'student' ? (localUser.studentId || '-') : (localUser.email || localUser.username || '-')}
              </span>
            </div>

            {localUser.role === 'student' && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3 animate-fadeIn">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block border-b border-gray-50 pb-1.5">Academic Details</span>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Student ID</span>
                    <span className="font-bold text-gray-800">{localUser.studentId || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Faculty</span>
                    <span className="font-bold text-gray-800">{getAcademicDisplay(localUser.faculty, 'Faculty')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Department</span>
                    <span className="font-bold text-gray-800">{getAcademicDisplay(localUser.department, 'Department')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Class</span>
                    <span className="font-bold text-gray-800">{getAcademicDisplay(localUser.class, 'Class')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Academic Year</span>
                    <span className="font-bold text-gray-800">{localUser.academicYear || '-'}</span>
                  </div>
                  {localUser.parentNumber && (
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Parent Contact Number</span>
                      <span className="font-bold text-gray-800">{localUser.parentNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {localUser.role === 'student' && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3 animate-fadeIn">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block border-b border-gray-50 pb-1.5">Mobile Device Registration</span>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Registration Status</span>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      deviceRegistrationStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {deviceRegistrationStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Device Bound</span>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isDeviceRegistered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isDeviceRegistered ? 'Registered' : 'Not Registered'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Registered Device ID</span>
                    <span className="font-mono font-semibold text-gray-650 break-all bg-gray-50 px-2 py-1 rounded block border border-gray-100">
                      {localUser.deviceId || 'No device registered yet'}
                    </span>
                  </div>
                </div>

                {viewerRole === 'admin' && (
                  <div className="space-y-3 border-t border-gray-50 pt-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-2">Device Registration Status</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeviceStatusChange('Active')}
                          disabled={updatingDeviceStatus || deviceRegistrationStatus === 'Active'}
                          className={`flex-1 px-3 py-2 font-bold text-xs rounded-lg transition-all border flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                            deviceRegistrationStatus === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'
                          }`}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeviceStatusChange('Inactive')}
                          disabled={updatingDeviceStatus || deviceRegistrationStatus === 'Inactive'}
                          className={`flex-1 px-3 py-2 font-bold text-xs rounded-lg transition-all border flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                            deviceRegistrationStatus === 'Inactive'
                              ? 'bg-gray-200 text-gray-700 border-gray-300'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          Inactive
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">
                        Set to Inactive to clear the registered device. Set back to Active to allow the student to register a new device on next login.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetDevice}
                      disabled={resetting}
                      className="w-full px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition-all border border-rose-100 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {resetting ? 'Resetting...' : 'Reset Device Registration'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {localUser.role === 'security' && (localUser.assignedShift && localUser.assignedShift !== 'none') && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-50 pb-1.5">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Shift Details</span>
                  <button
                    type="button"
                    onClick={() => setUse12h(v => !v)}
                    className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all ${
                      use12h
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {use12h ? 'AM/PM' : '24H'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Assigned Shift</span>
                    <span className="font-bold text-gray-800 capitalize">{localUser.assignedShift} Shift</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Start Time</span>
                    <span className="font-bold text-gray-800">
                      {use12h ? to12h(localUser.shiftStartTime) : (localUser.shiftStartTime || '-')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">End Time</span>
                    <span className="font-bold text-gray-800">
                      {use12h ? to12h(localUser.shiftEndTime) : (localUser.shiftEndTime || '-')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {canSeePassword && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{passwordLabel}</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-mono font-bold text-gray-800 bg-gray-50 px-2.5 py-1 rounded border border-gray-100">
                    {showPassword ? (localUser.plainPassword || 'No plain text password') : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest px-2 py-1 rounded hover:bg-indigo-50"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="bg-gray-100 px-6 py-4 flex justify-end border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold text-sm rounded-xl transition-all shadow-sm"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ViewUserModal;
