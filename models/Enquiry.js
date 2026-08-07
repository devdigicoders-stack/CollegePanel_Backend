const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  enquiryNo: { type: String, required: true, unique: true },
  studentName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  email: { type: String },
  parentName: { type: String },
  courseInterested: { type: String, required: true },
  previousQualification: { type: String },
  city: { type: String },
  enquirySource: { 
    type: String, 
    enum: ['Website', 'Phone Call', 'Walk-in', 'Social Media', 'Referral', 'Education Fair', 'Advertisement', 'Other'],
    default: 'Website'
  },
  enquiryDate: { type: Date, default: Date.now },
  assignedCounsellor: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  remarks: { type: String },
  status: { 
    type: String, 
    enum: ['New', 'Contacted', 'Interested', 'Follow-up', 'Not Interested', 'Converted', 'Closed'],
    default: 'New' 
  },
  isDuplicate: { type: Boolean, default: false },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  notes: [{ 
    note: String, 
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    addedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
