require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect to Database
connectDB();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://college-panel-admin.vercel.app',
  'https://college-panel-super-admin.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (like profile images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const indexRoutes = require('./routes/index');
const superAdminRoutes = require('./routes/superAdminRoutes');
const collegeRoutes = require('./routes/collegeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const collegeAdminAuthRoutes = require('./routes/collegeAdminAuthRoutes');
const studentRoutes = require('./routes/studentRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
const academicsRoutes = require('./routes/academicsRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const teacherPortalRoutes = require('./routes/teacherPortalRoutes');
const designationRoutes = require('./routes/designationRoutes');
const roleRoutes = require('./routes/roleRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const securityRoutes = require('./routes/securityRoutes');
const studentPortalRoutes = require('./routes/studentPortalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const placementRoutes = require('./routes/placementRoutes');
const messRoutes = require('./routes/messRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const studyMaterialRoutes = require('./routes/studyMaterialRoutes');

app.use('/api', indexRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/college-admin', collegeAdminAuthRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/academics', academicsRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/teacher-portal', teacherPortalRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/mess', messRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/student-portal', studentPortalRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api/employees', employeeRoutes);
app.use('/api/hostel', hostelRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/placement', placementRoutes);
app.use('/api/mess', messRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/study-materials', studyMaterialRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store connected users: userId -> socketId
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('register', (userId) => {
    if (userId) {
      connectedUsers.set(userId, socket.id);
      console.log(`User registered: ${userId} with socket ${socket.id}`);
    }
  });

  socket.on('disconnect', () => {
    // Remove user from map on disconnect
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User unregistered: ${userId}`);
        break;
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes via req.app.get('io')
app.set('io', io);
// Make connectedUsers accessible via req.app.get('connectedUsers')
app.set('connectedUsers', connectedUsers);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
