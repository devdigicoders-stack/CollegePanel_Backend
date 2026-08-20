const mongoose = require('mongoose');
const StudyMaterial = require('./models/StudyMaterial');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const materials = await StudyMaterial.find({});
  console.log('Total materials:', materials.length);
  materials.forEach(m => {
    console.log(`- Title: ${m.title}, Course: ${m.course}, Branch/Department: ${m.department}, Sem: ${m.semester}, Subject: ${m.subject}`);
  });
  process.exit();
});
