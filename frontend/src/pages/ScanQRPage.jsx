import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';

const ScanQRPage = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);

  const handleScan = async (text) => {
    // Prevent double scanning immediately
    if (text === lastScanned || loading) return;
    
    setLastScanned(text);
    setLoading(true);

    try {
      // Direct axios call via the configured api instance
      const response = await api.post('/access/scan', { userId: text });
      
      setResult({
        type: 'success',
        status: response.data.status,
        message: response.data.message
      });
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.message || 'Invalid QR Code'
      });
    } finally {
      // Reset scanning delay
      setTimeout(() => {
        setLoading(false);
        setLastScanned(null);
      }, 3000);
    }
  };

  return (
    <AdminLayout title="Access Scanner">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Camera Feed */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Live Camera
          </h2>
          <div className="w-full h-[400px] bg-black rounded-2xl overflow-hidden relative shadow-inner">
            <Scanner 
              onResult={(text) => handleScan(text)} 
              onError={(error) => console.log(error?.message)}
              options={{ delayBetweenScanSuccess: 3000 }}
            />
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                <p className="text-white font-bold tracking-widest text-sm uppercase">Processing</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center font-medium">Position the student's QR code completely within the frame.</p>
        </div>

        {/* Result Output */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Scan Result</h2>
            
            {result ? (
              <div className={`p-8 rounded-2xl flex flex-col items-center text-center transition-all ${
                result.type === 'success' && result.status === 'IN' ? 'bg-green-50 border-2 border-green-200' :
                result.type === 'success' && result.status === 'OUT' ? 'bg-yellow-50 border-2 border-yellow-200' :
                'bg-red-50 border-2 border-red-200'
              }`}>
                {result.type === 'success' && result.status === 'IN' && (
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                )}
                {result.type === 'success' && result.status === 'OUT' && (
                  <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </div>
                )}
                {result.type === 'error' && (
                  <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                )}
                
                <h3 className={`text-2xl font-black mb-2 ${
                  result.type === 'success' && result.status === 'IN' ? 'text-green-800' :
                  result.type === 'success' && result.status === 'OUT' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>
                  {result.type === 'success' && result.status === 'IN' ? 'Access Granted' :
                   result.type === 'success' && result.status === 'OUT' ? 'Exit Logged' : 
                   'Access Denied'}
                </h3>
                <p className={`font-medium ${
                  result.type === 'success' && result.status === 'IN' ? 'text-green-600' :
                  result.type === 'success' && result.status === 'OUT' ? 'text-yellow-700' :
                  'text-red-600'
                }`}>
                  {result.message}
                </p>
              </div>
            ) : (
              <div className="p-12 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                <p className="font-medium text-lg">Waiting for scan...</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default ScanQRPage;
