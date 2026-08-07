const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  empId: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String, required: true },
  dateOfJoining: { type: Date },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  address: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' },
  profilePhoto: { type: String, default: '' },
  // Login credentials (auto-generated)
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String
  },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

// Helper function to generate unique random password
const generateUniquePassword = (name, empId) => {
  // Create a base from first name (capitalized)
  const firstName = name.split(' ')[0];
  const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  
  // Generate random 4-digit number
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  
  // Special characters for randomness
  const specialChars = ['@', '#', '$', '!'];
  const randomSpecialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Format: FirstName@RandomNumber or FirstName#RandomNumber
  return `${capitalizedFirstName}${randomSpecialChar}${randomNum}`;
};

// Auto-generate empId and credentials before saving
employeeSchema.pre('save', async function() {
  if (!this.empId) {
    const count = await mongoose.model('Employee').countDocuments({ collegeId: this.collegeId });
    this.empId = `EMP${new Date().getFullYear()}${String(count + 1).padStart(3, '0')}`;
  }
  
  // Auto-generate username and password only on creation (isNew), not on updates
  if (this.isNew) {
    if (!this.username && this.name) {
      // Username: firstname.lastname (lowercase, no spaces)
      const nameParts = this.name.toLowerCase().split(' ');
      const baseUsername = nameParts.join('.');
      
      let username = baseUsername;
      let counter = 1;
      let userExists = await mongoose.model('Employee').findOne({ username });
      
      while (userExists) {
        username = `${baseUsername}${counter}`;
        counter++;
        userExists = await mongoose.model('Employee').findOne({ username });
      }
      
      this.username = username;
    }
    
    if (!this.password) {
      // Password: Unique password with format FirstName@RandomNumber (e.g., Abhilesh@4782)
      this.password = generateUniquePassword(this.name, this.empId);
    }
  }
});

module.exports = mongoose.model('Employee', employeeSchema);