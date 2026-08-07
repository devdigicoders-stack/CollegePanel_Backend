const ScholarshipScheme = require('../models/ScholarshipScheme');
const ScholarshipApplication = require('../models/ScholarshipApplication');
const Student = require('../models/Student');

// Schemes
exports.getSchemes = async (req, res) => {
  try {
    const schemes = await ScholarshipScheme.find({ collegeId: req.college._id });
    res.json(schemes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching schemes', error: error.message });
  }
};

exports.addScheme = async (req, res) => {
  try {
    const scheme = new ScholarshipScheme({ ...req.body, collegeId: req.college._id });
    await scheme.save();
    res.status(201).json(scheme);
  } catch (error) {
    res.status(500).json({ message: 'Error adding scheme', error: error.message });
  }
};

exports.updateScheme = async (req, res) => {
  try {
    const scheme = await ScholarshipScheme.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      req.body,
      { returnDocument: 'after' }
    );
    res.json(scheme);
  } catch (error) {
    res.status(500).json({ message: 'Error updating scheme', error: error.message });
  }
};

exports.deleteScheme = async (req, res) => {
  try {
    await ScholarshipScheme.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    res.json({ message: 'Scheme deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting scheme', error: error.message });
  }
};

// Applications
exports.getApplications = async (req, res) => {
  try {
    const applications = await ScholarshipApplication.find({ collegeId: req.college._id })
      .populate('schemeId')
      .populate('studentId');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching applications', error: error.message });
  }
};

exports.addApplication = async (req, res) => {
  try {
    const application = new ScholarshipApplication({ ...req.body, collegeId: req.college._id });
    await application.save();
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Error adding application', error: error.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const application = await ScholarshipApplication.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      { status: req.body.status },
      { returnDocument: 'after' }
    ).populate('schemeId').populate('studentId');
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Error updating application', error: error.message });
  }
};

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const collegeId = req.college._id;
    const totalSchemes = await ScholarshipScheme.countDocuments({ collegeId });
    const totalApplications = await ScholarshipApplication.countDocuments({ collegeId });
    const approvedApplications = await ScholarshipApplication.countDocuments({ collegeId, status: 'Approved' });
    const pendingVerification = await ScholarshipApplication.countDocuments({ collegeId, status: { $in: ['Submitted', 'Under Verification'] } });
    
    // Aggregation for disbursement stats
    const disbursed = await ScholarshipApplication.aggregate([
      { $match: { collegeId, status: 'Disbursed' } },
      { $group: { _id: null, total: { $sum: '$amountDisbursed' } } }
    ]);
    
    res.json({
      totalSchemes,
      totalApplications,
      approvedApplications,
      pendingVerification,
      totalDisbursed: disbursed[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};
