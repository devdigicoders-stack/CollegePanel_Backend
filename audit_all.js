const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

// Colors
const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const B = (s) => `\x1b[34m${s}\x1b[0m`;
const W = (s) => `\x1b[1m${s}\x1b[0m`;

const BASE = 'http://localhost:5000/api';
let TOKEN = '';
let EMPLOYEE_TOKEN = '';
let results = [];

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000,
      path: '/api' + path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (data) r.write(data);
    r.end();
  });
}

function check(label, status, body, expectedStatus = 200) {
  const ok = status === expectedStatus;
  const mark = ok ? G('✓') : R('✗');
  const count = ok ? G(status) : R(status);
  console.log(`  ${mark} [${count}] ${label}`);
  if (!ok) console.log(`       ${Y('→')} ${JSON.stringify(body).substring(0, 120)}`);
  results.push({ label, ok, status });
  return ok;
}

async function run() {
  console.log(W('\n══════════════════════════════════════════════════════'));
  console.log(W('       ADMIN PANEL FULL AUDIT — ' + new Date().toLocaleTimeString()));
  console.log(W('══════════════════════════════════════════════════════\n'));

  // ── 1. AUTH ───────────────────────────────────────────────────────────────
  console.log(B('▶ 1. AUTHENTICATION'));

  let r = await req('POST', '/college-admin/login', { username: 'admin', password: 'Admin@123' });
  check('College Admin login (admin / Admin@123)', r.status, r.body);
  if (r.status === 200) { TOKEN = r.body.token; console.log(`     ${G('→')} Logged in as: ${r.body.name} (${r.body.role})`); }

  let r2 = await req('POST', '/college-admin/login', { username: 'tceadmin', password: 'Admin@123' });
  check('College Admin login (tceadmin)', r2.status, r2.body);

  // Employee login
  let r3 = await req('POST', '/college-admin/login', { username: 'employee.1', password: 'Employee$7449' });
  check('Employee login (employee.1)', r3.status, r3.body);
  if (r3.status === 200) {
    EMPLOYEE_TOKEN = r3.body.token;
    console.log(`     ${G('→')} Employee role: ${r3.body.role}, permissions: ${r3.body.permissions?.length || 0}`);
  }

  // Wrong password
  let r4 = await req('POST', '/college-admin/login', { username: 'admin', password: 'wrongpass' });
  check('Login rejects wrong password', r4.status, r4.body, 401);

  // ── 2. DASHBOARD ─────────────────────────────────────────────────────────
  console.log(B('\n▶ 2. DASHBOARD'));
  let rd = await req('GET', '/dashboard/overview', null, TOKEN);
  check('Dashboard overview', rd.status, rd.body);
  if (rd.status === 200) {
    const d = rd.body;
    console.log(`     ${G('→')} Students:${d.totalStudents} Employees:${d.totalEmployees} Admissions:${d.totalAdmissions} Exams:${d.upcomingExams}`);
  }

  // ── 3. STUDENTS ───────────────────────────────────────────────────────────
  console.log(B('\n▶ 3. STUDENTS'));
  let rs = await req('GET', '/students', null, TOKEN);
  check('GET /students', rs.status, rs.body);
  if (rs.status === 200) console.log(`     ${G('→')} Count: ${rs.body.data?.length || rs.body.length || 0}`);

  // Add student
  const newStudent = { studentName: 'Audit Test Student', email: `audit.student.${Date.now()}@test.com`, course: 'B.Tech CSE', year: '1st', enrollmentDate: new Date().toISOString(), status: 'Active' };
  let rs2 = await req('POST', '/students', newStudent, TOKEN);
  check('POST /students (add)', rs2.status, rs2.body, 201);
  let newStudentId = rs2.body?.data?._id || rs2.body?._id;
  if (newStudentId) {
    let rs3 = await req('GET', `/students/${newStudentId}`, null, TOKEN);
    check('GET /students/:id (fetch after add)', rs3.status, rs3.body);
    let rs4 = await req('DELETE', `/students/${newStudentId}`, null, TOKEN);
    check('DELETE /students/:id (cleanup)', rs4.status, rs4.body);
  }

  // ── 4. EMPLOYEES & CREDENTIALS ───────────────────────────────────────────
  console.log(B('\n▶ 4. EMPLOYEES & CREDENTIAL CREATION'));
  let re = await req('GET', '/employees', null, TOKEN);
  check('GET /employees', re.status, re.body);
  if (re.status === 200) {
    const emps = re.body.data || re.body;
    console.log(`     ${G('→')} Count: ${Array.isArray(emps) ? emps.length : 0}`);
    if (Array.isArray(emps) && emps.length > 0) {
      const e = emps[0];
      console.log(`     ${G('→')} Sample: name=${e.name}, username=${e.username || 'MISSING'}, password=${e.password ? 'SET' : 'MISSING'}, role=${e.role}`);
      if (!e.username || !e.password) {
        console.log(`     ${R('⚠ ISSUE: Employee missing credentials!')}`);
      }
    }
  }

  // Add employee and verify auto-credentials
  const ts = Date.now();
  const newEmp = { name: `AuditEmp ${ts}`, email: `audit.emp.${ts}@test.com`, mobile: '9999999999', role: 'Clerk', department: 'Admin', status: 'Active' };
  let re2 = await req('POST', '/employees', newEmp, TOKEN);
  check('POST /employees (add with auto-credentials)', re2.status, re2.body, 201);
  const empData = re2.body?.data || re2.body?.employee;
  if (empData) {
    const hasUser = !!empData.username;
    const hasPass = !!empData.password;
    console.log(`     ${hasUser ? G('✓') : R('✗')} Auto-username: ${empData.username || 'MISSING'}`);
    console.log(`     ${hasPass ? G('✓') : R('✗')} Auto-password: ${empData.password || 'MISSING'}`);
    if (hasUser && hasPass) {
      // Try logging in with new employee
      let empLogin = await req('POST', '/college-admin/login', { username: empData.username, password: empData.password });
      check('New employee login with auto-credentials', empLogin.status, empLogin.body);
    }
    // Cleanup
    if (empData._id) await req('DELETE', `/employees/${empData._id}`, null, TOKEN);
  }

  // ── 5. ROLES & PERMISSIONS ────────────────────────────────────────────────
  console.log(B('\n▶ 5. ROLES & PERMISSIONS'));
  let rr = await req('GET', '/roles', null, TOKEN);
  check('GET /roles', rr.status, rr.body);
  if (rr.status === 200) {
    const roles = rr.body.data || [];
    console.log(`     ${G('→')} Total roles: ${roles.length}`);
    roles.forEach(role => {
      const permCount = role.permissions?.length || 0;
      const flag = permCount === 0 ? Y('⚠ NO PERMISSIONS') : G(`${permCount} permissions`);
      console.log(`     → Role: "${role.name}" [${flag}]`);
    });
  }

  let rp = await req('GET', '/roles/permissions/available', null, TOKEN);
  check('GET /roles/permissions/available', rp.status, rp.body);
  if (rp.status === 200) console.log(`     ${G('→')} Categories: ${rp.body.data?.length || 0}`);

  // Create role with permissions
  const testRole = { name: `AuditRole_${Date.now()}`, description: 'Audit test', status: 'Active', permissions: ['View Students', 'View Dashboard'] };
  let rr2 = await req('POST', '/roles', testRole, TOKEN);
  check('POST /roles (create with permissions)', rr2.status, rr2.body, 201);
  if (rr2.status === 201 && rr2.body.data?._id) {
    const rid = rr2.body.data._id;
    let rr3 = await req('PUT', `/roles/${rid}`, { permissions: ['View Students', 'View Dashboard', 'Add Student'] }, TOKEN);
    check('PUT /roles/:id (update permissions)', rr3.status, rr3.body);
    await req('DELETE', `/roles/${rid}`, null, TOKEN);
  }

  // ── 6. ADMISSIONS ────────────────────────────────────────────────────────
  console.log(B('\n▶ 6. ADMISSIONS'));
  let ra = await req('GET', '/admissions', null, TOKEN);
  check('GET /admissions', ra.status, ra.body);
  if (ra.status === 200) console.log(`     ${G('→')} Count: ${ra.body.data?.length || 0}`);

  let ra2 = await req('GET', '/enquiries', null, TOKEN);
  check('GET /enquiries', ra2.status, ra2.body);
  if (ra2.status === 200) console.log(`     ${G('→')} Enquiries: ${ra2.body.data?.length || 0}`);

  // ── 7. ACADEMICS ─────────────────────────────────────────────────────────
  console.log(B('\n▶ 7. ACADEMICS'));
  let racCourses = await req('GET', '/academics/courses', null, TOKEN);
  check('GET /academics/courses', racCourses.status, racCourses.body);
  let racDepts = await req('GET', '/academics/departments', null, TOKEN);
  check('GET /academics/departments', racDepts.status, racDepts.body);
  let racSubs = await req('GET', '/academics/subjects', null, TOKEN);
  check('GET /academics/subjects', racSubs.status, racSubs.body);
  let racSecs = await req('GET', '/academics/sections', null, TOKEN);
  check('GET /academics/sections', racSecs.status, racSecs.body);

  // ── 8. FEES ───────────────────────────────────────────────────────────────
  console.log(B('\n▶ 8. FINANCIAL / FEES'));
  let rf1 = await req('GET', '/fees/structure', null, TOKEN);
  check('GET /fees/structure', rf1.status, rf1.body);
  let rf2 = await req('GET', '/fees/payments', null, TOKEN);
  check('GET /fees/payments', rf2.status, rf2.body);
  if (rf2.status === 200) console.log(`     ${G('→')} Payments: ${rf2.body.data?.length || 0}`);
  let rf3 = await req('GET', '/fees/pending-dues', null, TOKEN);
  check('GET /fees/pending-dues', rf3.status, rf3.body);

  // ── 9. ATTENDANCE ────────────────────────────────────────────────────────
  console.log(B('\n▶ 9. ATTENDANCE'));
  let ratt = await req('GET', '/attendance', null, TOKEN);
  check('GET /attendance', ratt.status, ratt.body);
  let ratt2 = await req('GET', '/attendance/sessions', null, TOKEN);
  check('GET /attendance/sessions', ratt2.status, ratt2.body);

  // ── 10. LIBRARY ──────────────────────────────────────────────────────────
  console.log(B('\n▶ 10. LIBRARY'));
  let rl = await req('GET', '/library/books', null, TOKEN);
  check('GET /library/books', rl.status, rl.body);
  if (rl.status === 200) console.log(`     ${G('→')} Books: ${rl.body.data?.length || 0}`);
  let rl2 = await req('GET', '/library/members', null, TOKEN);
  check('GET /library/members', rl2.status, rl2.body);
  let rl3 = await req('GET', '/library/transactions', null, TOKEN);
  check('GET /library/transactions', rl3.status, rl3.body);

  // ── 11. HOSTEL ───────────────────────────────────────────────────────────
  console.log(B('\n▶ 11. HOSTEL'));
  let rh = await req('GET', '/hostel/rooms', null, TOKEN);
  check('GET /hostel/rooms', rh.status, rh.body);
  let rh2 = await req('GET', '/hostel/allotments', null, TOKEN);
  check('GET /hostel/allotments', rh2.status, rh2.body);
  let rh3 = await req('GET', '/hostel/leaves', null, TOKEN);
  check('GET /hostel/leaves', rh3.status, rh3.body);

  // ── 12. SECURITY ─────────────────────────────────────────────────────────
  console.log(B('\n▶ 12. SECURITY'));
  let rsec = await req('GET', '/security/logs', null, TOKEN);
  check('GET /security/logs', rsec.status, rsec.body);
  let rsec2 = await req('GET', '/security/incidents', null, TOKEN);
  check('GET /security/incidents', rsec2.status, rsec2.body);
  let rsec3 = await req('GET', '/security/vehicles', null, TOKEN);
  check('GET /security/vehicles', rsec3.status, rsec3.body);

  // ── 13. NOTICES & COMPLAINTS ─────────────────────────────────────────────
  console.log(B('\n▶ 13. NOTICES & COMPLAINTS'));
  let rn = await req('GET', '/notices', null, TOKEN);
  check('GET /notices', rn.status, rn.body);
  if (rn.status === 200) console.log(`     ${G('→')} Notices: ${rn.body.data?.length || 0}`);

  let rc = await req('GET', '/complaints', null, TOKEN);
  check('GET /complaints', rc.status, rc.body);
  if (rc.status === 200) console.log(`     ${G('→')} Complaints: ${rc.body.data?.length || 0}`);

  // ── 14. EXAMS & TIMETABLE ─────────────────────────────────────────────────
  console.log(B('\n▶ 14. EXAMS & TIMETABLE'));
  let rex = await req('GET', '/exams', null, TOKEN);
  check('GET /exams', rex.status, rex.body);
  let rtt = await req('GET', '/timetable', null, TOKEN);
  check('GET /timetable', rtt.status, rtt.body);
  let rla = await req('GET', '/lesson-plans', null, TOKEN);
  check('GET /lesson-plans', rla.status, rla.body);
  let ras = await req('GET', '/assignments', null, TOKEN);
  check('GET /assignments', ras.status, ras.body);

  // ── 15. HR & LEAVE ────────────────────────────────────────────────────────
  console.log(B('\n▶ 15. HR & ADMIN'));
  let rlr = await req('GET', '/leave-requests', null, TOKEN);
  check('GET /leave-requests', rlr.status, rlr.body);
  let rm = await req('GET', '/meetings', null, TOKEN);
  check('GET /meetings', rm.status, rm.body);

  // ── 16. REPORTS ──────────────────────────────────────────────────────────
  console.log(B('\n▶ 16. REPORTS'));
  let rrepa = await req('GET', '/reports/admissions?reportType=Applications Overview', null, TOKEN);
  check('GET /reports/admissions', rrepa.status, rrepa.body);
  let rrepf = await req('GET', '/reports/financial?reportType=Fee Collections', null, TOKEN);
  check('GET /reports/financial', rrepf.status, rrepf.body);
  let rrepac = await req('GET', '/reports/academic?reportType=Student Directory', null, TOKEN);
  check('GET /reports/academic', rrepac.status, rrepac.body);
  let rreph = await req('GET', '/reports/hostel?reportType=Room Occupancy', null, TOKEN);
  check('GET /reports/hostel', rreph.status, rreph.body);
  let rreps = await req('GET', '/reports/security?reportType=Entry/Exit Log', null, TOKEN);
  check('GET /reports/security', rreps.status, rreps.body);

  // ── 17. STUDENT PORTAL ───────────────────────────────────────────────────
  console.log(B('\n▶ 17. STUDENT PORTAL'));
  let rsp = await req('GET', '/student-portal/dashboard', null, TOKEN);
  check('GET /student-portal/dashboard', rsp.status, rsp.body);
  let rsp2 = await req('GET', '/student-portal/profile', null, TOKEN);
  check('GET /student-portal/profile', rsp2.status, rsp2.body);
  let rsp3 = await req('GET', '/student-portal/complaints', null, TOKEN);
  check('GET /student-portal/complaints', rsp3.status, rsp3.body);

  // ── 18. PERMISSION-BASED ACCESS ──────────────────────────────────────────
  console.log(B('\n▶ 18. PERMISSION-BASED ACCESS (Employee with No Permissions)'));
  if (EMPLOYEE_TOKEN) {
    let ep1 = await req('GET', '/students', null, EMPLOYEE_TOKEN);
    check('Employee can GET /students (no role restriction on backend)', ep1.status, ep1.body);
    let ep2 = await req('GET', '/dashboard/overview', null, EMPLOYEE_TOKEN);
    check('Employee can GET /dashboard/overview', ep2.status, ep2.body);
  } else {
    console.log(`  ${Y('⚠ Skipped — employee token not obtained')}`);
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  const total = results.length;
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.log(W('\n══════════════════════════════════════════════════════'));
  console.log(W(`  AUDIT RESULTS: ${G(passed + ' PASSED')}  ${failed > 0 ? R(failed + ' FAILED') : G('0 FAILED')}  / ${total} total`));
  console.log(W('══════════════════════════════════════════════════════'));

  if (failed > 0) {
    console.log(R('\nFailed checks:'));
    results.filter(r => !r.ok).forEach(r => console.log(`  ✗ [${r.status}] ${r.label}`));
  }

  console.log('');
}

run().catch(console.error);
