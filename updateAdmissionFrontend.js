const fs = require('fs');
const file = '../admin/src/pages/admissions/NewAdmission.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the entire renderStep function
const newRenderStep = `  const renderStep = () => {
    if (submitted) return null;
    switch (currentStep) {
      case 0: return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Student Full Name" name="studentName" value={formData['studentName'] || ''} onChange={(e) => handleFieldChange('studentName', e.target.value)} />
          <InputField label="Date of Birth" type="date" name="dob" value={formData['dob'] || ''} onChange={(e) => handleFieldChange('dob', e.target.value)} />
          <SelectField label="Gender" options={['Male','Female','Other']} name="gender" value={formData['gender'] || ''} onChange={(e) => handleFieldChange('gender', e.target.value)} />
          <InputField label="Mobile Number" name="mobile" value={formData['mobile'] || ''} onChange={(e) => handleFieldChange('mobile', e.target.value)} />
          <InputField label="Email Address" name="email" value={formData['email'] || ''} onChange={(e) => handleFieldChange('email', e.target.value)} />
          <InputField label="Aadhaar Number" name="aadhaar" value={formData['aadhaar'] || ''} onChange={(e) => handleFieldChange('aadhaar', e.target.value)} />
          <SelectField label="Category" options={['General','OBC','SC','ST','EWS']} name="category" value={formData['category'] || ''} onChange={(e) => handleFieldChange('category', e.target.value)} />
          <SelectField label="Religion" options={['Hindu','Muslim','Christian','Sikh','Other']} name="religion" value={formData['religion'] || ''} onChange={(e) => handleFieldChange('religion', e.target.value)} />
          <InputField label="Nationality" placeholder="Indian" name="nationality" value={formData['nationality'] || ''} onChange={(e) => handleFieldChange('nationality', e.target.value)} />
          <SelectField label="Blood Group" options={['A+','A-','B+','B-','O+','O-','AB+','AB-']} name="bloodGroup" value={formData['bloodGroup'] || ''} onChange={(e) => handleFieldChange('bloodGroup', e.target.value)} />
        </div>
      );
      case 1: return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Father's Name" name="fatherName" value={formData['fatherName'] || ''} onChange={(e) => handleFieldChange('fatherName', e.target.value)} />
          <InputField label="Father's Mobile" name="fatherMobile" value={formData['fatherMobile'] || ''} onChange={(e) => handleFieldChange('fatherMobile', e.target.value)} />
          <InputField label="Father's Occupation" name="fatherOccupation" value={formData['fatherOccupation'] || ''} onChange={(e) => handleFieldChange('fatherOccupation', e.target.value)} />
          <InputField label="Mother's Name" name="motherName" value={formData['motherName'] || ''} onChange={(e) => handleFieldChange('motherName', e.target.value)} />
          <InputField label="Mother's Mobile" name="motherMobile" value={formData['motherMobile'] || ''} onChange={(e) => handleFieldChange('motherMobile', e.target.value)} />
          <InputField label="Mother's Occupation" name="motherOccupation" value={formData['motherOccupation'] || ''} onChange={(e) => handleFieldChange('motherOccupation', e.target.value)} />
          <InputField label="Guardian Name (if different)" name="guardianName" value={formData['guardianName'] || ''} onChange={(e) => handleFieldChange('guardianName', e.target.value)} />
          <InputField label="Guardian Mobile" name="guardianMobile" value={formData['guardianMobile'] || ''} onChange={(e) => handleFieldChange('guardianMobile', e.target.value)} />
          <InputField label="Annual Family Income" name="annualIncome" value={formData['annualIncome'] || ''} onChange={(e) => handleFieldChange('annualIncome', e.target.value)} />
          <SelectField label="Parent Education" options={['Below 10th','10th Pass','12th Pass','Graduate','Post Graduate']} name="parentEducation" value={formData['parentEducation'] || ''} onChange={(e) => handleFieldChange('parentEducation', e.target.value)} />
        </div>
      );
      case 2: return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><InputField label="Current Address" name="currentAddress" value={formData['currentAddress'] || ''} onChange={(e) => handleFieldChange('currentAddress', e.target.value)} /></div>
          <InputField label="City" name="city" value={formData['city'] || ''} onChange={(e) => handleFieldChange('city', e.target.value)} />
          <InputField label="District" name="district" value={formData['district'] || ''} onChange={(e) => handleFieldChange('district', e.target.value)} />
          <InputField label="State" name="state" value={formData['state'] || ''} onChange={(e) => handleFieldChange('state', e.target.value)} />
          <InputField label="PIN Code" name="pincode" value={formData['pincode'] || ''} onChange={(e) => handleFieldChange('pincode', e.target.value)} />
          <div className="md:col-span-2"><InputField label="Permanent Address (if different)" name="permanentAddress" value={formData['permanentAddress'] || ''} onChange={(e) => handleFieldChange('permanentAddress', e.target.value)} /></div>
          <InputField label="Permanent City" name="permanentCity" value={formData['permanentCity'] || ''} onChange={(e) => handleFieldChange('permanentCity', e.target.value)} />
          <InputField label="Permanent PIN Code" name="permanentPincode" value={formData['permanentPincode'] || ''} onChange={(e) => handleFieldChange('permanentPincode', e.target.value)} />
        </div>
      );
      case 3: return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Previous School/College Name" name="prevSchool" value={formData['prevSchool'] || ''} onChange={(e) => handleFieldChange('prevSchool', e.target.value)} />
          <InputField label="Board/University" name="board" value={formData['board'] || ''} onChange={(e) => handleFieldChange('board', e.target.value)} />
          <InputField label="Passing Year" name="passingYear" value={formData['passingYear'] || ''} onChange={(e) => handleFieldChange('passingYear', e.target.value)} />
          <InputField label="Percentage/CGPA" name="percentage" value={formData['percentage'] || ''} onChange={(e) => handleFieldChange('percentage', e.target.value)} />
          <SelectField label="Qualification" options={['10th Pass','12th Pass','Diploma','Graduate']} name="qualification" value={formData['qualification'] || ''} onChange={(e) => handleFieldChange('qualification', e.target.value)} />
          <SelectField label="Stream" options={['Science','Commerce','Arts','Vocational']} name="stream" value={formData['stream'] || ''} onChange={(e) => handleFieldChange('stream', e.target.value)} />
          <InputField label="Entrance Exam Name (if any)" name="entranceName" value={formData['entranceName'] || ''} onChange={(e) => handleFieldChange('entranceName', e.target.value)} />
          <InputField label="Entrance Exam Score" name="entranceScore" value={formData['entranceScore'] || ''} onChange={(e) => handleFieldChange('entranceScore', e.target.value)} />
          <InputField label="Rank (if any)" name="rank" value={formData['rank'] || ''} onChange={(e) => handleFieldChange('rank', e.target.value)} />
          <SelectField label="Gap Year" options={['No Gap','1 Year','2 Years','More than 2 Years']} name="gapYear" value={formData['gapYear'] || ''} onChange={(e) => handleFieldChange('gapYear', e.target.value)} />
        </div>
      );
      case 4: return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Course" options={courses.map(c => c.name || c.courseName || c.title || c)} name="course" value={formData['course'] || ''} onChange={(e) => handleFieldChange('course', e.target.value)} />
          <SelectField label="Department" options={departments.map(d => d.name || d.departmentName || d)} name="department" value={formData['department'] || ''} onChange={(e) => handleFieldChange('department', e.target.value)} />
          <SelectField label="Semester" options={semesters.map(s => s.name || s.semesterName || s)} name="semester" value={formData['semester'] || ''} onChange={(e) => handleFieldChange('semester', e.target.value)} />
          <SelectField label="Admission Type" options={['Regular','Lateral Entry','Management Quota','NRI Quota']} name="admissionType" value={formData['admissionType'] || ''} onChange={(e) => handleFieldChange('admissionType', e.target.value)} />
          <SelectField label="Academic Session" options={['2024-25','2025-26']} name="academicSession" value={formData['academicSession'] || ''} onChange={(e) => handleFieldChange('academicSession', e.target.value)} />
          <SelectField label="Hostel Required" options={['Yes','No']} name="hostelRequired" value={formData['hostelRequired'] || ''} onChange={(e) => handleFieldChange('hostelRequired', e.target.value)} />
          <SelectField label="Transport Required" options={['Yes','No']} name="transportRequired" value={formData['transportRequired'] || ''} onChange={(e) => handleFieldChange('transportRequired', e.target.value)} />
          <InputField label="Preferred Hostel Type" placeholder="e.g. Single Room" name="hostelType" value={formData['hostelType'] || ''} onChange={(e) => handleFieldChange('hostelType', e.target.value)} />
        </div>
      );
      case 5: return (
        <div className="space-y-4">
          <p className="text-[13px] text-gray-600">Upload required documents. Accepted formats: PDF, JPG, PNG (Max 2MB each)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Photograph','Signature','Aadhaar Card','10th Marksheet','12th Marksheet','Transfer Certificate','Migration Certificate','Character Certificate','Caste Certificate','Income Certificate','Domicile Certificate','Medical Certificate'].map(doc => (
              <div key={doc} className="border border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-between hover:border-[#0A6C54] transition-colors">
                <div>
                  <p className="text-[13px] font-medium text-gray-700">{doc}</p>
                  {uploadedDocs[doc] ? (
                    <a href={\`\${import.meta.env.VITE_API_URL.replace('/api', '')}\${uploadedDocs[doc]}\`} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-blue-600 hover:underline">View Uploaded File</a>
                  ) : (
                    <p className="text-[11px] text-gray-500">PDF, JPG, PNG • Max 2MB</p>
                  )}
                </div>
                {uploadingDoc === doc ? (
                  <span className="text-[12px] font-medium text-gray-500">Uploading...</span>
                ) : uploadedDocs[doc] ? (
                  <span className="text-[12px] font-medium text-green-600 flex items-center gap-1"><Check size={14}/> Uploaded</span>
                ) : (
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-700 flex items-center gap-1.5">
                    <Upload size={13} /> Upload
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, doc)} />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      );
      case 6: return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Scholarship Applicable" options={['Yes','No']} name="scholarshipApplicable" value={formData['scholarshipApplicable'] || ''} onChange={(e) => handleFieldChange('scholarshipApplicable', e.target.value)} />
          <SelectField label="Scholarship Type" options={['Government','College','Merit','Sports','Other']} name="scholarshipType" value={formData['scholarshipType'] || ''} onChange={(e) => handleFieldChange('scholarshipType', e.target.value)} />
          <SelectField label="Scholarship Scheme Name" options={scholarships.map(s => s.schemeName || s.name || s)} name="scholarshipScheme" value={formData['scholarshipScheme'] || ''} onChange={(e) => handleFieldChange('scholarshipScheme', e.target.value)} />
          <InputField label="Expected Scholarship Amount" name="expectedScholarship" value={formData['expectedScholarship'] || ''} onChange={(e) => handleFieldChange('expectedScholarship', e.target.value)} />
          <SelectField label="Scholarship Status" options={['Applied','Approved','Pending','Not Applied']} name="scholarshipStatus" value={formData['scholarshipStatus'] || ''} onChange={(e) => handleFieldChange('scholarshipStatus', e.target.value)} />
          <div className="md:col-span-2">
            <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Scholarship Documents</label>
            <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#0A6C54] transition-colors">
              {uploadingDoc === 'Scholarship Document' ? (
                <p className="text-[13px] text-gray-500">Uploading...</p>
              ) : uploadedDocs['Scholarship Document'] ? (
                <div>
                  <Check size={20} className="mx-auto text-green-500 mb-2" />
                  <p className="text-[13px] text-green-600 font-medium mb-1">Document Uploaded Successfully</p>
                  <a href={\`\${import.meta.env.VITE_API_URL.replace('/api', '')}\${uploadedDocs['Scholarship Document']}\`} target="_blank" rel="noreferrer" className="text-[12px] text-blue-600 hover:underline">View Document</a>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload size={20} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-[13px] text-gray-600 hover:text-[#0A6C54]">Click to upload scholarship documents</p>
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'Scholarship Document')} />
                </label>
              )}
            </div>
          </div>
        </div>
      );
      case 7: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="Fee Plan" options={['Full Payment','2 Installments','3 Installments','4 Installments']} name="feePlan" value={formData['feePlan'] || ''} onChange={(e) => handleFieldChange('feePlan', e.target.value)} />
            <SelectField label="Payment Mode" options={['Cash','UPI','Bank Transfer','Cheque','DD']} name="paymentMode" value={formData['paymentMode'] || ''} onChange={(e) => handleFieldChange('paymentMode', e.target.value)} />
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <h4 className="text-[14px] font-bold text-gray-800 mb-4">Fee Breakdown {feeStructure ? '' : '(No Fee Structure found, showing Default)'}</h4>
            <div className="space-y-2">
              {feeStructure && feeStructure.fees ? feeStructure.fees.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-[13px] text-gray-600">{item.type || item.feeType}</span>
                  <span className="text-[13px] font-semibold text-gray-800">₹{item.amount}</span>
                </div>
              )) : [
                { label: 'Admission Fee', amount: '5,000' },
                { label: 'Tuition Fee', amount: '25,000' },
                { label: 'Registration Fee', amount: '2,000' },
                { label: 'Exam Fee', amount: '1,500' },
                { label: 'Lab Fee', amount: '3,000' },
                { label: 'Library Fee', amount: '1,000' },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-[13px] text-gray-600">{item.label}</span>
                  <span className="text-[13px] font-semibold text-gray-800">₹{item.amount}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 pt-3">
                <span className="text-[14px] font-bold text-gray-800">Total</span>
                <span className="text-[14px] font-bold text-[#0A6C54]">₹{feeStructure && feeStructure.totalAmount ? feeStructure.totalAmount : '37,500'}</span>
              </div>
            </div>
          </div>
        </div>
      );
      case 8: return (
        <div className="space-y-6">
          <p className="text-[13px] text-gray-600">Please review all details before submitting.</p>
          {[
            { title: 'Personal Details', items: [['Name', formData.studentName],['DOB', formData.dob],['Gender', formData.gender],['Mobile', formData.mobile],['Category', formData.category]] },
            { title: 'Course Details', items: [['Course', formData.course],['Session', formData.academicSession],['Admission Type', formData.admissionType],['Hostel', formData.hostelRequired]] },
            { title: 'Fee Details', items: [['Fee Plan', formData.feePlan],['Payment Mode', formData.paymentMode]] },
          ].map(section => (
            <div key={section.title} className="bg-gray-50 rounded-xl p-5">
              <h4 className="text-[14px] font-bold text-gray-800 mb-3">{section.title}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {section.items.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[11px] text-gray-500">{label}</p>
                    <p className="text-[13px] font-semibold text-gray-800">{value || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
      case 9: return (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-green-600" />
          </div>
          <h3 className="text-[20px] font-bold text-gray-800 mb-2">Admission Submitted Successfully!</h3>
          <p className="text-[14px] text-gray-600 mb-6">Application No: <span className="font-bold text-[#0A6C54]">{submittedAppNo || 'Generating...'}</span></p>
          <p className="text-[13px] text-gray-500">The admission will be reviewed and you will be notified once approved.</p>
          <button onClick={() => { setCurrentStep(0); setSubmitted(false); setSubmittedAppNo(''); setFormData({}); setUploadedDocs({}); }}
            className="mt-6 bg-[#0A6C54] text-white px-6 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-[#085a46]">
            New Admission
          </button>
        </div>
      );
      default: return null;
    }
  };`;

const renderStepRegex = /\s*const renderStep = \(\) => \{[\s\S]*?default: return null;\s*\}\s*\};\s*return \(/;

content = content.replace(renderStepRegex, newRenderStep + '\n\n  return (');

// Also update handleSubmit logic
const handleSubmitRegex = /const appNo = `APP\/\$\{new Date\(\)\.getFullYear\(\)\}\/\$\{Date\.now\(\)\.toString\(\)\.slice\(-4\)\}`;[\s\S]*?setSubmittedAppNo\(appNo\);/m;

const newHandleSubmit = `const appNo = \`APP/\${new Date().getFullYear()}/\${Date.now().toString().slice(-4)}\`;
                  await axios.post(\`\${import.meta.env.VITE_API_URL}/admissions\`, {
                    ...formData, // Send entire formData
                    name: formData.studentName, // Map studentName to name if required by backend
                    parentName: formData.fatherName, // Map fatherName to parentName
                    appNo,
                    stage: 'Application',
                    status: 'Pending Verification',
                    documents: Object.keys(uploadedDocs).map(name => ({ name, url: uploadedDocs[name], status: 'Pending' }))
                  }, { headers: { Authorization: \`Bearer \${token}\` } });
                  setSubmittedAppNo(appNo);`;

content = content.replace(handleSubmitRegex, newHandleSubmit);

fs.writeFileSync(file, content);
console.log('Frontend update successful');
