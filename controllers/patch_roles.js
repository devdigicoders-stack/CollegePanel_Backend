const fs = require('fs');

// 1. Update roleController.js
let controller = fs.readFileSync('d:/Desktop/DCT_CLG_CRM/backend/controllers/roleController.js', 'utf8');

const newControllerCode = \
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
\;

fs.writeFileSync('d:/Desktop/DCT_CLG_CRM/backend/controllers/roleController.js', controller + newControllerCode, 'utf8');

// 2. Update roleRoutes.js
let routes = fs.readFileSync('d:/Desktop/DCT_CLG_CRM/backend/routes/roleRoutes.js', 'utf8');

routes = routes.replace(
  "const { getAllRoles, getRolesList, createRole, updateRole, deleteRole } = require('../controllers/roleController');",
  "const { getAllRoles, getRolesList, createRole, updateRole, deleteRole, getPermissionsList } = require('../controllers/roleController');"
);

routes = routes.replace(
  "// Get roles list for dropdown\\r\\nrouter.get('/list/all', getRolesList);",
  "// Get available permissions\\r\\nrouter.get('/permissions', getPermissionsList);\\r\\n\\r\\n// Get roles list for dropdown\\r\\nrouter.get('/list/all', getRolesList);"
);
// Also support \n without \r
routes = routes.replace(
  "// Get roles list for dropdown\\nrouter.get('/list/all', getRolesList);",
  "// Get available permissions\\nrouter.get('/permissions', getPermissionsList);\\n\\n// Get roles list for dropdown\\nrouter.get('/list/all', getRolesList);"
);

fs.writeFileSync('d:/Desktop/DCT_CLG_CRM/backend/routes/roleRoutes.js', routes, 'utf8');
console.log('Role routes and controller patched!');
