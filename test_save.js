const mongoose = require('mongoose');
const SuperAdmin = require('./models/SuperAdmin');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const superAdmin = await SuperAdmin.findOne();
    if (superAdmin) {
      superAdmin.name = "Super Admin";
      superAdmin.profileImage = "";
      const updatedSuperAdmin = await superAdmin.save();
      console.log('Saved successfully:', updatedSuperAdmin);
    } else {
      console.log('SuperAdmin not found');
    }
  } catch (error) {
    console.error('Save failed:', error);
  }
  mongoose.connection.close();
}).catch(err => {
  console.error('DB connection error:', err);
});
