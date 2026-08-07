const Teacher = require('../models/Teacher');

// Get all teachers
exports.getTeachers = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found in request' });
    }

    const collegeId = req.college._id;
    
    // Filtering, searching, and sorting
    const { page = 1, limit = 10, department, designation, status, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build query filters
    let query = { collegeId };

    if (department && department !== 'All Departments' && department !== '') {
      query.department = department;
    }
    if (designation && designation !== 'All Designations' && designation !== '') {
      query.designation = designation;
    }
    if (status && status !== 'All Status' && status !== '') {
      query.status = status;
    }

    // Search by name or empId or mobile
    if (search && search !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { empId: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = order === 'desc' ? -1 : 1;

    // Fetch data
    const teachers = await Teacher.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Get total count for pagination
    const total = await Teacher.countDocuments(query);

    res.status(200).json({
      message: 'Teachers fetched successfully',
      data: teachers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Get Teachers Error:', error);
    res.status(500).json({ message: 'Error fetching teachers', error: error.message });
  }
};

// Get single teacher by ID
exports.getTeacherById = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const teacherId = req.params.id;

    const teacher = await Teacher.findOne({ _id: teacherId, collegeId }).select('-__v');

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.status(200).json({
      message: 'Teacher fetched successfully',
      data: teacher
    });
  } catch (error) {
    console.error('Get Teacher By ID Error:', error);
    res.status(500).json({ message: 'Error fetching teacher', error: error.message });
  }
};

// Create new teacher
exports.createTeacher = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const { name, email, mobile, department, designation, dateOfBirth, gender, dateOfJoining, qualification, experience, payScale, status } = req.body;

    // Validation
    if (!name || !email || !mobile || !department || !designation || !dateOfJoining) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if email already exists for this college
    const existingTeacher = await Teacher.findOne({ email, collegeId });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email already exists for this college' });
    }

    // Handle profile image upload
    let profileImage = null;
    if (req.file) {
      profileImage = `/uploads/teachers/${req.file.filename}`;
    }

    // Create teacher
    const newTeacher = new Teacher({
      name,
      email,
      mobile,
      profileImage,
      department,
      designation,
      dateOfBirth,
      gender,
      dateOfJoining,
      qualification,
      experience,
      payScale,
      status: status || 'Active',
      collegeId
    });

    await newTeacher.save();

    res.status(201).json({
      message: 'Teacher created successfully',
      data: newTeacher
    });
  } catch (error) {
    console.error('Create Teacher Error:', error);
    res.status(500).json({ message: 'Error creating teacher', error: error.message });
  }
};

// Update teacher
exports.updateTeacher = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const teacherId = req.params.id;
    const { name, email, mobile, department, designation, dateOfBirth, gender, dateOfJoining, qualification, experience, payScale, status } = req.body;

    // Check if teacher exists
    const teacher = await Teacher.findOne({ _id: teacherId, collegeId });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== teacher.email) {
      const existingTeacher = await Teacher.findOne({ email, collegeId });
      if (existingTeacher) {
        return res.status(400).json({ message: 'Email already exists for this college' });
      }
    }

    // Handle profile image upload
    if (req.file) {
      // Delete old image if exists
      if (teacher.profileImage) {
        const fs = require('fs');
        const path = require('path');
        const oldImagePath = path.join(__dirname, '..', teacher.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      teacher.profileImage = `/uploads/teachers/${req.file.filename}`;
    }

    // Update fields
    if (name) teacher.name = name;
    if (email) teacher.email = email;
    if (mobile) teacher.mobile = mobile;
    if (department) teacher.department = department;
    if (designation) teacher.designation = designation;
    if (dateOfBirth) teacher.dateOfBirth = dateOfBirth;
    if (gender) teacher.gender = gender;
    if (dateOfJoining) teacher.dateOfJoining = dateOfJoining;
    if (qualification) teacher.qualification = qualification;
    if (experience) teacher.experience = experience;
    if (payScale) teacher.payScale = payScale;
    if (status) teacher.status = status;

    await teacher.save();

    res.status(200).json({
      message: 'Teacher updated successfully',
      data: teacher
    });
  } catch (error) {
    console.error('Update Teacher Error:', error);
    res.status(500).json({ message: 'Error updating teacher', error: error.message });
  }
};

// Delete teacher
exports.deleteTeacher = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const teacherId = req.params.id;

    const teacher = await Teacher.findOneAndDelete({ _id: teacherId, collegeId });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.status(200).json({
      message: 'Teacher deleted successfully',
      data: teacher
    });
  } catch (error) {
    console.error('Delete Teacher Error:', error);
    res.status(500).json({ message: 'Error deleting teacher', error: error.message });
  }
};

// Get unique departments for filter
exports.getDepartments = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const departments = await Teacher.distinct('department', { collegeId });
    
    res.status(200).json({
      message: 'Departments fetched successfully',
      data: departments || []
    });
  } catch (error) {
    console.error('Get Departments Error:', error);
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
};

// Get unique designations for filter
exports.getDesignations = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const designations = await Teacher.distinct('designation', { collegeId });
    
    res.status(200).json({
      message: 'Designations fetched successfully',
      data: designations || []
    });
  } catch (error) {
    console.error('Get Designations Error:', error);
    res.status(500).json({ message: 'Error fetching designations', error: error.message });
  }
};

// Get HODs (Teachers with designation = "HOD")
exports.getHods = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    
    // Debug: Log all teachers to see what's in database
    const allTeachers = await Teacher.find({ collegeId }).select('name designation status');
    console.log('All Teachers:', allTeachers);
    
    // Try finding HODs with case-insensitive search
    const hods = await Teacher.find({ 
      collegeId, 
      designation: { $regex: /^HOD$/i }  // Case-insensitive match
    }).select('name email mobile department designation dateOfJoining status profileImage');
    
    console.log('HODs found:', hods.length);
    console.log('HODs data:', hods);
    
    res.status(200).json({
      message: 'HODs fetched successfully',
      data: hods
    });
  } catch (error) {
    console.error('Get HODs Error:', error);
    res.status(500).json({ 
      message: 'Error fetching HODs', 
      error: error.message 
    });
  }
};

// Get all teachers list for dropdown (id and name only)
exports.getTeachersForDropdown = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const teachers = await Teacher.find({ 
      collegeId, 
      status: 'Active' 
    }).select('name department designation').sort({ name: 1 });
    
    res.status(200).json({
      message: 'Teachers list fetched successfully',
      data: teachers
    });
  } catch (error) {
    console.error('Get Teachers List Error:', error);
    res.status(500).json({ message: 'Error fetching teachers list', error: error.message });
  }
};
