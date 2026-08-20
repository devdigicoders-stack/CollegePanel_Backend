const mongoose = require('mongoose');

const subjectAllocationSchema = new mongoose.Schema({
  teacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Teacher',
    required: true
  },
  teacherName: { 
    type: String, 
    required: true 
  },
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course',
    required: true
  },
  courseName: { 
    type: String, 
    required: true 
  },
  department: {
    type: String,
    required: true
  },
  semester: { 
    type: Number, 
    required: true 
  },
  subject: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject',
    required: true
  },
  subjectName: { 
    type: String, 
    required: true 
  },
  subjectCode: { 
    type: String, 
    required: true 
  },
  collegeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'College', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Active', 'Inactive'], 
    default: 'Active' 
  },
  geoFence: {
    isEnabled: { type: Boolean, default: false },
    lat: { type: Number },
    lng: { type: Number },
    radius: { type: Number, default: 50 } // meters
  }
}, { timestamps: true });

// Prevent duplicate allocation of the same subject in the same semester & course to any teacher
// Optional: a teacher can teach multiple subjects, but a subject in a specific course/semester is usually taught by one teacher (per section, but we don't have section here, so let's just keep it simple without unique constraint for now)

module.exports = mongoose.model('SubjectAllocation', subjectAllocationSchema);
