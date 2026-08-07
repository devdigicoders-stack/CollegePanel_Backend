const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  followUpNo: { type: String, required: true, unique: true },
  enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry', required: true },
  followUpDate: { type: Date, required: true },
  callStatus: { 
    type: String, 
    enum: ['Interested', 'Call Later', 'Visit Scheduled', 'Application Started', 'Not Interested', 'No Response'],
    required: true 
  },
  counsellorNotes: { type: String },
  nextFollowUpDate: { type: Date },
  studentInterestLevel: { 
    type: String, 
    enum: ['Very High', 'High', 'Medium', 'Low', 'Not Interested'],
    default: 'Medium' 
  },
  assignedCounsellor: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  reminderSent: { type: Boolean, default: false },
  reminderSentAt: { type: Date },
  communicationHistory: [{
    type: String,
    timestamp: { type: Date, default: Date.now }
  }],
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('FollowUp', followUpSchema);
