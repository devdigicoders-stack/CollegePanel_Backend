const fs = require('fs');
const path = require('path');

const modelsDir = path.join('d:', 'Desktop', 'DCT_CLG_CRM', 'backend', 'models');

const models = {
  'HostelCheckInOut.js': "const mongoose = require('mongoose');\nconst schema = new mongoose.Schema({\n  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },\n  type: { type: String, enum: ['Check-In', 'Check-Out'], required: true },\n  dateTime: { type: Date, default: Date.now },\n  reason: { type: String },\n  remarks: { type: String },\n  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }\n}, { timestamps: true });\nmodule.exports = mongoose.models.HostelCheckInOut || mongoose.model('HostelCheckInOut', schema);",

  'HostelAttendance.js': "const mongoose = require('mongoose');\nconst schema = new mongoose.Schema({\n  date: { type: Date, required: true },\n  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },\n  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'HostelRoom' },\n  status: { type: String, enum: ['Present', 'Absent', 'On Leave'], required: true },\n  remarks: { type: String },\n  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }\n}, { timestamps: true });\nmodule.exports = mongoose.models.HostelAttendance || mongoose.model('HostelAttendance', schema);",

  'HostelLeaveOuting.js': "const mongoose = require('mongoose');\nconst schema = new mongoose.Schema({\n  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },\n  type: { type: String, enum: ['Leave', 'Outing'], required: true },\n  fromDate: { type: Date, required: true },\n  toDate: { type: Date, required: true },\n  reason: { type: String, required: true },\n  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },\n  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }\n}, { timestamps: true });\nmodule.exports = mongoose.models.HostelLeaveOuting || mongoose.model('HostelLeaveOuting', schema);",

  'HostelVisitor.js': "const mongoose = require('mongoose');\nconst schema = new mongoose.Schema({\n  visitorName: { type: String, required: true },\n  contactNumber: { type: String, required: true },\n  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },\n  relation: { type: String },\n  inTime: { type: Date, default: Date.now },\n  outTime: { type: Date },\n  purpose: { type: String },\n  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }\n}, { timestamps: true });\nmodule.exports = mongoose.models.HostelVisitor || mongoose.model('HostelVisitor', schema);",

  'HostelIncident.js': "const mongoose = require('mongoose');\nconst schema = new mongoose.Schema({\n  date: { type: Date, required: true },\n  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },\n  incidentType: { type: String, required: true },\n  description: { type: String, required: true },\n  actionTaken: { type: String },\n  status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },\n  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }\n}, { timestamps: true });\nmodule.exports = mongoose.models.HostelIncident || mongoose.model('HostelIncident', schema);",

  'HostelInventory.js': "const mongoose = require('mongoose');\nconst schema = new mongoose.Schema({\n  itemName: { type: String, required: true },\n  category: { type: String, required: true },\n  quantity: { type: Number, required: true, default: 0 },\n  condition: { type: String, enum: ['Good', 'Needs Repair', 'Damaged'], default: 'Good' },\n  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'HostelRoom' },\n  remarks: { type: String },\n  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }\n}, { timestamps: true });\nmodule.exports = mongoose.models.HostelInventory || mongoose.model('HostelInventory', schema);"
};

for (const [filename, content] of Object.entries(models)) {
  fs.writeFileSync(path.join(modelsDir, filename), content, 'utf-8');
  console.log('Created ' + filename);
}
