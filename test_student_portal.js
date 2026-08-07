const mongoose = require('mongoose');
const studentPortalController = require('./controllers/studentPortalController');
const Student = require('./models/Student');
const College = require('./models/College');
const dotenv = require('dotenv');

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dct_clg_crm'); 
  
  const college = await College.findOne();
  const student = await Student.findOne({ collegeId: college._id });

  const req = {
    college: college,
    student: student
  };
  
  const res = {
    status: (code) => {
      return {
        json: (data) => console.log('Status:', code)
      };
    },
    json: (data) => console.log('Data OK')
  };

  try {
    console.log("Testing profile...");
    await studentPortalController.getProfile(req, res);
    
    console.log("Testing stats...");
    await studentPortalController.getDashboardStats(req, res);
    
    console.log("Testing timetable...");
    await studentPortalController.getTimetable(req, res);
  } catch (e) {
    console.error("Caught Exception:", e);
  }
  mongoose.connection.close();
}

test().catch(console.error);
