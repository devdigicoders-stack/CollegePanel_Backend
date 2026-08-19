const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const Student = require('./models/Student');

mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:KoJGvdKsGU9IQQvk@cluster0.9ssqshr.mongodb.net/crm_clg_dct?retryWrites=true&w=majority').then(async () => {
  const student = await Student.findOne({ studentName: 'Shiva Vishwakarma' });
  const cid = student.collegeId;
  
  const queryOr = [];
  queryOr.push({ course: { $regex: new RegExp(student.course, 'i') } });
  queryOr.push({ course: { $regex: new RegExp(student.branch, 'i') } });
  
  const total = await Assignment.countDocuments({
    collegeId: cid,
    $or: queryOr
  });
  
  console.log('Total Assignments for Shiva:', total);
  
  const match = await Assignment.find({ collegeId: cid, $or: queryOr }, 'course collegeId');
  console.log('Matches for Shiva:', match);
  
  process.exit(0);
});
