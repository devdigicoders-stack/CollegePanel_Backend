const Enquiry = require('../models/Enquiry');

// @desc    Submit new website enquiry
// @route   POST /api/enquiries
// @access  Public
exports.createEnquiry = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      collegeName,
      institutionType,
      studentStrength,
      selectedModules,
      message
    } = req.body;

    if (!fullName || !email || !phone || !collegeName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, phone number, and institute name.'
      });
    }

    // Generate unique inquiry identifier
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const enquiryNo = `WEB-${new Date().getFullYear()}-${randomSuffix}`;

    const newEnquiry = await Enquiry.create({
      enquiryNo,
      fullName,
      email,
      phone,
      collegeName,
      institutionType: institutionType || 'Engineering / Polytechnic College',
      studentStrength: studentStrength || '1,000 - 3,000 Students',
      selectedModules: Array.isArray(selectedModules) ? selectedModules : [],
      message: message || '',
      status: 'New',
      isWebsiteLead: true
    });

    // Real-time socket emission to SuperAdmin
    const io = req.app.get('io');
    if (io) {
      io.emit('new_enquiry', newEnquiry);
      io.emit('superadmin_notification', {
        id: newEnquiry._id,
        type: 'enquiry',
        title: 'New Website Lead Received! 🚀',
        message: `${newEnquiry.fullName} from ${newEnquiry.collegeName} requested a consultation.`,
        data: newEnquiry,
        createdAt: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for connecting with DigiCampusPro! Our team will reach out shortly.',
      data: newEnquiry
    });
  } catch (error) {
    console.error('Error creating enquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit enquiry. Please try again.',
      error: error.message
    });
  }
};

// @desc    Get all website enquiries
// @route   GET /api/enquiries
// @access  Private / SuperAdmin
exports.getAllEnquiries = async (req, res) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    const query = {
      $or: [
        { isWebsiteLead: true },
        { collegeName: { $exists: true, $ne: null } }
      ]
    };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$and = [
        {
          $or: [
            { fullName: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
            { collegeName: searchRegex },
            { institutionType: searchRegex }
          ]
        }
      ];
    }

    const total = await Enquiry.countDocuments(query);
    const enquiries = await Enquiry.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: enquiries
    });
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enquiries.',
      error: error.message
    });
  }
};

// @desc    Get enquiry counts & stats
// @route   GET /api/enquiries/stats
// @access  Private / SuperAdmin
exports.getEnquiryStats = async (req, res) => {
  try {
    const baseFilter = {
      $or: [
        { isWebsiteLead: true },
        { collegeName: { $exists: true, $ne: null } }
      ]
    };

    const [total, newCount, contacted, inProgress, converted, closed] = await Promise.all([
      Enquiry.countDocuments(baseFilter),
      Enquiry.countDocuments({ ...baseFilter, status: 'New' }),
      Enquiry.countDocuments({ ...baseFilter, status: 'Contacted' }),
      Enquiry.countDocuments({ ...baseFilter, status: 'In Progress' }),
      Enquiry.countDocuments({ ...baseFilter, status: 'Converted' }),
      Enquiry.countDocuments({ ...baseFilter, status: 'Closed' })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        new: newCount,
        contacted,
        inProgress,
        converted,
        closed
      }
    });
  } catch (error) {
    console.error('Error fetching enquiry stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats.',
      error: error.message
    });
  }
};

// @desc    Update enquiry status & notes
// @route   PATCH /api/enquiries/:id/status
// @access  Private / SuperAdmin
exports.updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found.'
      });
    }

    if (status) enquiry.status = status;
    if (notes !== undefined) enquiry.notes = notes;
    enquiry.actionTakenBy = req.superAdmin?.name || 'Super Admin';

    await enquiry.save();

    res.json({
      success: true,
      message: 'Enquiry updated successfully.',
      data: enquiry
    });
  } catch (error) {
    console.error('Error updating enquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enquiry.',
      error: error.message
    });
  }
};

// @desc    Delete an enquiry
// @route   DELETE /api/enquiries/:id
// @access  Private / SuperAdmin
exports.deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await Enquiry.findByIdAndDelete(id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found.'
      });
    }

    res.json({
      success: true,
      message: 'Enquiry deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete enquiry.',
      error: error.message
    });
  }
};
