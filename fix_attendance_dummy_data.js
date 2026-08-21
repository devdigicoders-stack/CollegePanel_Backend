const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const StudentAttendance = require('./models/StudentAttendance');

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log('Connected to MongoDB');
  const records = await StudentAttendance.find();
  const seenDates = new Set();
  
  for (let record of records) {
    const dateStr = record.date.toISOString().split('T')[0];
    const key = `${record.classId}_${dateStr}`;
    
    if (seenDates.has(key)) {
      console.log(`Deleting duplicate record for ${key}`);
      await StudentAttendance.findByIdAndDelete(record._id);
    } else {
      seenDates.add(key);
      // Normalize to start of day
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      record.date = startOfDay;
      await record.save();
    }
  }
  
  console.log('Cleanup complete');
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
