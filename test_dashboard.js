const mongoose = require('mongoose');
const dashboardController = require('./controllers/dashboardController');
const dotenv = require('dotenv');

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dct_clg_crm'); 
  
  // Need a valid college ID from db
  const College = require('./models/College');
  const college = await College.findOne();

  const req = {
    college: college
  };
  
  const res = {
    status: (code) => {
      return {
        json: (data) => console.log('Status:', code, 'Data:', JSON.stringify(data).substring(0, 100))
      };
    },
    json: (data) => console.log('Data:', JSON.stringify(data).substring(0, 100))
  };

  try {
    await dashboardController.getOverview(req, res);
  } catch (e) {
    console.error("Caught Exception:", e);
  }
  mongoose.connection.close();
}

test().catch(console.error);
