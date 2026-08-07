const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  empId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  mobile: { 
    type: String, 
    required: true 
  },
  profileImage: {
    type: String,
    default: null
  },
  dateOfBirth: { 
    type: Date 
  },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'Other'] 
  },
  department: { 
    type: String, 
    required: true 
  },
  designation: { 
    type: String, 
    required: true 
    // No enum - accepts any designation from Designation collection
  },
  dateOfJoining: { 
    type: Date, 
    required: true 
  },
  qualification: { 
    type: String 
  },
  experience: { 
    type: String 
  },
  payScale: { 
    type: String 
  },
  status: { 
    type: String, 
    default: 'Active', 
    enum: ['Active', 'On Leave', 'Inactive'] 
  },
  // Login credentials (auto-generated)
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String
  },
  collegeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'College', 
    required: true 
  }
}, { 
  timestamps: true 
});

// Auto-generate empId and credentials before saving
teacherSchema.pre('save', async function() {
  if (!this.empId) {
    const count = await mongoose.model('Teacher').countDocuments({ 
      collegeId: this.collegeId 
    });
    this.empId = `EMP${Date.now()}${count + 1}`;
  }
  
  // Auto-generate username and password if not exists
  if (!this.username && this.name) {
    // Username: firstname.lastname (lowercase, no spaces)
    const nameParts = this.name.toLowerCase().split(' ');
    let baseUsername = nameParts.join('.');
    
    let username = baseUsername;
    let counter = 1;
    let userExists = await mongoose.model('Teacher').findOne({ username });
    
    while (userExists) {
      username = `${baseUsername}${counter}`;
      counter++;
      userExists = await mongoose.model('Teacher').findOne({ username });
    }
    
    this.username = username;
  }
  
  if (!this.password) {
    // Password: Teacher@123 (simple default password)
    this.password = 'Teacher@123';
  }
});

module.exports = mongoose.model('Teacher', teacherSchema);