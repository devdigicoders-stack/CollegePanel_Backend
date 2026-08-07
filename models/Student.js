const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  studentName: { type: String, required: true },
  email: { type: String, default: 'student@example.com' },
  phone: { type: String, default: '+91 9000000000' },
  gender: { type: String, default: 'Male' },
  dob: { type: Date, default: new Date('2002-01-01') },
  address: { type: String, default: 'Kanpur, Uttar Pradesh, India' },
  bloodGroup: { type: String, default: '' },
  fatherName: { type: String, default: '' },
  emergencyContact: { type: String, default: '' },
  branch: { type: String, default: 'Computer Science' },
  year: { type: String, default: '1st Year' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  course: { type: String, required: true },
  session: { type: String, default: '' },
  enrollmentDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Inactive', 'Graduated', 'Dropped'], default: 'Active' },
  // Portal credentials
  username: { type: String, unique: true, sparse: true },
  password: { type: String, default: 'Student@123' },

  // --- Extended Details from Admission ---
  
  // Demographics
  aadhaar: { type: String, default: '' },
  religion: { type: String, default: '' },
  nationality: { type: String, default: 'Indian' },
  category: { type: String, default: '' },
  admissionType: { type: String, default: '' },

  // Parent/Guardian Details
  motherName: { type: String, default: '' },
  motherMobile: { type: String, default: '' },
  motherOccupation: { type: String, default: '' },
  fatherMobile: { type: String, default: '' },
  fatherOccupation: { type: String, default: '' },
  guardianName: { type: String, default: '' },
  guardianMobile: { type: String, default: '' },
  annualIncome: { type: String, default: '' },
  parentEducation: { type: String, default: '' },

  // Address Details
  city: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  permanentAddress: { type: String, default: '' },
  permanentCity: { type: String, default: '' },
  permanentPincode: { type: String, default: '' },

  // Academic History
  prevSchool: { type: String, default: '' },
  board: { type: String, default: '' },
  passingYear: { type: String, default: '' },
  percentage: { type: String, default: '' },
  qualification: { type: String, default: '' },
  stream: { type: String, default: '' },
  entranceName: { type: String, default: '' },
  entranceScore: { type: String, default: '' },
  rank: { type: String, default: '' },
  gapYear: { type: String, default: '' },

  // Other Details
  feePlan: { type: String, default: '' },
  transportRequired: { type: String, default: 'No' },
  hostelRequired: { type: String, default: 'No' },

  // Documents
  documents: [{
    name: { type: String },
    url: { type: String },
    status: { type: String, default: 'Verified' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
