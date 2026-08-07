const mongoose = require('mongoose');
const SuperAdmin = require('./models/SuperAdmin');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const superAdmins = await SuperAdmin.find();
  console.log('SuperAdmins in DB:', superAdmins);
  mongoose.connection.close();
}).catch(err => {
  console.error('DB connection error:', err);
});
