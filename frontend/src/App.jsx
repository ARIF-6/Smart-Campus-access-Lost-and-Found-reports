import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Auth Pages
import { Login, Register } from './pages/auth';

// Admin Pages
import {
  AdminDashboard,
  UserManagement,
  AdminClaims,
  AdminMatches,
  AdminAnnouncements,
  AuditLogs,
  AccessLogs,
  ReportsPage,
  SystemReports,
  TrashPage,
  RoleManagement,
  Visitors,
  Incidents,
  Blacklist,
  SecurityShifts,
  UniversityManagement
} from './pages/admin';
import CategoryManagement from './pages/CategoryManagement';
// Campus Environment Pages
import CampusEnvironmentPage from './pages/campus-environment/CampusEnvironmentPage';
import CampusEnvironmentAnalytics from './pages/campus-environment/CampusEnvironmentAnalytics';
import ClassIssuesPage from './pages/class-issues/ClassIssuesPage';
import ClassIssuesAnalytics from './pages/class-issues/ClassIssuesAnalytics';

// Staff Pages
import { StaffDashboard } from './pages/staff';

// Student Pages
import { MyClaims, ClaimItem, QRCodePage } from './pages/student';

// Items Pages
import {
  ReportLostItem,
  LostItemsList,
  LostItemDetails,
  ReportFoundItem,
  FoundItemsList,
  FoundItemDetails
} from './pages/items';

// Security Pages
import { ScanQRPage } from './pages/security';

// Shared Pages
import { NotificationsPage, AnnouncementsList, Unauthorized } from './pages/shared';

// Components
import { ProtectedRoute } from './components/layout';
import AdminLayout from './components/layout/AdminLayout';

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

        {/* Staff Dashboard */}
        <Route
          path="/staff/dashboard"
          element={<ProtectedRoute allowedRoles={['staff']}><StaffDashboard /></ProtectedRoute>}
        />

        {/* Admin Only */}
        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><AdminDashboard /></ProtectedRoute>}
        />
        <Route
          path="/admin/users/:section?"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><UserManagement /></ProtectedRoute>}
        />
        <Route
          path="/admin/visitors"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Visitors /></ProtectedRoute>}
        />
        <Route
          path="/admin/incidents"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Incidents /></ProtectedRoute>}
        />
        <Route
          path="/admin/blacklist"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Blacklist /></ProtectedRoute>}
        />
        <Route
          path="/admin/security-shifts"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><SecurityShifts /></ProtectedRoute>}
        />
        <Route
          path="/admin/claims"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><AdminClaims /></ProtectedRoute>}
        />
        <Route
          path="/admin/matches"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><AdminMatches /></ProtectedRoute>}
        />
        <Route
          path="/admin/reports"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><ReportsPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/system-reports"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><SystemReports /></ProtectedRoute>}
        />
        <Route
          path="/admin/access-logs"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><AccessLogs /></ProtectedRoute>}
        />
        <Route
          path="/admin/audit-logs"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><AuditLogs /></ProtectedRoute>}
        />
        <Route
          path="/admin/announcements"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><AdminAnnouncements /></ProtectedRoute>}
        />
        <Route
          path="/admin/trash"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><TrashPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/roles"
          element={<ProtectedRoute allowedRoles={['admin']}><RoleManagement /></ProtectedRoute>}
        />
        <Route
          path="/admin/university"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><AdminLayout title="University Management"><UniversityManagement /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/admin/categories"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><CategoryManagement /></ProtectedRoute>}
        />
        <Route
          path="/admin/categories/campus-issues"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><CategoryManagement /></ProtectedRoute>}
        />
        <Route
          path="/admin/categories/class-issues"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><CategoryManagement /></ProtectedRoute>}
        />
        <Route
          path="/admin/categories/lost-found"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><CategoryManagement /></ProtectedRoute>}
        />
        {/* Campus Environment */}
        <Route
          path="/admin/campus-environment"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><CampusEnvironmentPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/campus-environment/analytics"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><CampusEnvironmentAnalytics /></ProtectedRoute>}
        />

        {/* Class Issues */}
        <Route
          path="/admin/class-issues"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><ClassIssuesPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/class-issues/analytics"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><ClassIssuesAnalytics /></ProtectedRoute>}
        />

        {/* Security & Admin & Staff (Web only Admin & Staff) */}
        {/* <Route
          path="/scan-qr"
          element={<ProtectedRoute allowedRoles={['security', 'admin', 'staff', 'superadmin']}><ScanQRPage /></ProtectedRoute>}
        /> */}
        <Route
          path="/admin/found-items"
          element={<ProtectedRoute allowedRoles={['admin', 'staff', 'clean', 'student']}><FoundItemsList /></ProtectedRoute>}
        />
        <Route
          path="/admin/found-items/:id"
          element={<ProtectedRoute allowedRoles={['admin', 'staff', 'clean', 'student']}><FoundItemDetails /></ProtectedRoute>}
        />
        <Route
          path="/report-found-item"
          element={<ProtectedRoute allowedRoles={['admin', 'staff', 'clean']}><ReportFoundItem /></ProtectedRoute>}
        />

        {/* Student Only / Student & Admin - Enabled on Web with AdminLayout wrapper */}
        <Route
          path="/qr-code"
          element={<ProtectedRoute allowedRoles={['student']}><QRCodePage /></ProtectedRoute>}
        />
        <Route
          path="/my-claims"
          element={<ProtectedRoute allowedRoles={['student']}><AdminLayout title="My Claims"><MyClaims /></AdminLayout></ProtectedRoute>}
        />
        <Route
          path="/claim-item"
          element={<ProtectedRoute allowedRoles={['student']}><AdminLayout title="Claim Item"><ClaimItem /></AdminLayout></ProtectedRoute>}
        />

        {/* Shared access (Student & Admin & Staff can both see Lost Items) */}
        <Route
          path="/admin/lost-items"
          element={<ProtectedRoute allowedRoles={['admin', 'staff', 'clean', 'student']}><LostItemsList /></ProtectedRoute>}
        />
        <Route
          path="/admin/lost-items/:id"
          element={<ProtectedRoute allowedRoles={['admin', 'staff', 'clean', 'student']}><LostItemDetails /></ProtectedRoute>}
        />
        <Route
          path="/report-lost-item"
          element={<ProtectedRoute allowedRoles={['admin', 'staff', 'student']}><ReportLostItem /></ProtectedRoute>}
        />

        {/* All Authenticated (Admin & Staff) */}
        <Route
          path="/notifications"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><NotificationsPage /></ProtectedRoute>}
        />
        <Route
          path="/announcements"
          element={<ProtectedRoute allowedRoles={['admin', 'staff']}><AnnouncementsList /></ProtectedRoute>}
        />

        {/* Redirects */}
        <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><QRCodePage /></ProtectedRoute>} />
        <Route path="/security/dashboard" element={<Navigate to="/unauthorized" replace />} />
        <Route path="/cleaner/dashboard" element={<ProtectedRoute allowedRoles={['clean']}><ReportFoundItem /></ProtectedRoute>} />
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
