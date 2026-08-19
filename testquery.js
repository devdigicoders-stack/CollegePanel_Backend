const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const StudyMaterial = require('./models/StudyMaterial');
const Admission = require('./models/Admission');
const Student = require('./models/Student');

mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:KoJGvdKsGU9IQQvk@cluster0.9ssqshr.mongodb.net/crm_clg_dct?retryWrites=true&w=majority').then(async () => {
  const queryOr = [];
  queryOr.push({ course: { $regex: new RegExp('AIML', 'i') } });
  queryOr.push({ course: { $regex: new RegExp('Computer Science', 'i') } });
  
  console.log('Query:', JSON.stringify(queryOr));
  
  const match = await Assignment.find({ $or: queryOr }, 'course collegeId');
  console.log('Matches:', match);
  
  process.exit(0);
});
