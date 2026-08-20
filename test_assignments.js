const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const AssignmentSubmission = require('./models/AssignmentSubmission');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const assignments = await Assignment.find({});
  console.log('Total assignments:', assignments.length);
  assignments.forEach(a => {
    console.log(`- ${a.title}, Course: ${a.course}, Branch: ${a.department}, Sem: ${a.semester}, Due: ${a.dueDate}, Now: ${new Date()}`);
  });
  process.exit();
});
