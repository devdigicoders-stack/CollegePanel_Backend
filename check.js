const mongoose = require('mongoose');
const Timetable = require('./models/Timetable');
const Student = require('./models/Student');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const students = await Student.find({}).limit(1);
  if (students.length === 0) {
    console.log("No students");
  } else {
    const s = students[0];
    console.log("Student course:", s.course, "branch:", s.branch);
    
    const tt = await Timetable.find({});
    console.log("Total Timetables:", tt.length);
    if (tt.length > 0) {
      console.log("Sample Timetable course:", tt[0].course, "semester:", tt[0].semester);
    }
  }
  process.exit();
}
check();
