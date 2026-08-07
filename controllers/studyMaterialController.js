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
    const { title, subject, course, type, size, fileUrl } = req.body;
    
    if (!title || !subject || !course || !type || !fileUrl) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const material = new StudyMaterial({
      title,
      subject,
      course,
      type,
      size: size || 'Unknown',
      fileUrl,
      uploadedBy: req.admin ? req.admin._id : (req.teacher ? req.teacher._id : null),
      collegeId: req.college._id
    });

    await material.save();
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
