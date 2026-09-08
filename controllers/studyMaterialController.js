const StudyMaterial = require('../models/StudyMaterial');

exports.getMaterials = async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ collegeId: req.college._id }).sort({ createdAt: -1 }).populate('uploadedBy', 'name');
    res.status(200).json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching materials', error: error.message });
  }
};

exports.createMaterial = async (req, res) => {
  try {
    const { title, subject, course, branch, type, size, fileUrl } = req.body;
    const branchVal = branch || course;
    
    if (!title || !subject || !branchVal || !type || !fileUrl) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const material = new StudyMaterial({
      title,
      subject,
      course: branchVal,
      branch: branchVal,
      type,
      size: size || 'Unknown',
      fileUrl,
      uploadedBy: req.admin ? req.admin._id : (req.teacher ? req.teacher._id : null),
      collegeId: req.college._id
    });

    await material.save();

    // 🔔 REAL-TIME LIVE NOTIFICATION + SOUND + FCM PUSH
    try {
      const io = req.app.get('io');
      const connectedUsers = req.app.get('connectedUsers');
      const { notifyStudentsOfClass } = require('../utils/studentNotificationHelper');
      const Subject = require('../models/Subject');
      
      const subjectDoc = await Subject.findOne({ name: subject, collegeId: req.college._id });
      const targetSemester = req.body.semester || subjectDoc?.semester || '';
      const targetDept = subjectDoc?.department || branchVal;
      const uploaderName = req.teacher ? req.teacher.name : (req.admin ? req.admin.name : (req.college?.adminName || 'College Admin'));

      await notifyStudentsOfClass({
        collegeId: req.college._id,
        courseName: branchVal,
        department: targetDept,
        semester: targetSemester,
        title: `📚 New Study Material: ${subject}`,
        message: `${uploaderName} uploaded: "${title}" (${type}).`,
        type: 'StudyMaterial',
        link: '/student/materials',
        extraData: {
          materialId: material._id.toString(),
          subject: subject || '',
          uploaderName
        },
        io,
        connectedUsers
      });
    } catch (notifErr) {
      console.error('Error notifying students of material:', notifErr.message);
    }

    res.status(201).json({ message: 'Material created successfully', material });
  } catch (error) {
    res.status(500).json({ message: 'Error creating material', error: error.message });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    if (!material) return res.status(404).json({ message: 'Material not found' });
    res.status(200).json({ message: 'Material deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting material', error: error.message });
  }
};
