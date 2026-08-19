const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const collegeSchema = new mongoose.Schema({
  // College Information
  collegeName: { type: String, required: true },
  collegeCode: { type: String, required: true, unique: true },
  collegeType: { type: String, required: true, enum: ['Government', 'Private', 'Aided', 'PPP'] },
  aicteCode: { type: String, default: '' },
  affiliationNumber: { type: String, default: '' },
  establishedYear: { type: String, default: '' },
  contactNumber: { type: String, default: '' },
  website: { type: String, default: '' },
  officialEmail: { type: String, default: '' },
  collegeLogo: { type: String, default: '' },

  // Address Information
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  pinCode: { type: String, default: '' },
  
  // College Location
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },

  // Principal Information
  principalName: { type: String, default: '' },
  principalEmail: { type: String, default: '' },
  principalQualification: { type: String, default: '' },

  // Admin Information
  adminName: { type: String, required: true },
  adminEmail: { type: String, required: true, unique: true },
  adminMobile: { type: String, default: '' },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rawPassword: { type: String }, // Storing plaintext password as requested by user
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Hash password before saving
collegeSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
collegeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('College', collegeSchema);
