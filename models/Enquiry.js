const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  enquiryNo: {
    type: String,
    unique: true,
    sparse: true
  },
  fullName: {
    type: String,
    required: [true, 'Full Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  collegeName: {
    type: String,
    required: [true, 'Institution / College Name is required'],
    trim: true
  },
  institutionType: {
    type: String,
    default: 'Engineering / Polytechnic College',
    trim: true
  },
  studentStrength: {
    type: String,
    default: '1,000 - 3,000 Students',
    trim: true
  },
  selectedModules: [{
    type: String
  }],
  message: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'In Progress', 'Converted', 'Closed'],
    default: 'New'
  },
  notes: {
    type: String,
    default: ''
  },
  actionTakenBy: {
    type: String,
    default: ''
  },
  isWebsiteLead: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Enquiry', enquirySchema, 'enquiries');
