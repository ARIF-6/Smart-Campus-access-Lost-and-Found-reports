1. Project Overview
The Smart‑Campus Admin System is a full‑stack web application that provides a unified dashboard for university campus operations. It enables administrators, staff, students, and cleaners to manage:

User & Role Management – create, edit, deactivate users.
Asset & Issue Tracking – report, view, and resolve lost/found items, campus‑environment complaints, class‑issues, and security incidents.
Security & Access Control – monitor security shifts, access logs, black‑list entries, and audit trails.
Reporting & Analytics – real‑time dashboards, statistics, and visualisations for all operational domains.
Communication – push notifications, in‑app alerts, and real‑time updates via WebSockets.
All functionality is exposed through a single admin portal built on a React + Vite front‑end and a Node/Express API backed by MongoDB. Role‑based access control (RBAC) guarantees that each user only sees the UI elements and API endpoints they are authorised to use.

2. Architecture & Data Flow
+-------------------+        HTTP/HTTPS        +-------------------+
|  React (Vite) UI  | <---------------------> |  Express API      |
|  (frontend)       |   REST (JSON)          |  (backend)        |
+-------------------+                         +-------------------+
        ^  ^                                         |
        |  |   WebSocket (Socket.io)                |
        |  +-----------------------------------------+
        |                                          |
        |   +-------------------+   MongoDB       |
        +---|  Socket.io Server | <------------> |  Collections |
            +-------------------+                +-------------------+
Client → API – UI components call services/api.js which wraps axios calls to the Express routes.
API → DB – Controllers use Mongoose models to query and mutate MongoDB documents.
API → Socket.io – After mutating data (e.g., creating a complaint, updating a status) the controller emits events (dashboard:refresh, statusUpdated, etc.) that are broadcast to all connected clients.
Client ← Socket.io – The front‑end subscribes to these events using the SocketContext hook and updates UI state in real time, eliminating the need for manual refreshes.
3. Technology Stack
Layer	Technology (versions as of 2026)
Front‑end	React 19.2, Vite 7, Tailwind 3, Lucide‑React (icon library)
Styling	Tailwind CSS, Inter font, custom CSS utilities
State Management	React Context + local component state
Back‑end	Node 20, Express 4, Mongoose 8
Real‑time	Socket.io 4
Database	MongoDB 6 (hosted on Atlas or on‑prem)
Build / Tooling	npm 10, ESLint 9, Prettier
Authentication	JWT (access + refresh tokens), bcrypt for passwords
Authorization	RBAC middleware (checkRole)
Testing	Jest 29 (unit), React Testing Library (UI), Supertest (API)
CI/CD (optional)	GitHub Actions, Docker, Kubernetes (optional)
4. Repository Structure
smart campus/
│
├─ backend/                     # Node/Express server
│   ├─ controllers/             # Request handlers (e.g., campusEnvironmentController.js)
│   ├─ models/                  # Mongoose schemas (User, Class, CampusEnvironmentComplaint, …)
│   ├─ routes/                  # Express routers, mounted in server.js
│   ├─ services/                # Business‑logic utilities (notification, email, etc.)
│   ├─ middleware/              # auth, error handling, role checking
│   ├─ socket/                  # Socket.io event definitions
│   ├─ utils/                   # Helper functions (responseHandler, pagination, etc.)
│   └─ server.js                # App entry point, DB connection, socket init
│
├─ frontend/                    # React + Vite UI
│   ├─ src/
│   │   ├─ components/
│   │   │   ├─ layout/          # AdminLayout, AdminSidebar, etc.
│   │   │   ├─ tables/          # Re‑usable table components (EnvironmentalComplaintsTable, …)
│   │   │   ├─ modals/          # All modal dialog components
│   │   │   ├─ campus‑environment/
│   │   │   │   ├─ ComplaintDetailsModal.jsx
│   │   │   │   └─ …            # UI for campus‑environment module
│   │   │   └─ …                # Other feature folders (class‑issues, items, security …)
│   │   ├─ context/             # AuthContext, SocketContext, AutoRefreshContext
│   │   ├─ pages/               # One page per route (Dashboard, Users, LostItems, …)
│   │   ├─ services/            # API wrappers (axios based)
│   │   ├─ utils/               # UI helpers (date formatting, image utils)
│   │   ├─ App.jsx
│   │   └─ index.css            # Tailwind + custom utilities (no‑scrollbar, fonts)
│   ├─ public/
│   ├─ vite.config.js
│   └─ package.json
│
├─ .gitignore
├─ README.md                    # **THIS FILE**
└─ package.json (root)          # Workspace meta (optional)
5. Core Modules
5.1 Front‑end (React + Vite)
Folder	Purpose	Key Files
layout/	Global layout components – header, sidebar, layout wrappers.	AdminLayout.jsx, AdminSidebar.jsx
tables/	Generic table components used across modules (sorting, pagination).	EnvironmentalComplaintsTable.jsx, ClassIssuesTable.jsx
modals/	Re‑usable modal dialogs for create / edit / view actions.	ComplaintDetailsModal.jsx, CreateUserModal.jsx
pages/	Route‑level pages – each URL maps to a page component.	CampusEnvironmentPage.jsx, UserManagement.jsx, SecurityShifts.jsx
services/	Centralised axios wrapper functions (GET/POST/PUT/DELETE).	api.js, categoryService.js
context/	React Context providers for auth, socket, auto‑refresh timers.	AuthContext.jsx, SocketContext.jsx
utils/	UI helpers (date formatting, image URL builder).	imageUtils.js, responseHandler.js
Key UI Concepts

Responsive Design – Mobile‑first with Tailwind utilities, hidden scrollbar (.no-scrollbar).
Iconography – Unified Lucide React icons (size 18 px, stroke 1.75).
Theming – White sidebar with subtle #E5E7EB border, Inter font (400/500/600).
State Refresh – Pages that need fresh data listen to dashboard:refresh events from Socket.io.
5.2 Back‑end (Node/Express)
Folder	Purpose	Key Files
models/	Mongoose schema definitions for every domain entity.	User.js, Class.js, CampusEnvironmentComplaint.js, CampusEnvironmentIssue.js, ClassIssue.js
controllers/	Business logic for each resource – validation, DB ops, socket emits.	campusEnvironmentController.js, userController.js, classIssueController.js
routes/	Express routers, mounting controller methods on URLs.	campusEnvironmentRoutes.js, userRoutes.js, classIssueRoutes.js
services/	Cross‑cutting services (notifications, email, file upload).	notificationController.js, emailService.js
middleware/	Common middleware – error handling, JWT verification, role checking.	auth.js, checkRole.js, asyncHandler.js
socket/	Socket.io event definitions & helper to broadcast updates.	notificationEvents.js
utils/	Helper utilities – standardized success/error responses.	responseHandler.js, pagination.js
Typical Controller Flow

js
// Example: campusEnvironmentController.updateStatus
exports.updateStatus = asyncHandler(async (req, res) => {
  // 1️⃣ Validate payload + permissions (admin/staff)
  // 2️⃣ Fetch complaint, verify existence
  // 3️⃣ Update status + create tracking entry
  // 4️⃣ Emit socket event: statusUpdated
  // 5️⃣ Notify the complaint owner via Notification service
  // 6️⃣ Return standardized success response
});
5.3 Real‑time (Socket.io)
The socket server is instantiated in backend/socket/index.js and attached to the Express HTTP server.
Events include:
Event	Origin	Payload	Consumers
dashboard:refresh	Any mutation that impacts the admin dashboard (new complaint, status change, new user)	{module: 'Campus Environment'}	All pages that display aggregated stats
statusUpdated	updateStatus controller	{complaintId, status}	ComplaintDetailsModal (auto‑refresh)
supportChanged	supportComplaint / removeSupport	{complaintId, supportCount}	Analytics hot‑complaints list
issueCreated	createComplaint	full complaint doc	Staff dashboards for live monitoring
5.4 Database (MongoDB)
All collections are modelled with Mongoose schemas. Important relations (referenced by ObjectId) include:

Collection	References	Important Indexes
users	class, hall, faculty, department	{role: 1}, {email: 1}
classes	hall (optional)	{name: 1}
campusenvironmentcomplaints	student (User), issueType (CampusEnvironmentIssue), class (Class), hall (Hall)	{status: 1, title: 1, location: 1}, {student: 1}
campusenvironmentissues	–	{issueName: 1}
classissues	student, class, issueType	{status: 1}, {class: 1}
auditlogs	user	{action: 1, createdAt: -1}
notifications	user	{userId: 1, read: 1}
6. API Surface
All endpoints are prefixed with /api. Example categories:

Module	Endpoint	Method	Description	Role Access
Auth	/api/auth/login	POST	Returns JWT access/refresh tokens	Public
/api/auth/register	POST	Register a new user (admin only)	Admin
Users	/api/users	GET	List users (filterable)	Admin/Staff
/api/users/:id	GET/PUT/DELETE	CRUD on a single user	Admin
Campus Environment	/api/campus-environment	GET	List complaints (admin/staff)	Admin/Staff
/api/campus-environment/my	GET	Student view of all complaints	Student
/api/campus-environment/:id	GET	Complaint details (incl. reporter class)	Admin/Staff/Student
/api/campus-environment	POST	Create a new complaint (student)	Student
/api/campus-environment/:id/status	PUT	Update status (admin/staff)	Admin/Staff
/api/campus-environment/:id/support	POST/DELETE	Up/down‑vote a complaint (student)	Student
Class Issues	/api/class-issues	GET/POST	Manage class‑specific issues	Admin/Staff/Student
Security	/api/security/shifts	GET/POST	Manage security guard shifts	Admin/Staff
Analytics	/api/campus-environment/stats	GET	Dashboard statistics (admin/staff)	Admin/Staff
Notifications	/api/notifications	GET	User’s notifications (all roles)	Authenticated
Audit Logs	/api/audit-logs	GET	Read‑only view of system activity	Admin
All endpoints return the unified response shape:

json
{
  "success": true,
  "message": "Descriptive text",
  "data": {...}
}
Error responses include a statusCode and a human‑readable error field.

7. Authentication & Authorization
7.1 JWT Flow
Login → /api/auth/login returns accessToken (short‑lived, ~15 min) and refreshToken (long‑lived, ~7 days).
Access Token is sent in the Authorization: Bearer <token> header for every protected request.
Refresh Token endpoint (/api/auth/refresh) issues a new access token when the old one expires.
7.2 Password Security
Passwords are hashed with bcrypt 12 before storage.
Login compares the hash using bcrypt.compare.
7.3 Role‑Based Access Control (RBAC)
User schema contains a role field (enum: admin, staff, student, cleaner, visitor).
Middleware checkRole([...allowed]) validates that req.user.role exists in the whitelist before granting access to route handlers.
7.4 Permission Matrix
Role	Core Permissions	UI Visibility	Special Capabilities
Admin	Full CRUD on all resources, create/assign roles, view audit logs, manage categories, trigger system‑wide notifications.	Sees every sidebar menu item, global settings, and analytics.	Can deactivate users, view raw DB backups, change system configuration.
Staff	Manage complaints, incidents, security shifts, view analytics for assigned domains, update status, assign tasks.	Same as Admin except: no User Management, System Settings, Audit Logs, Role Management.	Can only see users belonging to their department (filtered via middleware).
Student	Create campus‑environment complaints, support (up‑vote) complaints, view own submitted items, edit profile, view class‑issues, access limited analytics (personal stats).	Only Campus Issues, Class Issues, My Claims, Profile, Logout.	Cannot see any other users or admin‑only pages.
Cleaner	Toggle on‑duty/off‑duty status, view assigned cleaning tasks, log shift times, view limited incident reports.	Dashboard (cleaner view), Shift Management, Logout.	No access to user management or analytics.
Visitor	View public announcements, submit incident reports, browse campus map (read‑only).	Very limited UI (Announcements, Report Incident, Logout).	No authentication required for read‑only sections; a temporary token is generated for incident report submission.
8. User Roles, Permissions & Feature Matrix
Feature	Admin	Staff	Student	Cleaner	Visitor
Dashboard (overall)	✅	✅	✅ (personal)	✅ (cleaner view)	✅ (public view)
User Management	✅	❌	❌	❌	❌
Role Management	✅	❌	❌	❌	❌
Category Management	✅	✅	❌	❌	❌
University Management	✅	✅	❌	❌	❌
Lost/Found Items	✅	✅	✅ (view + claim)	❌	❌
Campus‑Environment Issues	✅ (view all)	✅ (manage)	✅ (create + view own)	❌	❌
Class Issues	✅	✅	✅ (view + create)	❌	❌
Security Shifts	✅	✅	❌	✅ (log own shifts)	❌
Access Logs	✅	✅	❌	❌	❌
Audit Logs	✅	❌	❌	❌	❌
Reports / Analytics	✅ (all)	✅ (restricted)	✅ (personal stats)	❌	❌
Announcements	✅	✅	✅	✅	✅
Notification Bell	✅	✅	✅	✅	✅
Sign‑Out	✅	✅	✅	✅	✅
Real‑time Updates	✅	✅	✅	✅	✅ (read‑only)
9. Workflow & Use‑Case Scenarios
9.1 Student Submits a Campus Issue
Student logs in → JWT stored in localStorage.
Navigates to Campus Issues → New Issue.
Fills Title, selects an Issue Type (category), optionally adds Location (now hidden, replaced by Class auto‑filled), uploads images.
Click Submit → POST /api/campus-environment.
Controller validates payload, resolves the student’s class via req.user.class, creates CampusEnvironmentComplaint.
Notification service creates a new‑complaint notification for admins and a confirmation notification for the student.
Socket.io emits dashboard:refresh; admin dashboards update automatically.
9.2 Admin Reviews & Assigns a Complaint
Admin receives push notification → opens Campus Issues list.
Clicks View on a complaint → modal shows full details, including Class (instead of location).
Chooses a staff member from a drop‑down and clicks Assign → PUT /api/campus-environment/:id/assign.
Controller updates assignedTo, sets status to in_review, creates a tracking record, sends a notification to the assignee.
Socket.io emits statusUpdated; the assignee’s view refreshes in real time.
9.3 Cleaner Toggles Duty Status
Cleaner clicks On/Off Duty button on the sidebar (styled with bg-[#EEF2FF]).
Front‑end updates local state and persists to localStorage.
No API call – duty status is stored client‑side for UI purpose only (could be persisted later if needed).
9.4 Real‑time Analytics Update
An admin changes a complaint status → dashboard:refresh is emitted.
The Analytics page listens for this event and re‑calls GET /api/campus-environment/stats.
The hot‑complaints list now reflects the new support count and displays the Class name.
10. Installation & Development Guide
10.1 Prerequisites
Node.js ≥ 20.x
npm ≥ 10.x (or yarn if preferred)
MongoDB (local instance or Atlas URI)
(Optional) Docker for containerised dev environments
10.2 Clone & Install
bash
git clone https://github.com/yourorg/smart-campus.git
cd smart-campus
# Install backend deps
cd backend
npm ci
# Install frontend deps
cd ../frontend
npm ci
10.3 Environment Variables
Create .env files in both backend/ and frontend/ (frontend only needs VITE_API_URL).

backend/.env

env
PORT=5000
MONGO_URI=mongodb://localhost:27017/smartcampus
JWT_ACCESS_SECRET=yourAccessSecret
JWT_REFRESH_SECRET=yourRefreshSecret
BCRYPT_SALT_ROUNDS=12
frontend/.env

env
VITE_API_URL=http://localhost:5000/api
10.4 Run Development Servers
bash
# Backend (with hot reload)
cd backend
npm run dev   # uses nodemon
# Frontend (Vite dev server)
cd ../frontend
npm run dev   # opens http://localhost:5173
Both servers watch for changes automatically.

10.5 Linting & Formatting
bash
npm run lint      # ESLint
npm run format    # Prettier
11. Production Build & Deployment
Front‑end
bash
cd frontend
npm run build   # produces ./dist
Back‑end – set NODE_ENV=production and serve static files (optional). Example Express static middleware (already in server.js):
js
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (_, res) => res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html')));
}
Docker (optional)
Backend Dockerfile

dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend ./
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
Frontend Dockerfile

dockerfile
FROM node:20-alpine as build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
Compose both services with a MongoDB container or use an external Atlas DB.

12. Testing
Type	Tool	Command
Unit (backend)	Jest + Supertest	npm test (in backend/)
UI component	React Testing Library	npm test (in frontend/)
End‑to‑end	Cypress (optional)	npx cypress open
All tests run against an in‑memory MongoDB (mongodb-memory-server) to keep CI fast.

13. Contributing
Fork the repository.
Create a feature branch (git checkout -b feat/your-feature).
Follow the coding style (ESLint & Prettier).
Write accompanying tests.
Submit a Pull Request with a clear description and link to the related issue.
NOTE: Changes that affect API contracts must update the OpenAPI spec located at backend/openapi.yaml and bump the API version in backend/package.json.

14. Future Enhancements
Area	Planned Feature	Reason
Dynamic Code Splitting	Use React.lazy + Suspense for large modules (e.g., analytics)	Reduce initial bundle size (currently > 500 KB).
Internationalisation (i18n)	Integrate react-i18next with language packs for English/Arabic	Campus users are multilingual.
Bulk Export	CSV/Excel export for reports, audit logs	Administrative reporting needs.
Mobile App	React Native wrapper for student‑side complaint submission	Offline capability & push notifications.
Fine‑grained Permissions	Policy‑based access control (ABAC) for future micro‑service migration	Scalability and compliance.
15. FAQ
Q: Why is the “Location” column replaced by “Class”?
A: The system now derives a student’s class from the Class collection, providing a more accurate context for campus‑environment issues. The UI changes (tables, modals, analytics) have been updated accordingly.

Q: How are hidden scrollbars implemented?
A: A utility class .no-scrollbar (added in index.css) sets -ms-overflow-style: none;, scrollbar-width: none;, and hides the ::-webkit-scrollbar. The class is applied to any scrollable container without disabling scrolling.

Q: Can a student see complaints submitted by other students?
A: No. The Student role can only view complaints they authored (GET /api/campus-environment/my). Admins and staff can view all complaints.

Q: Where are notification preferences stored?
A: Notifications are stored in the notifications collection, with a read flag. Users can mark them as read via the Notification Bell component.

Q: How are real‑time updates secured?
A: Socket.io connections are upgraded after JWT verification (the token is sent in the query string). The server validates the token before allowing subscription to protected events.
