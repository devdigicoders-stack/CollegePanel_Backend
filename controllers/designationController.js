const Designation = require('../models/Designation');

// Get all designations
exports.getDesignations = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const { page = 1, limit = 10, status, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    let query = { collegeId };

    if (status && status !== 'All Status' && status !== '') {
      query.status = status;
    }

    if (search && search !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sortObj = {};
    sortObj[sortBy] = order === 'desc' ? -1 : 1;

    const designations = await Designation.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Designation.countDocuments(query);

    res.status(200).json({
      message: 'Designations fetched successfully',
      data: designations,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Get Designations Error:', error);
    res.status(500).json({ message: 'Error fetching designations', error: error.message });
  }
};

// Get designation by ID
exports.getDesignationById = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const designationId = req.params.id;

    const designation = await Designation.findOne({ _id: designationId, collegeId }).select('-__v');

    if (!designation) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    res.status(200).json({
      message: 'Designation fetched successfully',
      data: designation
    });
  } catch (error) {
    console.error('Get Designation By ID Error:', error);
    res.status(500).json({ message: 'Error fetching designation', error: error.message });
  }
};

// Create designation
exports.createDesignation = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const { name, description, level, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Designation name is required' });
    }

    // Check if designation already exists
    const existingDesignation = await Designation.findOne({ name, collegeId });
    if (existingDesignation) {
      return res.status(400).json({ message: 'Designation already exists for this college' });
    }

    const newDesignation = new Designation({
      name,
      description,
      level,
      status: status || 'Active',
      collegeId
    });

    await newDesignation.save();

    res.status(201).json({
      message: 'Designation created successfully',
      data: newDesignation
    });
  } catch (error) {
    console.error('Create Designation Error:', error);
    res.status(500).json({ message: 'Error creating designation', error: error.message });
  }
};

// Update designation
exports.updateDesignation = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const designationId = req.params.id;
    const { name, description, level, status } = req.body;

    const designation = await Designation.findOne({ _id: designationId, collegeId });
    if (!designation) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    if (name && name !== designation.name) {
      const existingDesignation = await Designation.findOne({ name, collegeId });
      if (existingDesignation) {
        return res.status(400).json({ message: 'Designation name already exists' });
      }
    }

    if (name) designation.name = name;
    if (description) designation.description = description;
    if (level) designation.level = level;
    if (status) designation.status = status;

    await designation.save();

    res.status(200).json({
      message: 'Designation updated successfully',
      data: designation
    });
  } catch (error) {
    console.error('Update Designation Error:', error);
    res.status(500).json({ message: 'Error updating designation', error: error.message });
  }
};

// Delete designation
exports.deleteDesignation = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const designationId = req.params.id;

    const designation = await Designation.findOneAndDelete({ _id: designationId, collegeId });

    if (!designation) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    res.status(200).json({
      message: 'Designation deleted successfully',
      data: designation
    });
  } catch (error) {
    console.error('Delete Designation Error:', error);
    res.status(500).json({ message: 'Error deleting designation', error: error.message });
  }
};

// Get all designations (simple list for dropdowns - no pagination)
exports.getDesignationsList = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const designations = await Designation.find({ collegeId, status: 'Active' }).select('name').sort({ name: 1 });

    res.status(200).json({
      message: 'Designations list fetched successfully',
      data: designations.map(d => d.name)
    });
  } catch (error) {
    console.error('Get Designations List Error:', error);
    res.status(500).json({ message: 'Error fetching designations list', error: error.message });
  }
};
