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
const designationRoutes = require('./routes/designationRoutes');
const roleRoutes = require('./routes/roleRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const securityRoutes = require('./routes/securityRoutes');
const studentPortalRoutes = require('./routes/studentPortalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const followupRoutes = require('./routes/followupRoutes');
const seatRoutes = require('./routes/seatRoutes');
const feeRoutes = require('./routes/feeRoutes');
const scholarshipRoutes = require('./routes/scholarshipRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const examRoutes = require('./routes/examRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const lessonPlanRoutes = require('./routes/lessonPlanRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const leaveRequestRoutes = require('./routes/leaveRequestRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
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
app.use('/api/designations', designationRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/mess', messRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/student-portal', studentPortalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/hostel', hostelRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/lesson-plans', lessonPlanRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/meetings', meetingRoutes);
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
