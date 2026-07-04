const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const http = require('http');
require("dotenv").config();

// Fix SRV DNS resolution issues on some local routers/DNS servers
try {
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Failed to configure custom DNS servers:', e.message);
}

const connectDB = require("./config/db");
const createAdmin = require("./utils/createAdmin");
const { initSocket } = require('./socket');
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userManagementRoutes = require("./routes/userManagementRoutes");
const { createUser } = require("./controllers/userManagementController");
const { protect } = require("./middleware/authMiddleware");
const { adminOrStaff } = require("./middleware/roleMiddleware");
const upload = require("./middleware/uploadMiddleware");
const lostItemRoutes = require("./routes/lostItemRoutes");
const foundItemRoutes = require("./routes/foundItemRoutes");
const itemRoutes = require("./routes/itemRoutes");
const claimRoutes = require("./routes/claimRoutes");
const matchRoutes = require("./routes/matchRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const universityRoutes = require("./routes/universityRoutes");
const accessRoutes = require("./routes/accessRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const studentRoutes = require("./routes/studentRoutes");
const securityRoutes = require("./routes/securityRoutes");
const cleanerRoutes = require("./routes/cleanerRoutes");
const auditRoutes = require("./routes/auditRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const reportRoutes = require("./routes/reportRoutes");
const trashRoutes = require("./routes/trashRoutes");
const roleRoutes = require("./routes/roleRoutes");
const campusEnvironmentRoutes = require("./modules/campusEnvironment/routes/campusEnvironmentRoutes");
const classIssueRoutes = require("./modules/classIssues/routes/classIssueRoutes");

const app = express();

// Connect to database
connectDB();

// 1. Permissive CORS (Must be first)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 2. Global Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// 3. Body Parsing
app.use(express.json({ limit: '50mb', strict: false }));

// Error handling for malformed JSON payloads
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    // Attempt to clean up malformed JSON (remove stray backslashes and leading spaces)
    try {
      const raw = err.body || '';
      const cleaned = raw.replace(/\\\\/g, '').trim();
      req.body = JSON.parse(cleaned);
      return next();
    } catch (e) {
      // If still cannot parse, respond with clear error
      return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
    }
  }
  next(err);
});

// 4. Sanitize data (XSS)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 4. Sanitize data (XSS)
app.use(xss());

// 5. Prevent parameter pollution
app.use(hpp());

// 6. Rate limiting (Increased for dev testing/polling)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000 // 1000 requests per minute
});
app.use('/api', limiter);

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/profiles', express.static(path.join(__dirname, 'uploads', 'profiles')));

// Routes
app.use("/api/auth", authRoutes);
app.post("/api/users/create", protect, adminOrStaff, upload.profiles.single('photo'), createUser);
app.use("/api/admin/users", userManagementRoutes);
app.use("/api/users", userManagementRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/lost-items", lostItemRoutes);
app.use("/api/found-items", foundItemRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/university", universityRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/cleaner", cleanerRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/announcements", announcementRoutes);
app.use('/api/categories', categoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/trash", trashRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/campus-environment", campusEnvironmentRoutes);
app.use("/api/class-issues", classIssueRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Final error handler
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

const startServer = () => {
  server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await createAdmin();
  });
};

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is in use. Attempting to clear...`);
    // The predev script should handle this, but if we are here, something went wrong.
    // We exit and let nodemon retry after the predev script runs again.
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();
