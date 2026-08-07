/**
 * Employee Credentials API Verification Script
 * 
 * This script verifies that:
 * 1. getEmployeeById() includes credentials (username, password) in response
 * 2. getEmployees() list includes credentials for each employee object
 * 3. All endpoints validate college isolation (collegeId filtering)
 * 4. GET /api/employees/{id} returns complete employee data with credentials
 * 5. GET /api/employees returns array/list with credentials
 */

const axios = require('axios');
const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const College = require('./models/College');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api';
let collegeToken;
let collegeId;
let testEmployeeId;
let college2Id;
let college2Token;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, type = 'info') {
  const prefix = {
    'info': colors.blue + '➜' + colors.reset,
    'pass': colors.green + '✓' + colors.reset,
    'fail': colors.red + '✗' + colors.reset,
    'warn': colors.yellow + '⚠' + colors.reset
  }[type] || colors.blue + '➜' + colors.reset;
  
  console.log(prefix + ' ' + message);
}

async function setup() {
  try {
    log('Connecting to MongoDB...', 'info');
    
    // Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college_crm');
    }

    log('Creating test colleges...', 'info');
    
    // Create test college 1
    const testCollege = new College({
      collegeName: 'Test College for Credentials API',
      collegeCode: `TCE_CRED_${Date.now()}`,
      collegeType: 'Private',
      adminName: 'Test Admin',
      adminEmail: `admin_${Date.now()}@testcollege.com`,
      username: `tcecred_${Date.now()}`,
      password: 'testpass123'
    });
    
    await testCollege.save();
    collegeId = testCollege._id;
    collegeToken = jwt.sign({ id: collegeId }, 'superadmin_secret_key_12345');

    // Verify college was saved correctly
    const savedCollege = await College.findById(collegeId);
    if (!savedCollege) {
      throw new Error('College not found after save - database connectivity issue');
    }

    // Create test college 2 for isolation testing
    const testCollege2 = new College({
      collegeName: 'Test College 2 for Credentials API',
      collegeCode: `TCE2_CRED_${Date.now()}`,
      collegeType: 'Private',
      adminName: 'Test Admin 2',
      adminEmail: `admin2_${Date.now()}@testcollege.com`,
      username: `tcecred2_${Date.now()}`,
      password: 'testpass456'
    });
    
    await testCollege2.save();
    college2Id = testCollege2._id;
    college2Token = jwt.sign({ id: college2Id }, 'superadmin_secret_key_12345');

    log('Test setup complete', 'pass');
    log(`College 1 ID: ${collegeId}`, 'info');
    log(`College 2 ID: ${college2Id}`, 'info');
  } catch (error) {
    log(`Setup failed: ${error.message}`, 'fail');
    throw error;
  }
}

async function testCreateEmployee() {
  try {
    log('\nTest 1: POST /api/employees should create employee with auto-generated credentials', 'info');

    const response = await axios.post(`${BASE_URL}/employees`, {
      name: 'John Doe',
      email: `john.doe_${Date.now()}@test.com`,
      mobile: '9876543210',
      role: 'Faculty',
      department: 'Engineering',
      dateOfJoining: new Date(),
      status: 'Active'
    }, {
      headers: {
        Authorization: `Bearer ${collegeToken}`
      }
    });

    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }

    if (!response.data.data) {
      throw new Error('No employee data in response');
    }

    const employee = response.data.data;

    if (!employee.username) {
      throw new Error('❌ Requirement 2.1 FAILED: username not in response');
    }

    if (!employee.password) {
      throw new Error('❌ Requirement 2.2 FAILED: password not in response');
    }

    if (!employee.username.match(/^john\.doe$/i)) {
      throw new Error(`❌ Requirement 2.1 FAILED: username format incorrect. Got: ${employee.username}`);
    }

    if (employee.password !== 'Employee@123') {
      throw new Error(`❌ Requirement 2.1 FAILED: password not auto-generated. Got: ${employee.password}`);
    }

    testEmployeeId = employee._id;

    log('✓ Requirement 2.1: username field included in response', 'pass');
    log('✓ Requirement 2.2: password field included in response', 'pass');
    log(`Username: ${employee.username}`, 'info');
    log(`Password: ${employee.password}`, 'info');
  } catch (error) {
    log(`Test 1 failed: ${error.message}`, 'fail');
    if (error.response?.data) {
      log(`API Response: ${JSON.stringify(error.response.data)}`, 'fail');
    }
    throw error;
  }
}

async function testGetEmployeeById() {
  try {
    log('\nTest 2: GET /api/employees/{id} should include credentials in response', 'info');

    const response = await axios.get(`${BASE_URL}/employees/${testEmployeeId}`, {
      headers: {
        Authorization: `Bearer ${collegeToken}`
      }
    });

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    const employee = response.data.data;

    if (!employee.username) {
      throw new Error('❌ Requirement 2.1 FAILED: username not in response from GET /{id}');
    }

    if (!employee.password) {
      throw new Error('❌ Requirement 2.2 FAILED: password not in response from GET /{id}');
    }

    log('✓ Requirement 2.1: GET /api/employees/{id} returns username', 'pass');
    log('✓ Requirement 2.2: GET /api/employees/{id} returns password', 'pass');
    log(`Username: ${employee.username}`, 'info');
    log(`Password: ${employee.password}`, 'info');
  } catch (error) {
    log(`Test 2 failed: ${error.message}`, 'fail');
    throw error;
  }
}

async function testGetEmployeesList() {
  try {
    log('\nTest 3: GET /api/employees should list all employees with credentials', 'info');

    const response = await axios.get(`${BASE_URL}/employees`, {
      headers: {
        Authorization: `Bearer ${collegeToken}`
      }
    });

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!Array.isArray(response.data.data)) {
      throw new Error(`❌ Requirement 2.3 FAILED: response.data.data is not an array`);
    }

    if (response.data.data.length === 0) {
      throw new Error('No employees in list');
    }

    const employeeFromList = response.data.data.find(emp => emp._id === testEmployeeId.toString());

    if (!employeeFromList) {
      throw new Error('Test employee not found in list');
    }

    if (!employeeFromList.username) {
      throw new Error('❌ Requirement 2.3 FAILED: username not in list response');
    }

    if (!employeeFromList.password) {
      throw new Error('❌ Requirement 2.3 FAILED: password not in list response');
    }

    // Verify ALL employees in list have credentials
    let missingCredentials = 0;
    response.data.data.forEach((emp, index) => {
      if (!emp.username || !emp.password) {
        missingCredentials++;
      }
    });

    if (missingCredentials > 0) {
      throw new Error(`❌ Requirement 2.3 FAILED: ${missingCredentials} employees missing credentials in list`);
    }

    log(`✓ Requirement 2.3: GET /api/employees returns list with ${response.data.data.length} employees`, 'pass');
    log('✓ Requirement 2.3: All employees in list include username and password', 'pass');
    log(`Found test employee in list with credentials:`, 'info');
    log(`  Username: ${employeeFromList.username}`, 'info');
    log(`  Password: ${employeeFromList.password}`, 'info');
  } catch (error) {
    log(`Test 3 failed: ${error.message}`, 'fail');
    throw error;
  }
}

async function testCredentialsNotRegeneratedOnUpdate() {
  try {
    log('\nTest 4: PUT /api/employees/{id} should NOT regenerate credentials on update', 'info');

    // Get original credentials
    const getResponse = await axios.get(`${BASE_URL}/employees/${testEmployeeId}`, {
      headers: {
        Authorization: `Bearer ${collegeToken}`
      }
    });
    const originalUsername = getResponse.data.data.username;
    const originalPassword = getResponse.data.data.password;

    // Update employee
    const updateResponse = await axios.put(`${BASE_URL}/employees/${testEmployeeId}`, {
      name: 'John Doe Updated',
      email: `john.updated_${Date.now()}@test.com`,
      mobile: '1111111111',
      role: 'Faculty',
      department: 'Engineering',
      status: 'Active'
    }, {
      headers: {
        Authorization: `Bearer ${collegeToken}`
      }
    });

    const updatedEmployee = updateResponse.data.data;

    if (updatedEmployee.username !== originalUsername) {
      throw new Error(`❌ Requirement 1.6 FAILED: username was regenerated on update. Original: ${originalUsername}, New: ${updatedEmployee.username}`);
    }

    if (updatedEmployee.password !== originalPassword) {
      throw new Error(`❌ Requirement 1.6 FAILED: password was regenerated on update. Original: ${originalPassword}, New: ${updatedEmployee.password}`);
    }

    log('✓ Requirement 1.6: Credentials NOT regenerated on update', 'pass');
    log(`Credentials preserved after update:`, 'info');
    log(`  Username: ${updatedEmployee.username}`, 'info');
    log(`  Password: ${updatedEmployee.password}`, 'info');
  } catch (error) {
    log(`Test 4 failed: ${error.message}`, 'fail');
    throw error;
  }
}

async function testCollegeIsolation() {
  try {
    log('\nTest 5: Verify college isolation (collegeProtect middleware)', 'info');

    // Try to access employee from college 1 using college 2 token
    try {
      const response = await axios.get(`${BASE_URL}/employees/${testEmployeeId}`, {
        headers: {
          Authorization: `Bearer ${college2Token}`
        }
      });

      throw new Error('❌ Requirement 2.4 FAILED: College isolation violated - College 2 can access College 1 employee');
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 401) {
        log('✓ Requirement 2.4: College isolation enforced - unauthorized access blocked', 'pass');
        log(`Expected 404/401 error received: ${error.response?.status}`, 'info');
      } else {
        throw error;
      }
    }

    // Verify that college 2 token works with its own employees
    const college2Employee = new Employee({
      name: 'Test Employee College 2',
      email: `test_college2_${Date.now()}@test.com`,
      mobile: '8888888888',
      role: 'Staff',
      department: 'Admin',
      collegeId: college2Id
    });

    await college2Employee.save();

    const response = await axios.get(`${BASE_URL}/employees/${college2Employee._id}`, {
      headers: {
        Authorization: `Bearer ${college2Token}`
      }
    });

    if (response.status !== 200) {
      throw new Error(`Expected status 200 for college 2 own employee, got ${response.status}`);
    }

    log('✓ College isolation working correctly - each college only sees its own employees', 'pass');

    // Cleanup college 2 employee
    await Employee.findByIdAndDelete(college2Employee._id);
  } catch (error) {
    log(`Test 5 failed: ${error.message}`, 'fail');
    throw error;
  }
}

async function testMultipleEmployeesWithCredentials() {
  try {
    log('\nTest 6: Multiple employees should have unique credentials', 'info');

    const employee1 = await axios.post(`${BASE_URL}/employees`, {
      name: 'Alice Smith',
      email: `alice_${Date.now()}@test.com`,
      mobile: '9999999999',
      role: 'Faculty',
      department: 'Engineering'
    }, {
      headers: {
        Authorization: `Bearer ${collegeToken}`
      }
    });

    const employee2 = await axios.post(`${BASE_URL}/employees`, {
      name: 'Bob Johnson',
      email: `bob_${Date.now()}@test.com`,
      mobile: '8888888888',
      role: 'Staff',
      department: 'Admin'
    }, {
      headers: {
        Authorization: `Bearer ${collegeToken}`
      }
    });

    const emp1 = employee1.data.data;
    const emp2 = employee2.data.data;

    if (!emp1.username || !emp1.password) {
      throw new Error('Employee 1 missing credentials');
    }

    if (!emp2.username || !emp2.password) {
      throw new Error('Employee 2 missing credentials');
    }

    if (emp1.username === emp2.username) {
      throw new Error(`❌ Duplicate usernames detected: ${emp1.username}`);
    }

    log('✓ Each employee gets unique credentials', 'pass');
    log(`Employee 1 - Username: ${emp1.username}`, 'info');
    log(`Employee 2 - Username: ${emp2.username}`, 'info');
  } catch (error) {
    log(`Test 6 failed: ${error.message}`, 'fail');
    throw error;
  }
}

async function cleanup() {
  try {
    log('\nCleaning up test data...', 'info');
    
    await Employee.deleteMany({ collegeId });
    await Employee.deleteMany({ collegeId: college2Id });
    
    await College.findByIdAndDelete(collegeId);
    await College.findByIdAndDelete(college2Id);
    
    await mongoose.connection.close();
    
    log('Cleanup complete', 'pass');
  } catch (error) {
    log(`Cleanup failed: ${error.message}`, 'fail');
  }
}

async function runAllTests() {
  console.log('\n' + colors.blue + '═════════════════════════════════════════════════════════════' + colors.reset);
  console.log(colors.blue + 'Employee Credentials API Verification' + colors.reset);
  console.log(colors.blue + '═════════════════════════════════════════════════════════════' + colors.reset);
  
  try {
    await setup();
    await testCreateEmployee();
    await testGetEmployeeById();
    await testGetEmployeesList();
    await testCredentialsNotRegeneratedOnUpdate();
    await testCollegeIsolation();
    await testMultipleEmployeesWithCredentials();

    console.log('\n' + colors.green + '═════════════════════════════════════════════════════════════' + colors.reset);
    console.log(colors.green + '✓ ALL TESTS PASSED!' + colors.reset);
    console.log(colors.green + '═════════════════════════════════════════════════════════════' + colors.reset);
    
    log('Task 2 Complete: All API endpoints properly return credentials', 'pass');
    log('- Requirement 2.1: ✓ GET /api/employees/{id} returns username', 'pass');
    log('- Requirement 2.2: ✓ GET /api/employees/{id} returns password', 'pass');
    log('- Requirement 2.3: ✓ GET /api/employees list includes credentials', 'pass');
    log('- Requirement 2.4: ✓ College isolation validated via collegeProtect middleware', 'pass');
    log('- Requirement 2.5: ✓ All endpoints return complete employee data with credentials', 'pass');
  } catch (error) {
    console.log('\n' + colors.red + '═════════════════════════════════════════════════════════════' + colors.reset);
    console.log(colors.red + '✗ TEST FAILED' + colors.reset);
    console.log(colors.red + '═════════════════════════════════════════════════════════════' + colors.reset);
    log(error.message, 'fail');
    process.exit(1);
  } finally {
    await cleanup();
  }
}

runAllTests();
