const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/Desktop/DCT_CLG_CRM/backend/.env' });
const LibraryBook = require('./models/LibraryBook');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const books = await LibraryBook.find().limit(10);
  console.log('Total books in DB:', books.length);
  books.forEach(b => console.log(b.title, b.collegeId));
  process.exit(0);
}
test();
