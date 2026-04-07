import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';

import ReportLostItem from './pages/ReportLostItem';
import LostItemsList from './pages/LostItemsList';
import LostItemDetails from './pages/LostItemDetails';

import ReportFoundItem from './pages/ReportFoundItem';
import FoundItemsList from './pages/FoundItemsList';
import FoundItemDetails from './pages/FoundItemDetails';

import ClaimItem from './pages/ClaimItem';
import MyClaims from './pages/MyClaims';
import AdminClaims from './pages/AdminClaims';
import AdminMatches from './pages/AdminMatches';
import NotificationsPage from './pages/NotificationsPage';
import QRCodePage from './pages/QRCodePage';
import ScanQRPage from './pages/ScanQRPage';
import AccessLogs from './pages/AccessLogs';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './pages/Unauthorized';

// Temporary Mock Dashboard Components for the router to point at functionally
const DashboardPlaceholder = ({ role }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="bg-white p-8 rounded-xl shadow-lg text-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{role} Dashboard</h1>
      <p className="text-gray-500">Welcome to your portal.</p>
    </div>
  </div>
);

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        {/* Protected Routes */}
        
        {/* Admin Only */}
        <Route 
          path="/admin/dashboard" 
          element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} 
        />
        <Route 
          path="/admin/users" 
          element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} 
        />
        <Route 
          path="/admin/claims" 
          element={<ProtectedRoute allowedRoles={['admin']}><AdminClaims /></ProtectedRoute>} 
        />
        <Route 
          path="/admin/matches" 
          element={<ProtectedRoute allowedRoles={['admin']}><AdminMatches /></ProtectedRoute>} 
        />
        <Route 
          path="/admin/reports" 
          element={<ProtectedRoute allowedRoles={['admin']}><AccessLogs /></ProtectedRoute>} 
        />

        {/* Security & Admin */}
        <Route 
          path="/scan-qr" 
          element={<ProtectedRoute allowedRoles={['security', 'admin']}><ScanQRPage /></ProtectedRoute>} 
        />
        <Route 
          path="/admin/found-items" 
          element={<ProtectedRoute allowedRoles={['security', 'admin']}><FoundItemsList /></ProtectedRoute>} 
        />
        <Route 
          path="/admin/found-items/:id" 
          element={<ProtectedRoute allowedRoles={['security', 'admin']}><FoundItemDetails /></ProtectedRoute>} 
        />
        <Route 
          path="/report-found-item" 
          element={<ProtectedRoute allowedRoles={['security', 'admin']}><ReportFoundItem /></ProtectedRoute>} 
        />

        {/* Student Only / Student & Admin */}
        <Route 
          path="/qr-code" 
          element={<ProtectedRoute allowedRoles={['student']}><QRCodePage /></ProtectedRoute>} 
        />
        <Route 
          path="/my-claims" 
          element={<ProtectedRoute allowedRoles={['student']}><MyClaims /></ProtectedRoute>} 
        />
        <Route 
          path="/claim-item" 
          element={<ProtectedRoute allowedRoles={['student']}><ClaimItem /></ProtectedRoute>} 
        />

        {/* Shared access (Student & Admin can both see Lost Items) */}
        <Route 
          path="/admin/lost-items" 
          element={<ProtectedRoute allowedRoles={['student', 'admin']}><LostItemsList /></ProtectedRoute>} 
        />
        <Route 
          path="/admin/lost-items/:id" 
          element={<ProtectedRoute allowedRoles={['student', 'admin']}><LostItemDetails /></ProtectedRoute>} 
        />
        <Route 
          path="/report-lost-item" 
          element={<ProtectedRoute allowedRoles={['student', 'admin']}><ReportLostItem /></ProtectedRoute>} 
        />

        {/* All Authenticated */}
        <Route 
          path="/notifications" 
          element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} 
        />

        {/* Redirects */}
        <Route path="/student/dashboard" element={<Navigate to="/admin/lost-items" replace />} />
        <Route path="/security/dashboard" element={<Navigate to="/scan-qr" replace />} />
        <Route path="/cleaner/dashboard" element={<DashboardPlaceholder role="Cleaner" />} />
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
