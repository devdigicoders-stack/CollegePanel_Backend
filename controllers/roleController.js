const Role = require('../models/Role');

// Helper to ensure default roles exist for a college
const ensureDefaultRoles = async (collegeId) => {
  const defaultRoles = [
    {
      name: 'Teacher',
      description: 'Default role for teaching staff',
      department: 'Academic',
      permissions: ['View Dashboard', 'View Students', 'View Subjects', 'View Sections', 'View Assignments', 'Add Assignment', 'Edit Assignment', 'Delete Assignment', 'Grade Assignment', 'Enter Marks', 'View Results']
    },
    {
      name: 'Student',
      description: 'Default role for enrolled students',
      department: 'Academic',
      permissions: ['View Portal Dashboard', 'Submit Course Assignments', 'View Semester Results', 'Apply For Outings']
    },
    {
      name: 'HOD',
      description: 'Head of Department',
      department: 'Academic',
      permissions: ['View Dashboard', 'View Students', 'View Teachers', 'View Departments', 'View Courses', 'View Subjects', 'View Sections', 'View Assignments', 'View Results', 'View Employees']
    },
    {
      name: 'Hostel',
      description: 'Hostel Warden or Manager',
      department: 'Hostel',
      permissions: ['View Dashboard', 'View Hostels', 'Manage Rooms', 'Manage Allocations', 'View Hostel Reports', 'Approve Leave Outing', 'Reject Leave Outing', 'Log Check In', 'Log Check Out', 'Manage Hostel Inventory', 'Add Hostel Notice', 'View Students']
    }
  ];

  for (const roleDef of defaultRoles) {
    const exists = await Role.findOne({ name: roleDef.name, collegeId });
    if (!exists) {
      await Role.create({ ...roleDef, collegeId, status: 'Active' });
    }
  }
};

// Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    
    // Ensure default roles exist before returning the list
    await ensureDefaultRoles(collegeId);
    
    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    
    const query = { collegeId };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const total = await Role.countDocuments(query);
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const roles = await Role.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: roles,
      total,
      page,
      pages
    });
  } catch (error) {
    console.error('Get All Roles Error:', error);
    res.status(500).json({ message: 'Error fetching roles', error: error.message });
  }
};

// Get roles for list/dropdown (only active roles)
exports.getRolesList = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    
    // Ensure default roles exist before returning the list
    await ensureDefaultRoles(collegeId);
    const roles = await Role.find({ collegeId, status: 'Active' }).select('name').sort({ name: 1 });
    
    const roleNames = roles.map(r => r.name);
    
    res.json({ data: roleNames });
  } catch (error) {
    console.error('Get Roles List Error:', error);
    res.status(500).json({ message: 'Error fetching roles list', error: error.message });
  }
};

// Create new role
exports.createRole = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const { name, description, department, status, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    const existingRole = await Role.findOne({ name, collegeId });
    if (existingRole) {
      return res.status(400).json({ message: 'Role name already exists' });
    }

    const newRole = new Role({
      name,
      description,
      department,
      status: status || 'Active',
      permissions: permissions || [],
      collegeId
    });

    await newRole.save();

    res.status(201).json({
      message: 'Role created successfully',
      data: newRole
    });
  } catch (error) {
    console.error('Create Role Error:', error);
    res.status(500).json({ message: 'Error creating role', error: error.message });
  }
};

// Update role
exports.updateRole = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const roleId = req.params.id;
    const { name, description, department, status, permissions } = req.body;

    const role = await Role.findOne({ _id: roleId, collegeId });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ name, collegeId });
      if (existingRole) {
        return res.status(400).json({ message: 'Role name already exists' });
      }
    }

    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (department !== undefined) role.department = department;
    if (status) role.status = status;
    if (permissions !== undefined) role.permissions = permissions;

    await role.save();

    res.json({
      message: 'Role updated successfully',
      data: role
    });
  } catch (error) {
    console.error('Update Role Error:', error);
    res.status(500).json({ message: 'Error updating role', error: error.message });
  }
};

// Delete role
exports.deleteRole = async (req, res) => {
  try {
    if (!req.college || !req.college._id) {
      return res.status(401).json({ message: 'College information not found' });
    }

    const collegeId = req.college._id;
    const roleId = req.params.id;

    const role = await Role.findOneAndDelete({ _id: roleId, collegeId });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json({
      message: 'Role deleted successfully',
      data: role
    });
  } catch (error) {
    console.error('Delete Role Error:', error);
    res.status(500).json({ message: 'Error deleting role', error: error.message });
  }
};

// Get available permissions
exports.getPermissionsList = async (req, res) => {
  try {
    // Return empty array to allow frontend to use its rich UI configuration (with icons and colors)
    res.json({ data: [] });
  } catch (error) {
    console.error('Get Permissions Error:', error);
    res.status(500).json({ message: 'Error fetching permissions', error: error.message });
  }
};

// Get all available permissions (for the permission management UI)
exports.getAvailablePermissions = async (req, res) => {
  try {
    const allPermissions = [
      { category: 'Dashboard', permissions: ['View Dashboard', 'View Analytics', 'View Reports Summary'] },
      { category: 'Students', permissions: ['View Students', 'Add Student', 'Edit Student', 'Delete Student', 'Export Students'] },
      { category: 'Teachers', permissions: ['View Teachers', 'Add Teacher', 'Edit Teacher', 'Delete Teacher', 'Assign Subjects'] },
      { category: 'Employees', permissions: ['View Employees', 'Add Employee', 'Edit Employee', 'Delete Employee', 'View Credentials'] },
      { category: 'Admissions', permissions: ['View Admissions', 'Add Admission', 'Edit Admission', 'Delete Admission', 'Approve Admission'] },
      { category: 'Academics', permissions: ['View Courses', 'Manage Courses', 'View Departments', 'Manage Departments', 'View Subjects', 'Manage Subjects', 'View Sections', 'Manage Sections'] },
      { category: 'Fees', permissions: ['View Fees', 'Collect Fees', 'Generate Receipt', 'View Fee Reports', 'Manage Fee Structure'] },
      { category: 'Attendance', permissions: ['View Attendance', 'Mark Attendance', 'Edit Attendance', 'View Attendance Reports'] },
      { category: 'Library', permissions: ['View Books', 'Add Book', 'Edit Book', 'Delete Book', 'Issue Book', 'Return Book'] },
      { category: 'Hostel', permissions: ['View Hostels', 'Manage Rooms', 'Manage Allocations', 'View Hostel Reports'] },
      { category: 'Security & Gate', permissions: ['View Security Dashboard', 'Log Student Entry/Exit', 'Scan Gate Pass', 'Log Vehicle Registry', 'Log Security Incident'] },
      { category: 'Student Portal', permissions: ['View Portal Dashboard', 'Submit Course Assignments', 'View Semester Results', 'Pay Fees Online', 'Apply For Outings'] },
      { category: 'Reports', permissions: ['View All Reports', 'Export Reports', 'Generate Custom Reports'] },
      { category: 'Settings', permissions: ['View Settings', 'Edit Settings', 'Manage Roles', 'Manage Permissions', 'System Configuration'] }
    ];

    res.json({ data: allPermissions });
  } catch (error) {
    console.error('Get Permissions Error:', error);
    res.status(500).json({ message: 'Error fetching permissions', error: error.message });
  }
};
