const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/Desktop/DCT_CLG_CRM/backend/.env' });
const College = require('./models/College');
const LibraryBook = require('./models/LibraryBook');

async function seedMore() {
  await mongoose.connect(process.env.MONGO_URI);
  const college = await College.findOne({ code: 'gpkanpur' }) || await College.findOne();
  
  if (!college) {
    console.log('No college found');
    process.exit(1);
  }

  // Create 12 more books to total 15
  const booksToCreate = [];
  for (let i = 1; i <= 12; i++) {
    booksToCreate.push({
      collegeId: college._id,
      title: `Dummy Book ${i}`,
      author: `Author ${i}`,
      isbn: `978-00000000${i.toString().padStart(2, '0')}`,
      category: i % 2 === 0 ? 'Computer Science' : 'Electronics',
      accessionNo: `DUM-${1000 + i}`,
      totalCopies: 5,
      availableCopies: 5,
      shelf: `Rack D${i}`,
      price: 500,
      status: 'Available'
    });
  }

  await LibraryBook.insertMany(booksToCreate);
  console.log('Inserted 12 dummy books');
  process.exit(0);
}

seedMore();
