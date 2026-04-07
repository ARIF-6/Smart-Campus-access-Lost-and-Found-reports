const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const http = require('http');
require("dotenv").config();

const connectDB = require("./config/db");
const createAdmin = require("./utils/createAdmin");
const { init } = require('./utils/socket');
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userManagementRoutes = require("./routes/userManagementRoutes");
const lostItemRoutes = require("./routes/lostItemRoutes");
const foundItemRoutes = require("./routes/foundItemRoutes");
const claimRoutes = require("./routes/claimRoutes");
const matchRoutes = require("./routes/matchRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const accessRoutes = require("./routes/accessRoutes");
const studentRoutes = require("./routes/studentRoutes");
const securityRoutes = require("./routes/securityRoutes");
const cleanerRoutes = require("./routes/cleanerRoutes");
const auditRoutes = require("./routes/auditRoutes");

const app = express();

// Connect to database
connectDB();

// 1. Permissive CORS (Must be first)
app.use(cors({
  origin: "http://localhost:5173",
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/users", userManagementRoutes);
app.use("/api/lost-items", lostItemRoutes);
app.use("/api/found-items", foundItemRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/cleaner", cleanerRoutes);
app.use("/api/audit-logs", auditRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Final error handler
app.use(errorHandler);

const server = http.createServer(app);
const io = init(server);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal notification room.`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Run createAdmin script
    await createAdmin();
});