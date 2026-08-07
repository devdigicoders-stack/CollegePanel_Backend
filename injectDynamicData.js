const fs = require('fs');
const file = '../admin/src/pages/admissions/NewAdmission.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add missing fields to initial formData
content = content.replace(
  /course: 'Diploma in CE', admissionType: 'Regular', academicSession: '2024-25'/,
  "course: '', department: '', semester: '', admissionType: 'Regular', academicSession: '2024-25', scholarshipScheme: ''"
);

// 2. Add state hooks for fetched data right after formData
const stateHooks = `  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [feeStructure, setFeeStructure] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const config = { headers: { Authorization: \`Bearer \${token}\` } };
        
        const [courseRes, deptRes, semRes, schRes] = await Promise.all([
          axios.get(\`\${import.meta.env.VITE_API_URL}/academics/courses\`, config),
          axios.get(\`\${import.meta.env.VITE_API_URL}/academics/departments\`, config),
          axios.get(\`\${import.meta.env.VITE_API_URL}/academics/semesters\`, config),
          axios.get(\`\${import.meta.env.VITE_API_URL}/scholarships/schemes\`, config).catch(() => ({data: []}))
        ]);
        
        setCourses(courseRes.data || []);
        setDepartments(deptRes.data || []);
        setSemesters(semRes.data || []);
        setScholarships(schRes.data?.data || schRes.data || []);
      } catch (error) {
        console.error('Error fetching dynamic data', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchFeeStructure = async () => {
      if (formData.course && formData.semester) {
        try {
          const token = localStorage.getItem('admin_token');
          // In routes feeRoutes.js is mapped to /fee. But checking backend/index.js is best. 
          // Usually it is /fee or /fees. I will assume /fee based on common pattern, or just /financial/fee-structures.
          // Let's use /fee
          const res = await axios.get(\`\${import.meta.env.VITE_API_URL}/fee/fee-structures\`, {
            headers: { Authorization: \`Bearer \${token}\` },
            params: { course: formData.course, semester: formData.semester }
          });
          setFeeStructure(res.data.data?.[0] || null);
        } catch (error) {
          console.error('Error fetching fee structure', error);
        }
      }
    };
    fetchFeeStructure();
  }, [formData.course, formData.semester]);`;

content = content.replace(
  /const handleFieldChange = \(name, value\) => setFormData\(prev => \({ \.\.\.prev, \[name\]: value }\)\);/,
  `const handleFieldChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));\n\n${stateHooks}`
);

// 3. Update Step 4 - Course, Department, Semester
content = content.replace(
  /<SelectField label="Course" options={\['Diploma in CE','Diploma in IT','Diploma in ME','Diploma in EE'\]} name="course"[^>]*\/>/,
  `<SelectField label="Course" options={courses.map(c => c.name || c.courseName || c.title || c)} name="course" value={formData['course'] || ''} onChange={(e) => handleFieldChange('course', e.target.value)} />`
);
content = content.replace(
  /<SelectField label="Department" options={\['Civil Engineering','Information Technology','Mechanical Engineering','Electrical Engineering'\]}[^>]*\/>/,
  `<SelectField label="Department" options={departments.map(d => d.name || d.departmentName || d)} name="department" value={formData['department'] || ''} onChange={(e) => handleFieldChange('department', e.target.value)} />`
);
content = content.replace(
  /<SelectField label="Semester" options={\['1st Semester','2nd Semester','3rd Semester \(Lateral Entry\)'\]}[^>]*\/>/,
  `<SelectField label="Semester" options={semesters.map(s => s.name || s.semesterName || s)} name="semester" value={formData['semester'] || ''} onChange={(e) => handleFieldChange('semester', e.target.value)} />`
);

// 4. Update Step 6 - Scholarship Scheme Name
content = content.replace(
  /<InputField label="Scholarship Scheme Name"[^>]*\/>/,
  `<SelectField label="Scholarship Scheme Name" options={scholarships.map(s => s.schemeName || s.name || s)} name="scholarshipScheme" value={formData['scholarshipScheme'] || ''} onChange={(e) => handleFieldChange('scholarshipScheme', e.target.value)} />`
);

// 5. Update Step 7 - Fee Breakdown Dynamic logic
const feeBreakdownHtml = `          <div className="bg-gray-50 rounded-xl p-5">
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
          </div>`;

content = content.replace(
  /<div className="bg-gray-50 rounded-xl p-5">\s*<h4 className="text-\[14px\] font-bold text-gray-800 mb-4">Fee Breakdown<\/h4>[\s\S]*?<div className="flex justify-between py-2 pt-3">\s*<span className="text-\[14px\] font-bold text-gray-800">Total<\/span>\s*<span className="text-\[14px\] font-bold text-\[#0A6C54\]">.37,500<\/span>\s*<\/div>\s*<\/div>\s*<\/div>/,
  feeBreakdownHtml
);

// 6. Fix backend API endpoint mapping logic by checking index.js
const backendIndex = fs.readFileSync('../backend/index.js', 'utf8');
const feeRouteMatch = backendIndex.match(/app\.use\(['"]\/api\/([^'"]+)['"],\s*require\(['"]\.\/routes\/feeRoutes['"]\)/);
if (feeRouteMatch) {
  content = content.replace(/\/fee\/fee-structures/g, '/' + feeRouteMatch[1] + '/fee-structures');
}

fs.writeFileSync(file, content);
console.log('Successfully updated NewAdmission.jsx for dynamic data fetching.');
