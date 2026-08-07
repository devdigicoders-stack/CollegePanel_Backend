const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  status: { 
    type: String, 
    enum: ['Active', 'Inactive'], 
    default: 'Active' 
  },
  permissions: {
    type: [String],
    default: []
  },
  collegeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'College', 
    required: true 
  }
}, { timestamps: true });

// Compound index for unique role name per college
roleSchema.index({ name: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
