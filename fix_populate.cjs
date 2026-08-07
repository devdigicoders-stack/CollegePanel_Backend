const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', 'Desktop', 'DCT_CLG_CRM', 'backend', 'controllers', 'hostelController.js');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace populate strings that use 'name rollNumber' or variations
  content = content.replace(/'name rollNumber course'/g, "'studentName studentId course'");
  content = content.replace(/'name rollNumber room'/g, "'studentName studentId'");
  content = content.replace(/'name rollNumber'/g, "'studentName studentId'");

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Fixed populate fields in hostelController.js');
} else {
  console.log('hostelController.js not found');
}
