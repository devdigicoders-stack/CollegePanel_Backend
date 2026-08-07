const mongoose = require('mongoose');
const Admission = require('./models/Admission');
const Student = require('./models/Student');
const StudentFee = require('./models/StudentFee');
const FeeStructure = require('./models/FeeStructure');

mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:KoJGvdKsGU9IQQvk@cluster0.9ssqshr.mongodb.net/crm_clg_dct?retryWrites=true&w=majority').then(async () => {
  try {
    const admissions = await Admission.find({ stage: 'Admitted', registrationStatus: 'Registered' });
    console.log(`Found ${admissions.length} registered admissions.`);
    
    for (const adm of admissions) {
      let student = await Student.findOne({ studentId: adm.studentId });
      if (!student) {
        student = await Student.create({
          studentId: adm.studentId,
          studentName: adm.name,
          email: adm.email || `${adm.name.toLowerCase().replace(/\s+/g, '.')}@student.edu`,
          phone: adm.mobile || '',
          gender: adm.gender || 'Male',
          dob: adm.dob ? new Date(adm.dob) : new Date(),
          address: adm.currentAddress || 'N/A',
          course: adm.course,
          enrollmentDate: new Date(),
          collegeId: adm.collegeId,
          username: `${adm.name.toLowerCase().replace(/\s+/g, '.')}.${Date.now().toString().slice(-4)}`,
          password: `Student@123`
        });
        console.log(`Created Student: ${student.studentName}`);
      }

      let fee = await StudentFee.findOne({ enrollNo: adm.enrollNo });
      if (!fee) {
        const feeStruct = await FeeStructure.findOne({ courseName: adm.course, collegeId: adm.collegeId });
        const totalFee = feeStruct ? feeStruct.totalAmount : 0;
        
        fee = await StudentFee.create({
          studentId: student._id,
          enrollNo: adm.enrollNo,
          studentName: adm.name,
          course: adm.course,
          semester: adm.semester || '1',
          totalFee: totalFee,
          pending: totalFee,
          collegeId: adm.collegeId
        });
        console.log(`Created StudentFee for: ${fee.studentName}`);
      }
    }
    console.log('Sync Complete.');
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
});
