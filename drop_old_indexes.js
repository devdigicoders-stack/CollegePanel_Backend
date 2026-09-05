require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Drop old indexes if they exist
    try { await db.collection('courses').dropIndex('code_1'); console.log('Dropped code_1 from courses'); } catch(e) { console.log('course code_1 not found'); }
    try { await db.collection('subjects').dropIndex('code_1'); console.log('Dropped code_1 from subjects'); } catch(e) { console.log('subject code_1 not found'); }
    
    // Some models like Designation might have old indexes
    try { await db.collection('designations').dropIndex('name_1'); console.log('Dropped name_1 from designations'); } catch(e) { console.log('designation name_1 not found'); }

    // Re-create the compound indexes (Mongoose normally does this automatically on startup, but we do it manually to be safe)
    await db.collection('courses').createIndex({ code: 1, collegeId: 1 }, { unique: true });
    await db.collection('subjects').createIndex({ code: 1, collegeId: 1 }, { unique: true });
    await db.collection('departments').createIndex({ name: 1, collegeId: 1 }, { unique: true });
    await db.collection('designations').createIndex({ name: 1, collegeId: 1 }, { unique: true });

    console.log('Successfully updated indexes');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing indexes:', error);
    process.exit(1);
  }
}

fixIndexes();
