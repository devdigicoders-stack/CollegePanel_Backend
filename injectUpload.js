const fs = require('fs');
const file = '../admin/src/pages/admissions/NewAdmission.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add uploadedDocs state
const statePattern = /const \[feeStructure, setFeeStructure\] = useState\(null\);/;
if (content.match(statePattern)) {
  content = content.replace(
    statePattern,
    `const [feeStructure, setFeeStructure] = useState(null);\n  const [uploadedDocs, setUploadedDocs] = useState({});\n  const [uploadingDoc, setUploadingDoc] = useState(null);`
  );
}

// Add handleFileUpload function
const handleFileUploadHtml = `  const handleFileUpload = async (e, docName) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      setUploadingDoc(docName);
      const token = localStorage.getItem('admin_token');
      const res = await axios.post(\`\${import.meta.env.VITE_API_URL}/upload\`, formDataUpload, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: \`Bearer \${token}\`
        }
      });
      setUploadedDocs(prev => ({ ...prev, [docName]: res.data.url }));
    } catch (error) {
      console.error('Error uploading file', error);
      alert('Error uploading file');
    } finally {
      setUploadingDoc(null);
    }
  };\n\n`;

content = content.replace(/const handleFieldChange/, handleFileUploadHtml + '  const handleFieldChange');

// Update Step 5 (Document Upload)
const step5Pattern = /case 5: return \([\s\S]*?\{\[([\s\S]*?)\]\.map\(doc => \(\s*<div key=\{doc\}([\s\S]*?)<label className="([^"]*?)">([\s\S]*?)<input type="file" className="hidden" \/>\s*<\/label>\s*<\/div>\s*\)\)\s*<\/div>\s*<\/div>\s*\);/;

const newStep5 = `case 5: return (
        <div className="space-y-4">
          <p className="text-[13px] text-gray-600">Upload required documents. Accepted formats: PDF, JPG, PNG (Max 2MB each)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Photograph','Signature','Aadhaar Card','10th Marksheet','12th Marksheet','Transfer Certificate','Migration Certificate','Character Certificate','Caste Certificate','Income Certificate','Domicile Certificate','Medical Certificate'].map(doc => (
              <div key={doc} className="border border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-between hover:border-[#0A6C54] transition-colors">
                <div>
                  <p className="text-[13px] font-medium text-gray-700">{doc}</p>
                  {uploadedDocs[doc] ? (
                    <a href={\`http://localhost:5000\${uploadedDocs[doc]}\`} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-blue-600 hover:underline">View Uploaded File</a>
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
      );`;

content = content.replace(step5Pattern, newStep5);

// Update Step 6 (Scholarship Document Upload)
const step6UploadPattern = /<input type="file" className="hidden" \/>/g;
content = content.replace(step6UploadPattern, (match, offset, str) => {
  // Only replace the one in step 6 if it hasn't been replaced
  if (str.substring(offset - 100, offset).includes('Scholarship Documents')) {
    return `<input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'Scholarship Document')} />`;
  }
  return match;
});

// Add visual feedback to Step 6 scholarship upload
const step6DocUI = /<Upload size=\{20\} className="mx-auto text-gray-400 mb-2" \/>\s*<p className="text-\[13px\] text-gray-600">Upload scholarship documents<\/p>\s*<input type="file" className="hidden" onChange=\{\(e\) => handleFileUpload\(e, 'Scholarship Document'\)\} \/>/;

if (content.match(step6DocUI)) {
  content = content.replace(step6DocUI, `{uploadingDoc === 'Scholarship Document' ? (
                <p className="text-[13px] text-gray-500">Uploading...</p>
              ) : uploadedDocs['Scholarship Document'] ? (
                <div>
                  <Check size={20} className="mx-auto text-green-500 mb-2" />
                  <p className="text-[13px] text-green-600 font-medium mb-1">Document Uploaded Successfully</p>
                  <a href={\`http://localhost:5000\${uploadedDocs['Scholarship Document']}\`} target="_blank" rel="noreferrer" className="text-[12px] text-blue-600 hover:underline">View Document</a>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload size={20} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-[13px] text-gray-600 hover:text-[#0A6C54]">Click to upload scholarship documents</p>
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'Scholarship Document')} />
                </label>
              )}`);
}

// Format documents array in handleSubmit
const submitPattern = /stage: 'Application',\s*status: 'Pending Verification'/;
if (content.match(submitPattern)) {
  content = content.replace(submitPattern, `stage: 'Application',\n                    status: 'Pending Verification',\n                    documents: Object.keys(uploadedDocs).map(name => ({ name, url: uploadedDocs[name], status: 'Pending' }))`);
}

fs.writeFileSync(file, content);
console.log('Successfully injected file upload logic.');
