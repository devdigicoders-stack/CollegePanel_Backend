const Admission = require('../models/Admission');
const Student = require('../models/Student');


// @desc    Get all admissions for a specific college with pagination and filters
// @route   GET /api/admissions
// @access  Private (College Admin)
exports.getAdmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, stage, status, startDate, endDate, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = { collegeId: req.college._id };

    if (stage) filter.stage = stage;
    if (status) filter.status = status;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Search filter (name, mobile, or appNo)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { appNo: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await Admission.countDocuments(filter);

    // Get paginated results
    const admissions = await Admission.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      admissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching admissions', error: error.message });
  }
};

// @desc    Get single admission by ID
// @route   GET /api/admissions/:id
// @access  Private (College Admin)
exports.getAdmissionById = async (req, res) => {
  try {
    const admission = await Admission.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    res.json(admission);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching admission', error: error.message });
  }
};

// @desc    Create new admission
// @route   POST /api/admissions
// @access  Private (College Admin)
exports.createAdmission = async (req, res) => {
  try {
    const { appNo, name, course, mobile, email, parentName, academicSession, category, admissionType, stage = 'Application', status = 'New', documents, ...otherFields } = req.body;

    // Validation
    if (!appNo) {
      return res.status(400).json({ message: 'Application number is required' });
    }

    // Check if appNo already exists
    const existingAdmission = await Admission.findOne({ appNo });
    if (existingAdmission) {
      return res.status(400).json({ message: 'Application number already exists' });
    }

    // Initialize default documents based on stage
    const finalDocuments = documents && documents.length > 0 ? documents : [
      { name: 'Photograph', status: 'Not Uploaded' },
      { name: 'Aadhaar Card', status: 'Not Uploaded' },
      { name: '10th Marksheet', status: 'Not Uploaded' },
      { name: 'Transfer Certificate', status: 'Not Uploaded' },
      { name: 'Character Certificate', status: 'Not Uploaded' }
    ];

    // Create admission
    const admission = new Admission({
      appNo,
      name,
      course,
      mobile,
      email,
      parentName,
      academicSession,
      category,
      admissionType,
      stage,
      status,
      documents: finalDocuments,
      collegeId: req.college._id,
      ...otherFields
    });

    await admission.save();

    res.status(201).json({
      message: 'Admission created successfully',
      admission
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating admission', error: error.message });
  }
};

// @desc    Create new public admission (submitted by student)
// @route   POST /api/admissions/public/:collegeId
// @access  Public
exports.createPublicAdmission = async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { name, course, mobile, email, parentName, dob, gender, currentAddress, city, state, documents, ...otherFields } = req.body;

    if (!collegeId) {
      return res.status(400).json({ message: 'College ID is required' });
    }

    // Generate Application Number dynamically
    const year = new Date().getFullYear();
    const count = await Admission.countDocuments({ collegeId });
    const padded = (count + 1).toString().padStart(4, '0');
    const appNo = `APP/${year}/${padded}`;

    // Initialize default documents based on stage
    const finalDocuments = documents && documents.length > 0 ? documents : [
      { name: 'Photograph', status: 'Not Uploaded' },
      { name: 'Aadhaar Card', status: 'Not Uploaded' },
      { name: '10th Marksheet', status: 'Not Uploaded' },
      { name: 'Transfer Certificate', status: 'Not Uploaded' },
      { name: 'Character Certificate', status: 'Not Uploaded' }
    ];

    // Create admission
    const admission = new Admission({
      appNo,
      name,
      course,
      mobile,
      email,
      parentName,
      dob,
      gender,
      currentAddress,
      city,
      state,
      stage: 'Application',
      status: 'Pending',
      documents: finalDocuments,
      collegeId,
      ...otherFields
    });

    await admission.save();

    res.status(201).json({
      message: 'Registration details submitted successfully',
      admission,
      appNo
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error submitting registration details', error: error.message });
  }
};

// @desc    Update admission
// @route   PUT /api/admissions/:id
// @access  Private (College Admin)
exports.updateAdmission = async (req, res) => {
  try {
    const { name, course, mobile, email, parentName, academicSession, category, admissionType, stage, status, remarks } = req.body;

    // Find admission and verify it belongs to this college
    let admission = await Admission.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    // Update fields
    if (name) admission.name = name;
    if (course) admission.course = course;
    if (mobile) admission.mobile = mobile;
    if (email) admission.email = email;
    if (parentName) admission.parentName = parentName;
    if (academicSession) admission.academicSession = academicSession;
    if (category) admission.category = category;
    if (admissionType) admission.admissionType = admissionType;
    if (stage) admission.stage = stage;
    if (status) admission.status = status;
    if (remarks) admission.remarks = remarks;

    await admission.save();

    res.json({
      message: 'Admission updated successfully',
      admission
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating admission', error: error.message });
  }
};

// @desc    Update document status
// @route   PUT /api/admissions/:id/documents/:docId
// @access  Private (College Admin)
exports.updateDocumentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const admission = await Admission.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    const document = admission.documents.id(req.params.docId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    document.status = status;
    await admission.save();

    res.json({
      message: 'Document status updated',
      admission
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating document status', error: error.message });
  }
};

// @desc    Delete admission
// @route   DELETE /api/admissions/:id
// @access  Private (College Admin)
exports.deleteAdmission = async (req, res) => {
  try {
    const admission = await Admission.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    await Admission.deleteOne({ _id: req.params.id });

    res.json({
      message: 'Admission deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting admission', error: error.message });
  }
};

// @desc    Register student (assign enrollment no, student ID, roll no)
// @route   PUT /api/admissions/:id/register
// @access  Private (College Admin)
exports.registerStudent = async (req, res) => {
  try {
    const { enrollNo, studentId, rollNo, semester, section } = req.body;

    const admission = await Admission.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    if (admission.stage !== 'Admitted') {
      return res.status(400).json({ message: 'Only admitted students can be registered' });
    }

    // Auto-generate IDs if not provided
    const year = new Date().getFullYear();
    const count = await Admission.countDocuments({ 
      collegeId: req.college._id, 
      registrationStatus: 'Registered' 
    });
    const padded = (count + 1).toString().padStart(3, '0');

    admission.enrollNo = enrollNo || `ENR/${year}/${padded}`;
    admission.studentId = studentId || `STU${year}${padded}`;
    admission.rollNo = rollNo || `${padded}`;
    admission.semester = semester || '1st';
    admission.section = section || 'A';
    admission.registrationStatus = 'Registered';

    await admission.save();

    // Auto-create Student Record if not exists
    let studentRecord = await Student.findOne({ studentId: admission.studentId });
    if (!studentRecord) {
      studentRecord = await Student.create({
        studentId: admission.studentId,
        studentName: admission.name,
        email: admission.email || `${admission.name.toLowerCase().replace(/\s+/g, '.')}@student.edu`,
        phone: admission.mobile || '',
        gender: admission.gender || 'Male',
        dob: admission.dob ? new Date(admission.dob) : new Date(),
        address: admission.currentAddress || 'N/A',
        course: admission.course,
        session: admission.academicSession || '',
        enrollmentDate: new Date(),
        collegeId: admission.collegeId,
        username: `${admission.name.toLowerCase().replace(/\s+/g, '.')}.${Date.now().toString().slice(-4)}`,
        password: `Student@123`,
        // Demographics
        aadhaar: admission.aadhaar || '',
        religion: admission.religion || '',
        nationality: admission.nationality || 'Indian',
        category: admission.category || '',
        admissionType: admission.admissionType || '',
        // Parent Info
        motherName: admission.motherName || '',
        motherMobile: admission.motherMobile || '',
        motherOccupation: admission.motherOccupation || '',
        fatherName: admission.parentName || '', // parentName represents father usually
        fatherMobile: admission.fatherMobile || '',
        fatherOccupation: admission.fatherOccupation || '',
        guardianName: admission.guardianName || '',
        guardianMobile: admission.guardianMobile || '',
        annualIncome: admission.annualIncome || '',
        parentEducation: admission.parentEducation || '',
        // Full Address
        city: admission.city || '',
        district: admission.district || '',
        state: admission.state || '',
        pincode: admission.pincode || '',
        permanentAddress: admission.permanentAddress || '',
        permanentCity: admission.permanentCity || '',
        permanentPincode: admission.permanentPincode || '',
        // Academics
        prevSchool: admission.prevSchool || '',
        board: admission.board || '',
        passingYear: admission.passingYear || '',
        percentage: admission.percentage || '',
        qualification: admission.qualification || '',
        stream: admission.stream || '',
        entranceName: admission.entranceName || '',
        entranceScore: admission.entranceScore || '',
        rank: admission.rank || '',
        gapYear: admission.gapYear || '',
        // Other
        feePlan: admission.feePlan || '',
        transportRequired: admission.transportRequired || 'No',
        hostelRequired: admission.hostelRequired || 'No',
        // Documents
        documents: admission.documents || []
      });
    }


    res.json({
      message: 'Student registered successfully',
      admission
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error registering student', error: error.message });
  }
};

// @desc    Get Admissions Dashboard Stats
// @route   GET /api/admissions/dashboard-stats
// @access  Private (College Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const collegeId = req.college._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Admissions
    const totalApplications = await Admission.countDocuments({ collegeId, stage: { $ne: 'Enquiry' } });
    const pendingApplications = await Admission.countDocuments({ collegeId, status: 'Pending' });
    const approvedAdmissions = await Admission.countDocuments({ collegeId, stage: 'Admitted' });
    const rejectedAdmissions = await Admission.countDocuments({ collegeId, stage: 'Cancelled' });
    const docVerPending = await Admission.countDocuments({ collegeId, stage: 'Document Verification' });
    const latestPendingApps = await Admission.find({ collegeId, status: 'Pending' }).sort({ createdAt: -1 }).limit(5);
    const feePending = await Admission.countDocuments({ collegeId, status: 'In Progress' }); // Approximation
    
    // Course-wise Admissions for pie chart
    const admissionsByCourse = await Admission.aggregate([
      { $match: { collegeId, stage: 'Admitted' } },
      { $group: { _id: '$course', count: { $sum: 1 } } }
    ]);

    res.json({
      stats: {
        totalApplications,
        pendingApplications,
        approvedAdmissions,
        rejectedAdmissions,
        docVerPending,
        feePending
      },
      latestPendingApps,
      admissionsByCourse
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error fetching admission dashboard stats', error: error.message });
  }
};
