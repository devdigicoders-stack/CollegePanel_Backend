const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  appNo: { type: String, required: true, unique: true },
  name: { type: String },
  course: { type: String },
  mobile: { type: String },
  email: { type: String },
  parentName: { type: String },
  academicSession: { type: String },
  session: { type: String },
  branch: { type: String },
  year: { type: String },
  category: { type: String },
  admissionType: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  dob: { type: String },
  gender: { type: String },
  aadhaar: { type: String },
  religion: { type: String },
  nationality: { type: String },
  bloodGroup: { type: String },
  fatherMobile: { type: String },
  fatherOccupation: { type: String },
  motherName: { type: String },
  motherMobile: { type: String },
  motherOccupation: { type: String },
  guardianName: { type: String },
  guardianMobile: { type: String },
  annualIncome: { type: String },
  parentEducation: { type: String },
  currentAddress: { type: String },
  city: { type: String },
  district: { type: String },
  state: { type: String },
  pincode: { type: String },
  permanentAddress: { type: String },
  permanentCity: { type: String },
  permanentPincode: { type: String },
  prevSchool: { type: String },
  board: { type: String },
  passingYear: { type: String },
  percentage: { type: String },
  qualification: { type: String },
  stream: { type: String },
  entranceName: { type: String },
  entranceScore: { type: String },
  rank: { type: String },
  gapYear: { type: String },
  department: { type: String },
  hostelRequired: { type: String },
  transportRequired: { type: String },
  hostelType: { type: String },
  scholarshipApplicable: { type: String },
  scholarshipType: { type: String },
  scholarshipScheme: { type: String },
  expectedScholarship: { type: String },
  scholarshipStatus: { type: String },
  feePlan: { type: String },
  paymentMode: { type: String },

  stage: { 
    type: String, 
    enum: ['Enquiry', 'Application', 'Document Verification', 'Admitted', 'Cancelled'], 
    default: 'Enquiry' 
  },
  status: { 
    type: String, 
    enum: ['New', 'In Progress', 'Pending', 'Confirmed', 'Incomplete', 'Pending Verification', 'Verified', 'Approved', 'Rejected', 'On Hold'], 
    default: 'New' 
  },
  remarks: { type: String },
  documents: [{
    name: { type: String },
    url: { type: String },
    status: { 
      type: String, 
      enum: ['Verified', 'Pending', 'Rejected', 'Correction Required', 'Not Uploaded', 'Not Applicable'],
      default: 'Pending'
    }
  }],
  // Registration fields (assigned after admission approval)
  enrollNo: { type: String },
  studentId: { type: String },
  rollNo: { type: String },
  semester: { type: String },
  section: { type: String },
  registrationStatus: { 
    type: String, 
    enum: ['Pending Registration', 'Registered'],
    default: 'Pending Registration'
  }
}, { timestamps: true });

module.exports = mongoose.model('Admission', admissionSchema);
