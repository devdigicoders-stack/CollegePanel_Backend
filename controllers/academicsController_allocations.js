// Add this at the top of the file if not already imported
const SubjectAllocation = require('../models/SubjectAllocation');
const Teacher = require('../models/Teacher');

// ============ SUBJECT ALLOCATIONS ============

exports.getAllocations = async (req, res) => {
  try {
    const allocations = await SubjectAllocation.find({ collegeId: req.college._id })
      .sort({ createdAt: -1 });
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching allocations', error: error.message });
  }
};

exports.createAllocation = async (req, res) => {
  try {
    const { teacher, course, semester, subject, status } = req.body;
    
    if (!teacher || !course || !semester || !subject) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Fetch names to store in document for easy frontend display
    const teacherDoc = await Teacher.findOne({ _id: teacher, collegeId: req.college._id });
    const courseDoc = await Course.findOne({ _id: course, collegeId: req.college._id });
    const subjectDoc = await Subject.findOne({ _id: subject, collegeId: req.college._id });

    if (!teacherDoc || !courseDoc || !subjectDoc) {
      return res.status(404).json({ message: 'Invalid teacher, course, or subject reference' });
    }

    const allocationExists = await SubjectAllocation.findOne({
      teacher,
      course,
      semester,
      subject,
      collegeId: req.college._id
    });

    if (allocationExists) {
      return res.status(400).json({ message: 'This subject is already allocated to this teacher for the selected semester and branch' });
    }

    const allocation = await SubjectAllocation.create({
      teacher,
      teacherName: teacherDoc.name,
      course,
      courseName: courseDoc.name,
      semester,
      subject,
      subjectName: subjectDoc.name,
      subjectCode: subjectDoc.code,
      status: status || 'Active',
      collegeId: req.college._id
    });

    res.status(201).json({ message: 'Subject allocated successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Error allocating subject', error: error.message });
  }
};

exports.updateAllocation = async (req, res) => {
  try {
    const { status } = req.body;
    
    let allocation = await SubjectAllocation.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });

    if (status) allocation.status = status;

    await allocation.save();
    res.json({ message: 'Allocation updated successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Error updating allocation', error: error.message });
  }
};

exports.deleteAllocation = async (req, res) => {
  try {
    const allocation = await SubjectAllocation.findOneAndDelete({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });
    res.json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting allocation', error: error.message });
  }
};
