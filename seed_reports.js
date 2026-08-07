require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const College = require('./models/College');
const Student = require('./models/Student');
const Admission = require('./models/Admission');

const seedData = async () => {
  await connectDB();
  
  try {
    const colleges = await College.find();
    if (colleges.length === 0) {
      console.log('No colleges found to seed data for.');
      process.exit();
    }

    console.log('Clearing old data...');
    await Student.deleteMany();
    await Admission.deleteMany();

    console.log('Seeding new data...');
    const courses = ['Computer Science', 'Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering', 'Information Technology'];
    const statuses = ['Active', 'Active', 'Active', 'Inactive', 'Graduated'];
    
    for (const college of colleges) {
      // Seed 10-20 students per college
      const numStudents = Math.floor(Math.random() * 10) + 10;
      for (let i = 0; i < numStudents; i++) {
        const studentName = `Student ${i + 1} of ${college.collegeCode}`;
        const student = await Student.create({
          studentId: `STU${college.collegeCode}${1000 + i}`,
          studentName: studentName,
          email: `${studentName.replace(/ /g, '').toLowerCase()}@example.com`,
          phone: `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`,
          gender: Math.random() > 0.5 ? 'Male' : 'Female',
          dob: new Date(2000 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
          address: `${Math.floor(Math.random() * 100) + 1}, Some Street, City ${college.city || 'Kanpur'}, India`,
          branch: courses[Math.floor(Math.random() * courses.length)],
          year: `${Math.floor(Math.random() * 4) + 1}st Year`.replace('1st', '1st').replace('2st', '2nd').replace('3st', '3rd').replace('4st', '4th'),
          collegeId: college._id,
          course: 'B.Tech',
          enrollmentDate: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
          status: statuses[Math.floor(Math.random() * statuses.length)]
        });

        // Create an admission record for this student
        await Admission.create({
          referenceId: `ADM${college.collegeCode}${1000 + i}`,
          entityName: `Admission - ${student.studentName}`,
          collegeId: college._id,
          date: student.enrollmentDate,
          countValue: Math.floor(Math.random() * 50000) + 10000,
          status: 'Completed'
        });
      }
    }

    console.log('Data seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
