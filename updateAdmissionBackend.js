const fs = require('fs');

const modelPath = 'models/Admission.js';
let modelContent = fs.readFileSync(modelPath, 'utf8');

// Add new fields to admissionSchema
const newFields = `
  dob: { type: String },
  gender: { type: String },
  aadhaar: { type: String },
  religion: { type: String },
  nationality: { type: String },
  bloodGroup: { type: String },
  fatherMobile: { type: String },
  fatherOccupation: { type: String },
  motherName: { type: String },
  motherMobile: { type: String },
  motherOccupation: { type: String },
  guardianName: { type: String },
  guardianMobile: { type: String },
  annualIncome: { type: String },
  parentEducation: { type: String },
  currentAddress: { type: String },
  city: { type: String },
  district: { type: String },
  state: { type: String },
  pincode: { type: String },
  permanentAddress: { type: String },
  permanentCity: { type: String },
  permanentPincode: { type: String },
  prevSchool: { type: String },
  board: { type: String },
  passingYear: { type: String },
  percentage: { type: String },
  qualification: { type: String },
  stream: { type: String },
  entranceName: { type: String },
  entranceScore: { type: String },
  rank: { type: String },
  gapYear: { type: String },
  department: { type: String },
  hostelRequired: { type: String },
  transportRequired: { type: String },
  hostelType: { type: String },
  scholarshipApplicable: { type: String },
  scholarshipType: { type: String },
  scholarshipScheme: { type: String },
  expectedScholarship: { type: String },
  scholarshipStatus: { type: String },
  feePlan: { type: String },
  paymentMode: { type: String },
`;

if (!modelContent.includes('dob: { type: String }')) {
  modelContent = modelContent.replace(
    /collegeId: \{ type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true \},/,
    `collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },${newFields}`
  );
  fs.writeFileSync(modelPath, modelContent);
}

const controllerPath = 'controllers/admissionController.js';
let controllerContent = fs.readFileSync(controllerPath, 'utf8');

// Update createAdmission in controller
if (controllerContent.includes("const { appNo, name, course, mobile, email, parentName, academicSession, category, admissionType, stage = 'Application', status = 'New' } = req.body;")) {
  controllerContent = controllerContent.replace(
    /const \{ appNo, name, course, mobile, email, parentName, academicSession, category, admissionType, stage = 'Application', status = 'New' \} = req\.body;/,
    `const { appNo, name, course, mobile, email, parentName, academicSession, category, admissionType, stage = 'Application', status = 'New', documents, ...otherFields } = req.body;`
  );

  controllerContent = controllerContent.replace(
    /const defaultDocuments = \[\s*\{ name: 'Photograph', status: 'Not Uploaded' \},\s*\{ name: 'Aadhaar Card', status: 'Not Uploaded' \},\s*\{ name: '10th Marksheet', status: 'Not Uploaded' \},\s*\{ name: 'Transfer Certificate', status: 'Not Uploaded' \},\s*\{ name: 'Character Certificate', status: 'Not Uploaded' \}\s*\];/,
    `const finalDocuments = documents && documents.length > 0 ? documents : [
      { name: 'Photograph', status: 'Not Uploaded' },
      { name: 'Aadhaar Card', status: 'Not Uploaded' },
      { name: '10th Marksheet', status: 'Not Uploaded' },
      { name: 'Transfer Certificate', status: 'Not Uploaded' },
      { name: 'Character Certificate', status: 'Not Uploaded' }
    ];`
  );

  controllerContent = controllerContent.replace(
    /const admission = new Admission\(\{\s*appNo,\s*name,\s*course,\s*mobile,\s*email,\s*parentName,\s*academicSession,\s*category,\s*admissionType,\s*collegeId: req.college._id,\s*stage,\s*status,\s*documents: defaultDocuments\s*\}\);/,
    `const admission = new Admission({
      appNo,
      name,
      course,
      mobile,
      email,
      parentName,
      academicSession,
      category,
      admissionType,
      collegeId: req.college._id,
      stage,
      status,
      documents: finalDocuments,
      ...otherFields
    });`
  );
  fs.writeFileSync(controllerPath, controllerContent);
}

console.log('Backend sync successful');
