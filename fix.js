const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:KoJGvdKsGU9IQQvk@cluster0.9ssqshr.mongodb.net/crm_clg_dct?retryWrites=true&w=majority').then(async () => {
  const Assignment = require('./models/Assignment');
  const Student = require('./models/Student');
  const assignments = await Assignment.find();
  for (const a of assignments) {
    const total = await Student.countDocuments({
      collegeId: a.collegeId,
      status: 'Active',
      $or: [ { course: a.course }, { branch: a.course } ]
    });
    await Assignment.findByIdAndUpdate(a._id, { totalStudents: total });
  }
  console.log('Fixed totalStudents');
  process.exit(0);
}).catch(console.error);
