require('dotenv').config();
const mongoose = require('mongoose');

const dropIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const db = mongoose.connection.db;
    
    // Check if the index exists on 'admissions' collection
    const indexes = await db.collection('admissions').indexes();
    console.log('Current Indexes:', indexes);
    
    // Drop referenceId_1 if it exists
    const hasRefIndex = indexes.some(idx => idx.name === 'referenceId_1');
    if (hasRefIndex) {
      await db.collection('admissions').dropIndex('referenceId_1');
      console.log('Dropped referenceId_1 index successfully.');
    } else {
      console.log('Index referenceId_1 not found.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

dropIndex();
