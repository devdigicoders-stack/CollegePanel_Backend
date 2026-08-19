const College = require('../models/College');
const Teacher = require('../models/Teacher');
const Department = require('../models/Department');
const HostelRoom = require('../models/HostelRoom');
const LibraryBook = require('../models/LibraryBook');
const Employee = require('../models/Employee');
const Notice = require('../models/Notice');
const Student = require('../models/Student');
const Admission = require('../models/Admission');
const Lead = require('../models/Lead');

// @desc    Create a new college
// @route   POST /api/colleges
// @access  Private/SuperAdmin
exports.createCollege = async (req, res) => {
  try {
    const {
      collegeName,
      collegeCode,
      collegeType,
      aicteCode,
      affiliationNumber,
      establishedYear,
      contactNumber,
      website,
      officialEmail,
      address,
      city,
      district,
      state,
      pinCode,
      principalName,
      principalEmail,
      principalQualification,
      adminName,
      adminEmail,
      adminMobile,
      username,
      password,
      lat,
      lng,
      radius
    } = req.body;

    // Check if college code already exists
    const codeExists = await College.findOne({ collegeCode });
    if (codeExists) {
      return res.status(400).json({ message: 'College code already exists' });
    }

    // Check if admin email already exists
    const emailExists = await College.findOne({ adminEmail });
    if (emailExists) {
      return res.status(400).json({ message: 'Admin email already exists' });
    }

    // Check if username already exists
    const usernameExists = await College.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Handle logo file upload
    let collegeLogo = '';
    if (req.file) {
      collegeLogo = `/uploads/${req.file.filename}`;
    }

    // Create the college
    const college = await College.create({
      collegeName,
      collegeCode,
      collegeType: collegeType ? (collegeType.toUpperCase() === 'PPP' ? 'PPP' : collegeType.charAt(0).toUpperCase() + collegeType.slice(1).toLowerCase()) : undefined,
      aicteCode: aicteCode || '',
      affiliationNumber: affiliationNumber || '',
      establishedYear: establishedYear || '',
      contactNumber: contactNumber || '',
      website: website || '',
      officialEmail: officialEmail || '',
      collegeLogo,
      address: address || '',
      city: city || '',
      district: district || '',
      state: state || '',
      pinCode: pinCode || '',
      principalName: principalName || '',
      principalEmail: principalEmail || '',
      principalQualification: principalQualification || '',
      adminName,
      adminEmail,
      adminMobile: adminMobile || '',
      username,
      password,
      rawPassword: password,
      isActive: true,
      location: {
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        radius: radius ? Number(radius) : 50
      }
    });

    if (college) {
      res.status(201).json({
        message: 'College created successfully',
        college: {
          _id: college._id,
          collegeName: college.collegeName,
          collegeCode: college.collegeCode,
          adminEmail: college.adminEmail
        }
      });
    } else {
      res.status(400).json({ message: 'Invalid college data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all colleges
// @route   GET /api/colleges
// @access  Private/SuperAdmin
exports.getAllColleges = async (req, res) => {
  try {
    const colleges = await College.find({}).sort({ createdAt: -1 }).lean();
    
    // Fetch dynamic student counts for each college
    const collegesWithCounts = await Promise.all(colleges.map(async (college) => {
      const studentsCount = await Student.countDocuments({ collegeId: college._id });
      return {
        ...college,
        studentsCount
      };
    }));
    
    res.json(collegesWithCounts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Toggle college status
// @route   PATCH /api/colleges/:id/status
// @access  Private/SuperAdmin
exports.toggleCollegeStatus = async (req, res) => {
  try {
    const { isActive, lat, lng, radius } = req.body;
    const college = await College.findById(req.params.id);
    if (college) {
      if (isActive !== undefined) college.isActive = isActive;
    
      if (lat !== undefined || lng !== undefined || radius !== undefined) {
        college.location = {
          lat: lat !== undefined ? Number(lat) : college.location?.lat,
          lng: lng !== undefined ? Number(lng) : college.location?.lng,
          radius: radius !== undefined ? Number(radius) : (college.location?.radius || 50)
        };
      }
      await college.save();
      res.json({ message: 'College status updated', isActive: college.isActive });
    } else {
      res.status(404).json({ message: 'College not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete college
// @route   DELETE /api/colleges/:id
// @access  Private/SuperAdmin
exports.deleteCollege = async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (college) {
      await College.findByIdAndDelete(req.params.id);
      res.json({ message: 'College removed successfully' });
    } else {
      res.status(404).json({ message: 'College not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get college by ID
// @route   GET /api/colleges/:id
// @access  Private/SuperAdmin
exports.getCollegeById = async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (college) {
      res.json(college);
    } else {
      res.status(404).json({ message: 'College not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update college
// @route   PUT /api/colleges/:id
// @access  Private/SuperAdmin
exports.updateCollege = async (req, res) => {
  try {
    const {
      collegeName,
      collegeCode,
      collegeType,
      aicteCode,
      affiliationNumber,
      establishedYear,
      contactNumber,
      website,
      officialEmail,
      address,
      city,
      district,
      state,
      pinCode,
      principalName,
      principalEmail,
      principalQualification,
      adminName,
      adminEmail,
      adminMobile,
      username,
      password,
      lat,
      lng,
      radius
    } = req.body;

    const college = await College.findById(req.params.id);

    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }

    // Check for duplicate collegeCode in other colleges
    if (collegeCode && collegeCode !== college.collegeCode) {
      const codeExists = await College.findOne({ collegeCode, _id: { $ne: college._id } });
      if (codeExists) {
        return res.status(400).json({ message: 'College code already exists' });
      }
    }

    // Check for duplicate adminEmail in other colleges
    if (adminEmail && adminEmail !== college.adminEmail) {
      const emailExists = await College.findOne({ adminEmail, _id: { $ne: college._id } });
      if (emailExists) {
        return res.status(400).json({ message: 'Admin email already exists' });
      }
    }

    // Check for duplicate username in other colleges
    if (username && username !== college.username) {
      const usernameExists = await College.findOne({ username, _id: { $ne: college._id } });
      if (usernameExists) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }

    // Update fields
    college.collegeName = collegeName || college.collegeName;
    college.collegeCode = collegeCode || college.collegeCode;
    college.collegeType = collegeType ? (collegeType.toUpperCase() === 'PPP' ? 'PPP' : collegeType.charAt(0).toUpperCase() + collegeType.slice(1).toLowerCase()) : college.collegeType;
    college.aicteCode = aicteCode !== undefined ? aicteCode : college.aicteCode;
    college.affiliationNumber = affiliationNumber !== undefined ? affiliationNumber : college.affiliationNumber;
    college.establishedYear = establishedYear !== undefined ? establishedYear : college.establishedYear;
    college.contactNumber = contactNumber !== undefined ? contactNumber : college.contactNumber;
    college.website = website !== undefined ? website : college.website;
    college.officialEmail = officialEmail !== undefined ? officialEmail : college.officialEmail;
    college.address = address !== undefined ? address : college.address;
    college.city = city !== undefined ? city : college.city;
    college.district = district !== undefined ? district : college.district;
    college.state = state !== undefined ? state : college.state;
    college.pinCode = pinCode !== undefined ? pinCode : college.pinCode;
    college.principalName = principalName !== undefined ? principalName : college.principalName;
    college.principalEmail = principalEmail !== undefined ? principalEmail : college.principalEmail;
    college.principalQualification = principalQualification !== undefined ? principalQualification : college.principalQualification;
    college.adminName = adminName || college.adminName;
    college.adminEmail = adminEmail || college.adminEmail;
    college.adminMobile = adminMobile !== undefined ? adminMobile : college.adminMobile;
    college.username = username || college.username;
    
    // Only update password if a new one is provided
    if (password && password.trim() !== '') {
      college.password = password;
      college.rawPassword = password; // Update plaintext password
    }
    
    if (lat !== undefined || lng !== undefined || radius !== undefined) {
      college.location = {
        lat: lat !== undefined ? Number(lat) : college.location?.lat,
        lng: lng !== undefined ? Number(lng) : college.location?.lng,
        radius: radius !== undefined ? Number(radius) : (college.location?.radius || 50)
      };
    }

    // Handle logo file upload
    if (req.file) {
      college.collegeLogo = `/uploads/${req.file.filename}`;
    }

    const updatedCollege = await college.save();

    res.json({
      message: 'College updated successfully',
      college: updatedCollege
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get dynamic details by category
// @route   GET /api/colleges/:id/details/:category
// @access  Private/SuperAdmin
exports.getCollegeCategoryDetails = async (req, res) => {
  try {
    const { id, category } = req.params;
    
    // Direct model mapping for categories that don't need complex mapping
    const directModelMap = {
      'teachers': Teacher,
      'departments': Department,
      'employees': Employee,
      'students': Student,
      'admissions': Admission,
      'leads': Lead
    };

    const cat = category.toLowerCase();

    if (directModelMap[cat]) {
      let query = { collegeId: id };

      if (cat === 'students') {
        const { branch, year, session, course, search } = req.query;
        if (branch && branch !== 'All Branches' && branch !== 'All Departments' && branch !== '') query.branch = branch;
        if (year && year !== 'All Years' && year !== '') query.year = year;
        if (session && session !== 'All Sessions' && session !== '') query.session = session;
        if (course && course !== 'All Courses' && course !== '') query.course = course;
        
        if (search && search !== '') {
          query.$or = [
            { studentName: { $regex: search, $options: 'i' } },
            { studentId: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { branch: { $regex: search, $options: 'i' } }
          ];
        }
        
        const students = await Student.find(query).sort({ createdAt: -1 });
        
        // Also fetch admissions (unapproved) with matching filters to show in Superadmin Students tab
        const admissionQuery = { collegeId: id };
        if (branch && branch !== 'All Branches' && branch !== 'All Departments' && branch !== '') admissionQuery.branch = branch;
        if (year && year !== 'All Years' && year !== '') admissionQuery.year = year;
        if (session && session !== 'All Sessions' && session !== '') admissionQuery.session = session;
        if (course && course !== 'All Courses' && course !== '') admissionQuery.course = course;
        
        if (search && search !== '') {
          admissionQuery.$or = [
            { name: { $regex: search, $options: 'i' } },
            { appNo: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { mobile: { $regex: search, $options: 'i' } },
            { branch: { $regex: search, $options: 'i' } }
          ];
        }

        const admissions = await Admission.find(admissionQuery).sort({ createdAt: -1 });
        const mappedAdmissions = admissions.map(adm => ({
          _id: adm._id,
          studentId: adm.appNo || 'APP-XXX',
          studentName: adm.name || 'Unknown',
          email: adm.email || '',
          phone: adm.mobile || '',
          gender: adm.gender || '',
          dob: adm.dob || '',
          category: adm.category || '',
          religion: adm.religion || '',
          aadhaar: adm.aadhaar || '',
          nationality: adm.nationality || '',
          address: adm.address ? `${adm.address}, ${adm.city}, ${adm.state} - ${adm.pincode}` : '',
          fatherName: adm.parentName || '',
          fatherMobile: adm.fatherMobile || '',
          motherName: adm.motherName || '',
          motherMobile: adm.motherMobile || '',
          fatherOccupation: adm.fatherOccupation || '',
          annualIncome: adm.annualIncome || '',
          course: adm.course || '',
          enrollmentDate: adm.createdAt,
          status: adm.status === 'Pending' ? 'Admission Pending' : adm.status,
          branch: adm.branch || adm.course || 'N/A',
          year: adm.year || '1st Year',
          session: adm.session || adm.academicSession || 'N/A',
          isAdmission: true
        }));
        
        // If searching, we should ideally filter mappedAdmissions as well, but for simplicity we'll just merge
        const combinedData = [...students, ...mappedAdmissions];
        return res.json(combinedData);
      }

      const data = await directModelMap[cat].find(query).sort({ createdAt: -1 });
      return res.json(data);
    }

    // Custom mapping for other categories
    let mappedData = [];

    switch (cat) {
      case 'hostel':
        const rooms = await HostelRoom.find({ collegeId: id }).sort({ createdAt: -1 });
        mappedData = rooms.map(r => ({
          _id: r._id,
          blockName: r.blockName,
          capacity: r.capacity,
          warden: 'Not Assigned' // Fallback for UI
        }));
        break;

      case 'library':
        const books = await LibraryBook.find({ collegeId: id }).sort({ createdAt: -1 });
        mappedData = books.map(b => ({
          _id: b._id,
          bookName: b.title,
          author: b.author,
          availableCopies: b.availableCopies
        }));
        break;

      case 'activity':
        const notices = await Notice.find({ collegeId: id }).sort({ createdAt: -1 });
        mappedData = notices.map(n => ({
          _id: n._id,
          activityName: n.title,
          date: n.dateOfPublishing,
          description: n.details
        }));
        break;

      default:
        return res.status(400).json({ message: 'Invalid category' });
    }

    res.json(mappedData);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching category data", error: error.message });
  }
};

// @desc    Get dynamic filters for a college category (e.g. students)
// @route   GET /api/colleges/:id/details/:category/filters
// @access  Private/SuperAdmin
exports.getCollegeCategoryFilters = async (req, res) => {
  try {
    const { id, category } = req.params;
    
    if (category.toLowerCase() === 'students') {
      const match = { collegeId: new (require('mongoose').Types.ObjectId)(id) };
      const Student = require('../models/Student');
      const Admission = require('../models/Admission');

      const [branchesS, yearsS, sessionsS, coursesS, branchesA, yearsA, sessionsA, coursesA] = await Promise.all([
        Student.distinct('branch', match),
        Student.distinct('year', match),
        Student.distinct('session', match),
        Student.distinct('course', match),
        Admission.distinct('branch', match),
        Admission.distinct('year', match),
        Admission.distinct('session', match),
        Admission.distinct('course', match)
      ]);
      
      const cleanAndSort = (arr) => arr.filter(Boolean).sort();
      
      const allBranches = [...new Set([...branchesS, ...branchesA])];
      const allYears = [...new Set([...yearsS, ...yearsA])];
      const allSessionsRaw = [...new Set([...sessionsS, ...sessionsA])];
      const allCourses = [...new Set([...coursesS, ...coursesA])];

      const currentYear = new Date().getFullYear();
      const dynamicSessions = [];
      for (let i = currentYear - 4; i <= currentYear + 2; i++) {
        dynamicSessions.push(`${i}-${(i + 1).toString().slice(-2)}`);
      }
      const allSessions = [...new Set([...dynamicSessions, ...allSessionsRaw])];
      
      return res.json({
        branches: cleanAndSort(allBranches),
        years: cleanAndSort(allYears),
        sessions: cleanAndSort(allSessions),
        courses: cleanAndSort(allCourses)
      });
    }

    res.json({});
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching filters', error: error.message });
  }
};
