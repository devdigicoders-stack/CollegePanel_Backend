const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "A", "B", "C"
  courseName: { type: String, required: true },
  semester: { type: Number, required: true },
  classTeacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Teacher'
  },
  classTeacherName: { type: String }, // For backward compatibility and display
  totalStudents: { type: Number, default: 0 },
  room: { type: String, default: '' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Section', sectionSchema);
