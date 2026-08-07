const fs = require('fs');
const file = '../admin/src/pages/admissions/NewAdmission.jsx';
let content = fs.readFileSync(file, 'utf8');

// The replacement logic for Step 7:
const newStep7 = `      case 7: 
        const maxInstallments = feeStructure?.installments || 1;
        const feePlanOptions = ['Full Payment'];
        for (let i = 2; i <= maxInstallments; i++) {
          feePlanOptions.push(\`\${i} Installments\`);
        }

        const breakdown = feeStructure ? [
          { label: 'Admission Fee', amount: feeStructure.admissionFee || 0 },
          { label: 'Tuition Fee', amount: feeStructure.tuitionFee || 0 },
          { label: 'Registration Fee', amount: feeStructure.registrationFee || 0 },
          { label: 'Exam Fee', amount: feeStructure.examFee || 0 },
          { label: 'Lab Fee', amount: feeStructure.labFee || 0 },
        ].filter(f => f.amount > 0) : [
          { label: 'Admission Fee', amount: 5000 },
          { label: 'Tuition Fee', amount: 25000 },
          { label: 'Registration Fee', amount: 2000 },
          { label: 'Exam Fee', amount: 1500 },
          { label: 'Lab Fee', amount: 3000 },
        ];

        return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="Fee Plan" options={feePlanOptions} name="feePlan" value={formData['feePlan'] || ''} onChange={(e) => handleFieldChange('feePlan', e.target.value)} />
            <SelectField label="Payment Mode" options={['Cash','UPI','Bank Transfer','Cheque','DD']} name="paymentMode" value={formData['paymentMode'] || ''} onChange={(e) => handleFieldChange('paymentMode', e.target.value)} />
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <h4 className="text-[14px] font-bold text-gray-800 mb-4">Fee Breakdown {feeStructure ? '' : '(No Fee Structure found, showing Default)'}</h4>
            <div className="space-y-2">
              {breakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-[13px] text-gray-600">{item.label}</span>
                  <span className="text-[13px] font-semibold text-gray-800">₹{item.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 pt-3">
                <span className="text-[14px] font-bold text-gray-800">Total</span>
                <span className="text-[14px] font-bold text-[#0A6C54]">₹{feeStructure ? feeStructure.total?.toLocaleString() : '37,500'}</span>
              </div>
            </div>
          </div>
        </div>
      );`;

const step7Regex = /case 7: return \([\s\S]*?case 8: return \(/;
if (content.match(step7Regex)) {
  content = content.replace(step7Regex, newStep7 + '\n      case 8: return (');
}

fs.writeFileSync(file, content);
console.log('Successfully updated Step 7 Fee Plan to be fully dynamic.');
