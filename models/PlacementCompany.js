const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  industry: { type: String },
  website: { type: String },
  contactPerson: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'Blacklisted'], default: 'Active' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('PlacementCompany', companySchema);
