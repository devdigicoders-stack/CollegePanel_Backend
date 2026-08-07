require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const College = require('./models/College');
const Employee = require('./models/Employee');
const Student = require('./models/Student');
const Complaint = require('./models/Complaint');

const seedRbacData = async () => {
  await connectDB();
  
  try {
    console.log('🔄 Checking for default college...');
    let college = await College.findOne({ username: 'admin' });
    
    if (!college) {
      college = await College.create({
        collegeName: 'Government Polytechnic Kanpur',
        collegeCode: 'GPK-102',
        collegeType: 'Government',
        adminName: 'College Super Admin',
        adminEmail: 'admin@gpkanpur.ac.in',
        username: 'admin',
        password: 'AdminPassword@123',
        rawPassword: 'AdminPassword@123'
      });
      console.log('✅ Created default college: admin / AdminPassword@123');
    } else {
      console.log('ℹ️ Default college already exists.');
    }
    
    const cid = college._id;

    console.log('🔄 Seeding role-based employee credentials...');
    const rolesToSeed = [
      { name: 'Dr. Rajesh Kumar', role: 'Principal', username: 'principal', password: 'PrincipalPassword@123', dept: 'Administration' },
      { name: 'Dr. Anurag Dixit', role: 'HOD', username: 'hod', password: 'HodPassword@123', dept: 'Computer Science' },
      { name: 'Prof. Sandeep Sen', role: 'Teacher', username: 'teacher', password: 'TeacherPassword@123', dept: 'Computer Science' },
      { name: 'Vimal Chaurasia', role: 'Accountant', username: 'accountant', password: 'AccountantPassword@123', dept: 'Finance' },
      { name: 'Mahendra Misra', role: 'Librarian', username: 'librarian', password: 'LibrarianPassword@123', dept: 'Library' },
      { name: 'Gurupad Dev', role: 'Hostel Warden', username: 'warden', password: 'WardenPassword@123', dept: 'Hostel' },
      { name: 'Ravi Kant', role: 'Mess Manager', username: 'mess', password: 'MessPassword@123', dept: 'Mess' },
      { name: 'Shiva Awasthi', role: 'Lab Assistant', username: 'lab', password: 'LabPassword@123', dept: 'Computer Science' },
      { name: 'Om Prakash', role: 'Workshop Instructor', username: 'workshop', password: 'WorkshopPassword@123', dept: 'Mechanical' },
      { name: 'Gaurav Singhal', role: 'Placement Officer', username: 'placement', password: 'PlacementPassword@123', dept: 'Placement' },
      { name: 'Nisha Agnihotri', role: 'Scholarship Coordinator', username: 'scholarship', password: 'ScholarshipPassword@123', dept: 'Scholarship' },
      { name: 'Ankita Shukla', role: 'Receptionist', username: 'receptionist', password: 'ReceptionistPassword@123', dept: 'Reception' },
      { name: 'Dharampal Singh', role: 'Security/Gate Operator', username: 'security', password: 'SecurityPassword@123', dept: 'Security' }
    ];

    for (const r of rolesToSeed) {
      await Employee.deleteOne({ username: r.username });
      const emp = await Employee.create({
        name: r.name,
        role: r.role,
        department: r.dept,
        email: `${r.username}@gpkanpur.ac.in`,
        mobile: '9876543210',
        username: r.username,
        password: r.password,
        collegeId: cid
      });
      console.log(`✅ Seeded employee: ${r.role} -> ${r.username} / ${r.password}`);
    }

    console.log('🔄 Seeding test student credentials...');
    await Student.deleteOne({ username: 'student' });
    const student = await Student.create({
      studentId: 'STU-2026-001',
      studentName: 'Amit Verma',
      email: 'amit.verma@gpkanpur.ac.in',
      phone: '9087654321',
      course: 'Computer Science & Engg',
      enrollmentDate: new Date(),
      collegeId: cid,
      username: 'student',
      password: 'StudentPassword@123'
    });
    console.log(`✅ Seeded student: ${student.studentName} -> ${student.username} / ${student.password}`);

    console.log('🔄 Seeding sample complaints...');
    const complaintsToSeed = [
      { complaintId: 'CMP-2026-001', subject: 'WiFi not working in Boys Hostel Block A', category: 'Hostel', submittedBy: 'Aarav Singh', submittedById: student._id, description: 'The internet connection in Boys Hostel block A has been down since yesterday evening. Need urgent fix.', priority: 'High', status: 'Pending' },
      { complaintId: 'CMP-2026-002', subject: 'Water leakage in classroom 204', category: 'Maintenance', submittedBy: 'Faculty (Dr. Ritu)', submittedById: student._id, description: 'There is a continuous water leakage from the AC unit in classroom 204.', priority: 'Medium', status: 'In Progress' },
      { complaintId: 'CMP-2026-003', subject: 'Incorrect marks in mid-sem results', category: 'Academics', submittedBy: 'Neha Verma', submittedById: student._id, description: 'My marks for Engineering Mechanics are updated incorrectly on the portal. Please re-verify.', priority: 'High', status: 'Resolved' },
      { complaintId: 'CMP-2026-004', subject: 'Library book return issue', category: 'Library', submittedBy: 'Rohit Kumar', submittedById: student._id, description: 'I am being fined for a book that I already returned last week.', priority: 'Low', status: 'Rejected' }
    ];
    for (const c of complaintsToSeed) {
      await Complaint.deleteOne({ complaintId: c.complaintId });
      await Complaint.create({ ...c, collegeId: cid });
      console.log(`✅ Seeded complaint: ${c.complaintId} - ${c.subject}`);
    }

    console.log('\n🌟 Seeding complete! Database is successfully updated with RBAC accounts.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding RBAC data:', error);
    process.exit(1);
  }
};

seedRbacData();
