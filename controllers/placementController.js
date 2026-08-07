const PlacementCompany = require('../models/PlacementCompany');
const JobOpportunity = require('../models/JobOpportunity');
const PlacementApplication = require('../models/PlacementApplication');

// Companies CRUD
exports.getCompanies = async (req, res) => {
  try {
    const companies = await PlacementCompany.find({ collegeId: req.college._id }).sort('-createdAt');
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.addCompany = async (req, res) => {
  try {
    const company = new PlacementCompany({ ...req.body, collegeId: req.college._id });
    await company.save();
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const company = await PlacementCompany.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      req.body,
      { returnDocument: 'after' }
    );
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    await PlacementCompany.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    res.json({ message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Job Opportunities CRUD
exports.getJobs = async (req, res) => {
  try {
    const jobs = await JobOpportunity.find({ collegeId: req.college._id })
      .populate('companyId', 'name industry')
      .sort('-createdAt');
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.addJob = async (req, res) => {
  try {
    const job = new JobOpportunity({ ...req.body, collegeId: req.college._id });
    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await JobOpportunity.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      req.body,
      { returnDocument: 'after' }
    );
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    await JobOpportunity.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Placement Applications CRUD
exports.getApplications = async (req, res) => {
  try {
    const applications = await PlacementApplication.find({ collegeId: req.college._id })
      .populate({
        path: 'jobId',
        select: 'title companyId',
        populate: { path: 'companyId', select: 'name' }
      })
      .populate('studentId', 'name rollNo course')
      .sort('-createdAt');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const application = await PlacementApplication.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      { status },
      { returnDocument: 'after' }
    );
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const collegeId = req.college._id;
    const [companies, jobs, applications] = await Promise.all([
      PlacementCompany.countDocuments({ collegeId }),
      JobOpportunity.countDocuments({ collegeId, status: 'Open' }),
      PlacementApplication.countDocuments({ collegeId })
    ]);

    const upcomingDrives = await JobOpportunity.find({ collegeId, status: 'Open' })
      .populate('companyId', 'name')
      .sort('deadline')
      .limit(3);

    res.json({
      companies,
      jobs,
      applications,
      upcomingDrives
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
