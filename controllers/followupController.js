const FollowUp = require('../models/FollowUp');
const Enquiry = require('../models/Enquiry');

// @desc    Get all followups
// @route   GET /api/followups
// @access  Private
exports.getFollowUps = async (req, res) => {
  try {
    const filter = { collegeId: req.college._id };
    if (req.query.status && req.query.status !== 'All') {
      filter.callStatus = req.query.status;
    }
    
    // Add search functionality
    const followups = await FollowUp.find(filter)
      .populate('enquiryId', 'studentName mobileNumber courseInterested')
      .populate('assignedCounsellor', 'firstName lastName')
      .sort({ followUpDate: -1 });

    res.json(followups);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching followups', error: error.message });
  }
};

// @desc    Create new followup
// @route   POST /api/followups
// @access  Private
exports.createFollowUp = async (req, res) => {
  try {
    const { enquiryNo, followUpDate, nextFollowUpDate, callStatus, interestLevel, counsellorNotes, assignedCounsellor } = req.body;
    
    // Find the associated enquiry
    const enquiry = await Enquiry.findOne({ enquiryNo, collegeId: req.college._id });
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found for this number' });
    }

    // Generate FollowUp No
    const count = await FollowUp.countDocuments({ collegeId: req.college._id });
    const followUpNo = `FUP/${new Date().getFullYear()}/${(count + 1).toString().padStart(3, '0')}`;

    const newFollowUp = new FollowUp({
      followUpNo,
      enquiryId: enquiry._id,
      followUpDate,
      callStatus,
      counsellorNotes,
      nextFollowUpDate,
      studentInterestLevel: interestLevel || 'Medium',
      assignedCounsellor: assignedCounsellor || (req.employee ? req.employee._id : undefined),
      collegeId: req.college._id
    });

    await newFollowUp.save();
    
    // Also update Enquiry status based on this followup
    enquiry.status = callStatus === 'Interested' ? 'Interested' : 
                     callStatus === 'Not Interested' ? 'Not Interested' : 
                     callStatus === 'Application Started' ? 'Converted' : 'Follow-up';
    await enquiry.save();

    res.status(201).json(newFollowUp);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating followup', error: error.message });
  }
};

// @desc    Update followup
// @route   PUT /api/followups/:id
// @access  Private
exports.updateFollowUp = async (req, res) => {
  try {
    const followup = await FollowUp.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      req.body,
      { returnDocument: 'after' }
    );
    if (!followup) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }
    res.json(followup);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating followup', error: error.message });
  }
};
