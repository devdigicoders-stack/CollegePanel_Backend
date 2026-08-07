require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const College = require('./models/College');
const Teacher = require('./models/Teacher');
const Department = require('./models/Department');
const Attendance = require('./models/Attendance');
const Fee = require('./models/Fee');
const Examination = require('./models/Examination');
const Hostel = require('./models/Hostel');
const Library = require('./models/Library');
const Employee = require('./models/Employee');
const Lead = require('./models/Lead');
const Activity = require('./models/Activity');

const seedData = async () => {
  await connectDB();
  
  try {
    const colleges = await College.find();
    if (colleges.length === 0) {
      console.log('No colleges found to seed data for.');
      process.exit();
    }

    console.log('Clearing old detailed data...');
    await Promise.all([
      Teacher.deleteMany(), Department.deleteMany(), Attendance.deleteMany(),
      Fee.deleteMany(), Examination.deleteMany(), Hostel.deleteMany(),
      Library.deleteMany(), Employee.deleteMany(), Lead.deleteMany(), Activity.deleteMany()
    ]);

    console.log('Seeding new detailed data...');
    
    for (const college of colleges) {
      const cid = college._id;

      // Departments
      const depts = ['Computer Science', 'Mechanical Engineering', 'Civil Engineering', 'Electrical'];
      for (const d of depts) {
        await Department.create({ name: d, hod: `Dr. ${d} HOD`, totalFaculty: Math.floor(Math.random()*15)+5, collegeId: cid });
      }

      // Teachers & Employees
      for (let i = 0; i < 5; i++) {
        await Teacher.create({ name: `Teacher ${i+1}`, department: depts[i%depts.length], qualification: 'Ph.D', experience: `${i+2} Years`, collegeId: cid });
        await Employee.create({ name: `Employee ${i+1}`, role: i%2===0 ? 'Clerk' : 'Admin Staff', department: 'Administration', collegeId: cid });
      }

      // Attendance
      for (let i = 0; i < 3; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        await Attendance.create({ date: d, present: Math.floor(Math.random()*500)+800, total: 1500, status: 'Completed', collegeId: cid });
      }

      // Fees
      for (let i = 0; i < 5; i++) {
        await Fee.create({ studentName: `Student ${i+1}`, amount: 55000, date: new Date(), status: i%2===0 ? 'Paid' : 'Pending', collegeId: cid });
      }

      // Examinations
      await Examination.create({ examName: 'Mid Semesters 2026', date: new Date(Date.now() + 864000000), status: 'Upcoming', collegeId: cid });
      await Examination.create({ examName: 'Final Semesters 2025', date: new Date(Date.now() - 8640000000), status: 'Completed', collegeId: cid });

      // Hostel
      await Hostel.create({ blockName: 'Block A (Boys)', capacity: 300, warden: 'Mr. Warden A', collegeId: cid });
      await Hostel.create({ blockName: 'Block B (Girls)', capacity: 250, warden: 'Mrs. Warden B', collegeId: cid });

      // Library
      await Library.create({ bookName: 'Introduction to Algorithms', author: 'Thomas H. Cormen', availableCopies: 45, collegeId: cid });
      await Library.create({ bookName: 'Clean Code', author: 'Robert C. Martin', availableCopies: 12, collegeId: cid });

      // Leads
      for (let i = 0; i < 4; i++) {
        await Lead.create({ studentName: `Lead ${i+1}`, source: i%2===0 ? 'Website' : 'Walk-in', status: i%2===0 ? 'New' : 'Converted', collegeId: cid });
      }

      // Activity
      await Activity.create({ activityName: 'Annual Tech Fest', date: new Date(Date.now() - 10000000), description: '3-day technical symposium', collegeId: cid });
      await Activity.create({ activityName: 'Sports Meet', date: new Date(Date.now() + 20000000), description: 'Inter-department sports tournament', collegeId: cid });
    }

    console.log('Detailed data seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
