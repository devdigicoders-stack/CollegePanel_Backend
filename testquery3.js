const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const Admission = require('./models/Admission');
const Student = require('./models/Student');

mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:KoJGvdKsGU9IQQvk@cluster0.9ssqshr.mongodb.net/crm_clg_dct?retryWrites=true&w=majority').then(async () => {
  const applicants = await Admission.find();
  console.log('--- APPLICANTS ---');
  for (const a of applicants) {
    const queryOr = [];
    if (a.course) queryOr.push({ course: { $regex: new RegExp(a.course.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } });
    if (a.branch) queryOr.push({ course: { $regex: new RegExp(a.branch.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } });
    const count = queryOr.length > 0 ? await Assignment.countDocuments({ $or: queryOr }) : 0;
    console.log(a.name, '| Course:', a.course, '| Branch:', a.branch, '| Matches:', count);
  }
  
  const students = await Student.find();
  console.log('\n--- STUDENTS ---');
  for (const s of students) {
    const queryOr = [];
    if (s.course) queryOr.push({ course: { $regex: new RegExp(s.course.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } });
    if (s.branch) queryOr.push({ course: { $regex: new RegExp(s.branch.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } });
    const count = queryOr.length > 0 ? await Assignment.countDocuments({ $or: queryOr }) : 0;
    console.log(s.studentName, '| Course:', s.course, '| Branch:', s.branch, '| Matches:', count);
  }
  process.exit(0);
});
