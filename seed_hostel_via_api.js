const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config({ path: 'd:/Desktop/DCT_CLG_CRM/backend/.env' });

const College = require('./models/College');
const Student = require('./models/Student');

const BASE_URL = 'http://localhost:5003/api/hostel';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const college = await College.findOne({});
  if (!college) {
    console.error('No college found');
    process.exit(1);
  }
  const collegeId = college._id;
  console.log(`Using College ID: ${collegeId}`);

  // Ensure we have at least 10 active students
  let students = await Student.find({ collegeId, status: 'Active' });
  console.log(`Current active students: ${students.length}`);

  const extraStudents = [
    {
      studentId: 'STU2026009',
      studentName: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '+91 9876501234',
      course: 'B.Tech CSE',
      gender: 'Female',
      year: '2nd Year',
      semester: 'Sem 3',
      section: 'A',
      collegeId,
      enrollmentDate: new Date('2024-08-01'),
      status: 'Active'
    },
    {
      studentId: 'STU2026010',
      studentName: 'Ananya Verma',
      email: 'ananya.verma@example.com',
      phone: '+91 9876505678',
      course: 'B.Tech AI',
      gender: 'Female',
      year: '2nd Year',
      semester: 'Sem 3',
      section: 'B',
      collegeId,
      enrollmentDate: new Date('2024-08-01'),
      status: 'Active'
    },
    {
      studentId: 'STU2026011',
      studentName: 'Rohit Kumar',
      email: 'rohit.kumar@example.com',
      phone: '+91 9876509012',
      course: 'Diploma ME',
      gender: 'Male',
      year: '1st Year',
      semester: 'Sem 1',
      section: 'A',
      collegeId,
      enrollmentDate: new Date('2025-08-01'),
      status: 'Active'
    },
    {
      studentId: 'STU2026012',
      studentName: 'Amit Singh',
      email: 'amit.singh@example.com',
      phone: '+91 9876503456',
      course: 'B.Tech IT',
      gender: 'Male',
      year: '3rd Year',
      semester: 'Sem 5',
      section: 'A',
      collegeId,
      enrollmentDate: new Date('2023-08-01'),
      status: 'Active'
    }
  ];

  for (const s of extraStudents) {
    const exists = await Student.findOne({ studentId: s.studentId, collegeId });
    if (!exists) {
      await Student.create(s);
      console.log(`Created extra student: ${s.studentName} (${s.studentId})`);
    }
  }

  students = await Student.find({ collegeId, status: 'Active' });
  console.log(`Total active students available: ${students.length}`);

  // Generate Admin JWT Token
  const token = jwt.sign(
    { id: collegeId.toString(), role: 'college_admin' },
    process.env.JWT_SECRET || 'secret123',
    { expiresIn: '30d' }
  );

  const api = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('\n=============================================');
  console.log('1. SEEDING 10 HOSTEL ROOMS VIA API');
  console.log('=============================================');

  const roomsData = [
    { blockName: 'Block A (Boys)', roomNumber: '101', capacity: 2, type: 'AC' },
    { blockName: 'Block A (Boys)', roomNumber: '102', capacity: 2, type: 'Non-AC' },
    { blockName: 'Block A (Boys)', roomNumber: '103', capacity: 3, type: 'AC' },
    { blockName: 'Block A (Boys)', roomNumber: '201', capacity: 2, type: 'Non-AC' },
    { blockName: 'Block A (Boys)', roomNumber: '202', capacity: 3, type: 'Non-AC' },
    { blockName: 'Block B (Girls)', roomNumber: '101', capacity: 2, type: 'AC' },
    { blockName: 'Block B (Girls)', roomNumber: '102', capacity: 2, type: 'Non-AC' },
    { blockName: 'Block B (Girls)', roomNumber: '201', capacity: 3, type: 'AC' },
    { blockName: 'Block B (Girls)', roomNumber: '202', capacity: 2, type: 'Non-AC' },
    { blockName: 'Block C (Deluxe)', roomNumber: '301', capacity: 1, type: 'AC' }
  ];

  const createdRooms = [];
  // First check existing rooms
  const existingRoomsRes = await api.get('/rooms');
  const existingRooms = existingRoomsRes.data.rooms || [];

  for (const r of roomsData) {
    const found = existingRooms.find(er => er.blockName === r.blockName && er.roomNumber === r.roomNumber);
    if (found) {
      console.log(`Room ${r.blockName} ${r.roomNumber} already exists: ${found._id}`);
      createdRooms.push(found);
    } else {
      try {
        const res = await api.post('/rooms', r);
        console.log(`[API POST /rooms] Added: ${r.blockName} - Room ${r.roomNumber} (ID: ${res.data.room._id})`);
        createdRooms.push(res.data.room);
      } catch (e) {
        console.error(`Failed to add room ${r.roomNumber}:`, e.response?.data || e.message);
      }
    }
  }

  console.log('\n=============================================');
  console.log('2. ALLOCATING 10 STUDENTS TO ROOMS VIA API');
  console.log('=============================================');

  const existingAllocsRes = await api.get('/allocations?status=All');
  const existingAllocs = existingAllocsRes.data || [];
  const allocatedStudentIds = new Set(existingAllocs.filter(a => a.status === 'Active').map(a => a.studentId?._id?.toString()));

  const createdAllocs = [...existingAllocs];

  for (let i = 0; i < Math.min(10, students.length); i++) {
    const student = students[i];
    const sId = student._id.toString();
    if (allocatedStudentIds.has(sId)) {
      console.log(`Student ${student.studentName} is already allocated.`);
      continue;
    }

    // Pick room
    const targetRoom = createdRooms[i % createdRooms.length];
    try {
      const res = await api.post('/allocate', {
        roomId: targetRoom._id,
        studentId: sId
      });
      console.log(`[API POST /allocate] Allocated ${student.studentName} -> ${targetRoom.blockName} Room ${targetRoom.roomNumber}`);
      createdAllocs.push(res.data.allocation);
      allocatedStudentIds.add(sId);
    } catch (e) {
      console.log(`Allocation notice for ${student.studentName}:`, e.response?.data?.message || e.message);
    }
  }

  // Refresh active allocations to get full populated data
  const freshAllocsRes = await api.get('/allocations?status=Active');
  const activeAllocs = freshAllocsRes.data || [];
  console.log(`Total Active Allotments: ${activeAllocs.length}`);

  console.log('\n=============================================');
  console.log('3. SEEDING 10 CHECK-IN / CHECK-OUT LOGS VIA API');
  console.log('=============================================');

  const checkInOutSamples = [
    { type: 'Check-In', remarks: 'Semester start reporting - Key & mattress issued', damageCharges: 0 },
    { type: 'Check-In', remarks: 'Returned from weekend home visit on time', damageCharges: 0 },
    { type: 'Check-Out', remarks: 'Leaving for weekend family function with parent permission', damageCharges: 0 },
    { type: 'Check-In', remarks: 'Late evening check-in (8:30 PM) after coaching classes', damageCharges: 0 },
    { type: 'Check-Out', remarks: 'Departure for Inter-college Sports Meet', damageCharges: 0 },
    { type: 'Check-In', remarks: 'Returned from sports meet with warden pass', damageCharges: 0 },
    { type: 'Check-Out', remarks: 'Leaving for hometown due to family festival', damageCharges: 0 },
    { type: 'Check-In', remarks: 'Return from festival leave with gate pass verification', damageCharges: 0 },
    { type: 'Check-Out', remarks: 'Medical checkup leave - city hospital visit', damageCharges: 0 },
    { type: 'Check-In', remarks: 'Returned from hospital, medical prescription submitted', damageCharges: 0 }
  ];

  for (let i = 0; i < 10; i++) {
    const student = students[i % students.length];
    const item = checkInOutSamples[i];
    try {
      const res = await api.post('/check-in-out', {
        studentId: student._id,
        type: item.type,
        remarks: item.remarks,
        damageCharges: item.damageCharges
      });
      console.log(`[API POST /check-in-out] ${item.type} for ${student.studentName}: "${item.remarks}"`);
    } catch (e) {
      console.error(`CheckInOut log error:`, e.response?.data || e.message);
    }
  }

  console.log('\n=============================================');
  console.log('4. SEEDING 10 LEAVE & OUTING REQUESTS VIA API');
  console.log('=============================================');

  const leaveSamples = [
    { type: 'Leave', daysFrom: -3, daysTo: 2, reason: "Sister's wedding celebration at native village", status: 'Approved' },
    { type: 'Outing', daysFrom: 0, daysTo: 0, reason: 'Purchasing hardware components for final year project in market', status: 'Approved' },
    { type: 'Leave', daysFrom: 1, daysTo: 5, reason: 'Severe viral fever, doctor advised 5 days home rest', status: 'Pending' },
    { type: 'Outing', daysFrom: 0, daysTo: 0, reason: 'Attending aptitude workshop at central campus library', status: 'Approved' },
    { type: 'Leave', daysFrom: 2, daysTo: 6, reason: 'Family pilgrimage trip to Varanasi', status: 'Pending' },
    { type: 'Outing', daysFrom: 0, daysTo: 0, reason: 'Regional passport seva kendra appointment for documentation', status: 'Approved' },
    { type: 'Leave', daysFrom: -5, daysTo: -2, reason: 'Urgent family emergency in hometown', status: 'Approved' },
    { type: 'Outing', daysFrom: 0, daysTo: 0, reason: 'Dinner outing with local family guardians', status: 'Rejected' },
    { type: 'Leave', daysFrom: 3, daysTo: 7, reason: 'Participating in National Robotics Competition at IIT Kanpur', status: 'Pending' },
    { type: 'Outing', daysFrom: 0, daysTo: 0, reason: 'Evening bank work and ATM cash withdrawal', status: 'Approved' }
  ];

  for (let i = 0; i < 10; i++) {
    const student = students[i % students.length];
    const s = leaveSamples[i];
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + s.daysFrom);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + s.daysTo);

    try {
      const res = await api.post('/leaves', {
        studentId: student._id,
        type: s.type,
        fromDate: fromDate.toISOString().split('T')[0],
        toDate: toDate.toISOString().split('T')[0],
        reason: s.reason
      });
      const leaveId = res.data.leave._id;
      if (s.status !== 'Pending') {
        await api.put(`/leaves/${leaveId}/status`, { status: s.status });
      }
      console.log(`[API POST /leaves & PUT status] ${s.type} for ${student.studentName} [Status: ${s.status}] - "${s.reason}"`);
    } catch (e) {
      console.error(`Leave error:`, e.response?.data || e.message);
    }
  }

  console.log('\n=============================================');
  console.log('5. SEEDING 10 VISITOR ENTRIES VIA API');
  console.log('=============================================');

  const visitorSamples = [
    { visitorName: 'Ramesh Sharma', contactNumber: '9876543210', relation: 'Father', purpose: 'Delivering winter clothes and essentials', checkout: false },
    { visitorName: 'Sunita Devi', contactNumber: '9876543211', relation: 'Mother', purpose: 'Bringing homemade food and health checkup', checkout: true },
    { visitorName: 'Anil Kumar', contactNumber: '9876543212', relation: 'Brother', purpose: 'Handing over laptop charger and project files', checkout: true },
    { visitorName: 'Dr. R.P. Verma', contactNumber: '9876543213', relation: 'Guardian', purpose: 'Meeting with hostel warden regarding academic progress', checkout: false },
    { visitorName: 'Pooja Gupta', contactNumber: '9876543214', relation: 'Sister', purpose: 'Delivering study material and books', checkout: true },
    { visitorName: 'Sanjay Pandey', contactNumber: '9876543215', relation: 'Father', purpose: 'Submitting college tuition fee receipt to warden', checkout: false },
    { visitorName: 'Kavita Singh', contactNumber: '9876543216', relation: 'Mother', purpose: 'Routine parent visit on second Saturday', checkout: true },
    { visitorName: 'Vikram Yadav', contactNumber: '9876543217', relation: 'Brother', purpose: 'Dropping student back after weekend leave', checkout: true },
    { visitorName: 'Harish Chaurasiya', contactNumber: '9876543218', relation: 'Father', purpose: 'Parent-warden meeting regarding room facilities', checkout: false },
    { visitorName: 'Deepak Mishra', contactNumber: '9876543219', relation: 'Friend', purpose: 'Group study session discussion in reception lounge', checkout: true }
  ];

  for (let i = 0; i < 10; i++) {
    const student = students[i % students.length];
    const v = visitorSamples[i];
    try {
      const res = await api.post('/visitors', {
        visitorName: v.visitorName,
        contactNumber: v.contactNumber,
        studentId: student._id,
        relation: v.relation,
        purpose: v.purpose
      });
      const visitorId = res.data.visitor._id;
      if (v.checkout) {
        await api.put(`/visitors/${visitorId}/checkout`);
        console.log(`[API POST /visitors & PUT checkout] Visitor ${v.visitorName} (${v.relation} of ${student.studentName}) - [Checked Out]`);
      } else {
        console.log(`[API POST /visitors] Visitor ${v.visitorName} (${v.relation} of ${student.studentName}) - [Inside]`);
      }
    } catch (e) {
      console.error(`Visitor error:`, e.response?.data || e.message);
    }
  }

  console.log('\n=============================================');
  console.log('6. SEEDING 10 INCIDENT REPORTS VIA API');
  console.log('=============================================');

  const incidentSamples = [
    { incidentType: 'Late return', description: 'Arrived at hostel main gate at 10:30 PM after 9:00 PM curfew without prior permission', actionTaken: 'Verbal warning issued by Chief Warden; parent informed via SMS', status: 'Closed' },
    { incidentType: 'Rule violation', description: 'Unauthorized high-power electric kettle and coil heater found during routine room inspection', actionTaken: 'Electric appliances seized until end of semester; Rs. 500 fine imposed', status: 'Closed' },
    { incidentType: 'Rule violation', description: 'Playing loud music with high-bass speakers at 12:15 AM, disrupting corridor study hours', actionTaken: 'Written warning issued to occupants of Room 102', status: 'Closed' },
    { incidentType: 'Property damage', description: 'Bathroom door lock handle broken due to rough handling during morning hours', actionTaken: 'Assessed damage repair cost of Rs. 350 debited to maintenance ledger', status: 'Open' },
    { incidentType: 'Unauthorized absence', description: 'Student absent during 9:30 PM mandatory night roll call without registered leave slip', actionTaken: 'Student contacted on mobile; explanation letter submitted next morning', status: 'Closed' },
    { incidentType: 'Rule violation', description: 'Non-hostelite day scholar student discovered staying in room past 9:00 PM', actionTaken: 'Day scholar escorted out; hostelite given strict written reprimand', status: 'Closed' },
    { incidentType: 'Late return', description: 'Reported to hostel at 11:15 PM following city movie outing without gate pass', actionTaken: 'Gate security incident log updated; warden hearing scheduled', status: 'Open' },
    { incidentType: 'Property damage', description: 'Corridor emergency fire extinguisher glass seal tampered with', actionTaken: 'Under investigation; reviewing CCTV footage of Block A 2nd floor', status: 'Open' },
    { incidentType: 'Rule violation', description: 'Cooking food inside room in violation of hostel fire safety policy', actionTaken: 'Hotplate confiscated; mandatory safety advisory issued', status: 'Closed' },
    { incidentType: 'Late return', description: 'Returned late from coaching center due to heavy rain and traffic congestion', actionTaken: 'Valid bus ticket verified; excused by assistant warden', status: 'Closed' }
  ];

  for (let i = 0; i < 10; i++) {
    const student = students[i % students.length];
    const inc = incidentSamples[i];
    const incDate = new Date();
    incDate.setDate(incDate.getDate() - (i * 2));

    try {
      const res = await api.post('/incidents', {
        studentId: student._id,
        incidentType: inc.incidentType,
        description: inc.description,
        actionTaken: inc.actionTaken,
        date: incDate.toISOString().split('T')[0]
      });
      const incId = res.data.incident._id;
      if (inc.status === 'Closed') {
        await api.put(`/incidents/${incId}/status`, {
          status: 'Closed',
          actionTaken: inc.actionTaken + ' (Resolved)'
        });
      }
      console.log(`[API POST /incidents] ${inc.incidentType} for ${student.studentName} [Status: ${inc.status}] - "${inc.description.slice(0, 50)}..."`);
    } catch (e) {
      console.error(`Incident error:`, e.response?.data || e.message);
    }
  }

  console.log('\n=============================================');
  console.log('7. SEEDING 10 INVENTORY ASSETS VIA API');
  console.log('=============================================');

  const inventorySamples = [
    { itemName: 'Wooden Study Tables with Drawer', category: 'Furniture', quantity: 25, condition: 'Good', remarks: 'Hardwood teak finish tables allocated to Block A' },
    { itemName: 'Godrej Steel Double-Door Almirah', category: 'Furniture', quantity: 18, condition: 'Good', remarks: 'Heavy gauge steel lockers with duplicate keys' },
    { itemName: 'Orthopedic Cotton Mattresses (Single Bed)', category: 'Bedding', quantity: 30, condition: 'Good', remarks: 'High density foam mattresses with washable cover' },
    { itemName: 'Orient High-Speed Ceiling Fans (1200mm)', category: 'Electrical', quantity: 20, condition: 'Good', remarks: '5-star energy rated ceiling fans in all rooms' },
    { itemName: 'Philips 20W LED Batten Tube Lights', category: 'Electrical', quantity: 35, condition: 'Good', remarks: 'Energy efficient cool daylight lighting' },
    { itemName: 'Bajaj 25L Vertical Storage Geysers', category: 'Plumbing', quantity: 6, condition: 'Needs Repair', remarks: 'Floor 1 geyser heating element requires replacement' },
    { itemName: 'Ergonomic Plastic Study Chairs (Neelkamal)', category: 'Furniture', quantity: 30, condition: 'Good', remarks: 'Durable molded armchairs for student rooms' },
    { itemName: 'Industrial Wet & Dry Vacuum Cleaner (Eureka)', category: 'Cleaning', quantity: 2, condition: 'Good', remarks: 'Corridor and common area maintenance unit' },
    { itemName: 'Heavy-Duty Brass Mortise Door Locks', category: 'Plumbing', quantity: 12, condition: 'Needs Repair', remarks: '3 lock sets need cylinder alignment in Block B' },
    { itemName: 'Stainless Steel Foot-Pedal Waste Bins (20L)', category: 'Cleaning', quantity: 15, condition: 'Damaged', remarks: '2 bins have broken foot pedal mechanism' }
  ];

  for (let i = 0; i < 10; i++) {
    const inv = inventorySamples[i];
    const targetRoom = createdRooms[i % createdRooms.length];
    try {
      const res = await api.post('/inventory', {
        itemName: inv.itemName,
        category: inv.category,
        quantity: inv.quantity,
        condition: inv.condition,
        roomId: targetRoom?._id || null,
        remarks: inv.remarks
      });
      console.log(`[API POST /inventory] Added "${inv.itemName}" (${inv.category}, Qty: ${inv.quantity}, Condition: ${inv.condition})`);
    } catch (e) {
      console.error(`Inventory error:`, e.response?.data || e.message);
    }
  }

  console.log('\n=============================================');
  console.log('8. SEEDING 10 ATTENDANCE RECORDS VIA API');
  console.log('=============================================');

  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceRecords = [];

  for (let i = 0; i < Math.min(10, activeAllocs.length || students.length); i++) {
    const student = students[i];
    const room = createdRooms[i % createdRooms.length];
    const statuses = ['Present', 'Present', 'Present', 'Present', 'Late', 'Present', 'Absent', 'Present', 'Present', 'Late'];
    const remarks = ['Present at roll call', 'Present at roll call', 'Present at roll call', 'Present at roll call', 'Reported 15 mins late', 'Present at roll call', 'Approved sick leave', 'Present at roll call', 'Present at roll call', '10 mins late due to lab class'];

    attendanceRecords.push({
      studentId: student._id,
      roomId: room._id,
      status: statuses[i],
      remarks: remarks[i]
    });
  }

  if (attendanceRecords.length > 0) {
    try {
      await api.post('/attendance', {
        date: todayStr,
        records: attendanceRecords
      });
      console.log(`[API POST /attendance] Marked attendance for ${attendanceRecords.length} students on date: ${todayStr}`);
    } catch (e) {
      console.error(`Attendance error:`, e.response?.data || e.message);
    }
  }

  console.log('\n=============================================');
  console.log('9. VERIFYING DASHBOARD STATS VIA API');
  console.log('=============================================');

  const finalStats = await api.get('/dashboard/stats');
  console.log('Dashboard Stats Response:', JSON.stringify(finalStats.data, null, 2));

  console.log('\n=============================================');
  console.log('SUCCESS! ALL 10 HOSTEL DATASETS SEEDED PROPERLY VIA API');
  console.log('=============================================');

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
