const Enquiry = require('../models/Enquiry');

// @desc    Get all enquiries
// @route   GET /api/enquiries
// @access  Private
exports.getEnquiries = async (req, res) => {
  try {
    const filter = { collegeId: req.college._id };
    if (req.query.status && req.query.status !== 'All') {
      filter.status = req.query.status;
    }
    if (req.query.source && req.query.source !== 'All') {
      filter.enquirySource = req.query.source;
    }
    if (req.query.search) {
      filter.$or = [
        { studentName: { $regex: req.query.search, $options: 'i' } },
        { mobileNumber: { $regex: req.query.search, $options: 'i' } },
        { enquiryNo: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const enquiries = await Enquiry.find(filter)
      .populate('assignedCounsellor', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(enquiries);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching enquiries', error: error.message });
  }
};

// @desc    Create new enquiry
// @route   POST /api/enquiries
// @access  Private
exports.createEnquiry = async (req, res) => {
  try {
    const { studentName, mobileNumber, email, parentName, city, previousQualification, courseInterested, enquirySource, status, remarks } = req.body;
    
    // Generate Enquiry No
    const count = await Enquiry.countDocuments({ collegeId: req.college._id });
    const enquiryNo = `ENQ/${new Date().getFullYear()}/${(count + 1).toString().padStart(3, '0')}`;

    const newEnquiry = new Enquiry({
      enquiryNo,
      studentName,
      mobileNumber,
      email,
      parentName,
      city,
      previousQualification,
      courseInterested,
      enquirySource,
      status: status || 'New',
      remarks,
      collegeId: req.college._id,
      createdBy: req.employee ? req.employee._id : null
    });

    await newEnquiry.save();
    res.status(201).json(newEnquiry);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating enquiry', error: error.message });
  }
};

// @desc    Update enquiry
// @route   PUT /api/enquiries/:id
// @access  Private
exports.updateEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      req.body,
      { returnDocument: 'after' }
    );
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }
    res.json(enquiry);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating enquiry', error: error.message });
  }
};

// @desc    Delete enquiry
// @route   DELETE /api/enquiries/:id
// @access  Private
exports.deleteEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }
    res.json({ message: 'Enquiry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting enquiry', error: error.message });
  }
};
