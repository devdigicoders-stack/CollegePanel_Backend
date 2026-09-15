const mongoose = require('mongoose');

const upgradeRequestSchema = new mongoose.Schema({
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true
  },
  collegeName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  phone: { type: String, required: true },
  moduleName: { type: String, required: true },
  moduleKey: { 
    type: String, 
    required: true, 
    enum: ['hostel', 'mess', 'library', 'complaints', 'security', 'all'] 
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  notes: { type: String, default: '' },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  actionBy: { type: String, default: 'SuperAdmin' }
}, { timestamps: true });

module.exports = mongoose.model('UpgradeRequest', upgradeRequestSchema);
