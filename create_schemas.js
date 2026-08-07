const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');

const schemas = {
  Teacher: `const mongoose = require('mongoose');
const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: String, required: true },
  qualification: { type: String, required: true },
  experience: { type: String, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Teacher', teacherSchema);`,

  Department: `const mongoose = require('mongoose');
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hod: { type: String, required: true },
  totalFaculty: { type: Number, default: 0 },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Department', departmentSchema);`,

  Attendance: `const mongoose = require('mongoose');
const attendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  present: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, enum: ['Completed', 'Pending'], default: 'Completed' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Attendance', attendanceSchema);`,

  Fee: `const mongoose = require('mongoose');
const feeSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Paid', 'Pending', 'Overdue'], default: 'Paid' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Fee', feeSchema);`,

  Examination: `const mongoose = require('mongoose');
const examinationSchema = new mongoose.Schema({
  examName: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Upcoming', 'Ongoing', 'Completed'], default: 'Upcoming' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Examination', examinationSchema);`,

  Hostel: `const mongoose = require('mongoose');
const hostelSchema = new mongoose.Schema({
  blockName: { type: String, required: true },
  capacity: { type: Number, required: true },
  warden: { type: String, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Hostel', hostelSchema);`,

  Library: `const mongoose = require('mongoose');
const librarySchema = new mongoose.Schema({
  bookName: { type: String, required: true },
  author: { type: String, required: true },
  availableCopies: { type: Number, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Library', librarySchema);`,

  Employee: `const mongoose = require('mongoose');
const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Employee', employeeSchema);`,

  Lead: `const mongoose = require('mongoose');
const leadSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  source: { type: String, required: true },
  status: { type: String, enum: ['New', 'Contacted', 'Converted', 'Lost'], default: 'New' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Lead', leadSchema);`,

  Activity: `const mongoose = require('mongoose');
const activitySchema = new mongoose.Schema({
  activityName: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Activity', activitySchema);`
};

Object.entries(schemas).forEach(([name, content]) => {
  fs.writeFileSync(path.join(modelsDir, `${name}.js`), content);
});

console.log('Successfully created all 10 schema files.');
