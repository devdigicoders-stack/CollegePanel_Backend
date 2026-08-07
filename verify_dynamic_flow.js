const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const API_URL = 'http://localhost:5000/api';
let token = '';
let report = [];

async function loginAdmin() {
  try {
    const res = await axios.post(`${API_URL}/college-admin/login`, {
      username: 'principal',
      password: 'PrincipalPassword@123'
    });
    token = res.data.token;
    report.push('✅ Login: Successful');
    return true;
  } catch (error) {
    report.push(`❌ Login: Failed - ${error.message}`);
    return false;
  }
}

async function testEndpoint(name, method, url, data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${url}`,
      headers: { Authorization: `Bearer ${token}` }
    };
    if (data) config.data = data;
    
    const res = await axios(config);
    report.push(`✅ ${name}: OK (${res.status})`);
  } catch (error) {
    report.push(`❌ ${name}: Failed - ${error.response ? error.response.status : error.message}`);
  }
}

async function runTests() {
  console.log('Starting verification of APIs...');
  const loggedIn = await loginAdmin();
  if (!loggedIn) {
    console.log(report.join('\n'));
    return;
  }

  // Phase 1: Test dynamic models we know exist
  await testEndpoint('Get Admissions', 'GET', '/admissions');
  await testEndpoint('Get Admission Dashboard Stats', 'GET', '/admissions/dashboard-stats');
  
  await testEndpoint('Get Enquiries', 'GET', '/enquiries');
  await testEndpoint('Get Follow-ups', 'GET', '/followups');
  
  await testEndpoint('Get Roles', 'GET', '/roles');
  await testEndpoint('Get Employees', 'GET', '/employees');
  
  await testEndpoint('Get Departments', 'GET', '/departments');
  await testEndpoint('Get Courses', 'GET', '/courses');
  
  // Test some modules that may or may not exist yet
  await testEndpoint('Get Library Books', 'GET', '/library/books');
  await testEndpoint('Get Hostels', 'GET', '/hostel/rooms');
  await testEndpoint('Get Scholarships', 'GET', '/scholarships');
  await testEndpoint('Get Fees', 'GET', '/fees/structure');
  
  // Placement Module Tests
  await testEndpoint('Placement Dashboard Stats', 'GET', '/placement/dashboard-stats');
  await testEndpoint('Placement Companies', 'GET', '/placement/companies');
  await testEndpoint('Placement Jobs', 'GET', '/placement/jobs');
  await testEndpoint('Placement Applications', 'GET', '/placement/applications');
  
  console.log('\n--- VERIFICATION REPORT ---');
  console.log(report.join('\n'));
}

runTests();
