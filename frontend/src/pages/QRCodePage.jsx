import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import AdminLayout from '../components/AdminLayout'; // Reusing layout for consistency
import { useNavigate } from 'react-router-dom';

const QRCodePage = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      setUser(decoded);
    } catch (e) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <AdminLayout title="My Gate Pass">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center max-w-sm w-full transition-transform hover:scale-105 duration-300">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Campus ID</h2>
          <p className="text-sm text-gray-500 mb-8 text-center font-medium">Show this QR code to security at the gate or building entrances.</p>
          
          <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            {user && user.id ? (
              <QRCodeSVG value={user.id} size={220} className="rounded-lg shadow-sm" />
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center text-gray-400">Loading...</div>
            )}
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-lg font-bold text-gray-900">{user?.name || 'Student'}</p>
            <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mt-1">Authorized Access</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default QRCodePage;
