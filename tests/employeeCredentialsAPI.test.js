const mongoose = require('mongoose');
const axios = require('axios');
const Employee = require('../models/Employee');
const College = require('../models/College');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api';
let collegeToken;
let collegeId;
let testEmployeeId;

// Setup: Create test data before running tests
beforeAll(async () => {
  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college_crm');
    }

    // Create a test college with all required fields
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

    // Create JWT token for college
    collegeToken = jwt.sign({ id: collegeId }, process.env.JWT_SECRET || 'secret123');

    console.log('\n✓ Test setup complete. College ID:', collegeId);
  } catch (error) {
    console.error('Setup error:', error);
    throw error;
  }
});

// Cleanup: Remove test data after running tests
afterAll(async () => {
  try {
    // Delete test employees
    await Employee.deleteMany({ collegeId });
    
    // Delete test college
    await College.findByIdAndDelete(collegeId);
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n✓ Cleanup complete');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
});

describe('Employee API - Credentials in Response', () => {
  
  // Test 1: Create an employee and verify credentials are auto-generated
  test('POST /api/employees should create employee with auto-generated credentials', async () => {
    try {
      const response = await axios.post(`${BASE_URL}/employees`, {
        name: 'John Doe',
        email: 'john.doe@test.com',
        mobile: '9876543210',
        role: 'Faculty',
        department: 'Engineering',
        dateOfJoining: new Date(),
        status: 'Active'
      }, {
        headers: {
          Authorization: `Bearer ${collegToken}`
        }
      });

      console.log('Create Employee Response:', JSON.stringify(response.data.data, null, 2));

      // Verify response includes credentials
      expect(response.status).toBe(201);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.username).toBeDefined();
      expect(response.data.data.password).toBeDefined();
      
      // Verify username format (firstname.lastname in lowercase)
      expect(response.data.data.username).toMatch(/^john\.doe$/i);
      
      // Verify password is auto-generated
      expect(response.data.data.password).toBe('Employee@123');
      
      // Store employee ID for subsequent tests
      testEmployeeId = response.data.data._id;
      
      console.log('✓ Employee created with credentials');
    } catch (error) {
      console.error('Create Employee Error:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test 2: GET /api/employees/{id} should return credentials
  test('GET /api/employees/{id} should include username and password in response', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/employees/${testEmployeeId}`, {
        headers: {
          Authorization: `Bearer ${collegToken}`
        }
      });

      console.log('Get Employee By ID Response:', JSON.stringify(response.data.data, null, 2));

      // Verify response structure
      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();
      expect(response.data.data._id).toBe(testEmployeeId);
      
      // VERIFY CREDENTIALS ARE INCLUDED
      expect(response.data.data.username).toBeDefined();
      expect(response.data.data.password).toBeDefined();
      expect(response.data.data.username).toMatch(/^john\.doe$/i);
      expect(response.data.data.password).toBe('Employee@123');
      
      console.log('✓ GET /api/employees/{id} returns credentials');
    } catch (error) {
      console.error('Get Employee By ID Error:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test 3: GET /api/employees should list all employees with credentials
  test('GET /api/employees should return list with credentials for each employee', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/employees`, {
        headers: {
          Authorization: `Bearer ${collegToken}`
        }
      });

      console.log('Get Employees List Response:', JSON.stringify({
        total: response.data.total,
        count: response.data.data.length,
        firstEmployee: response.data.data[0]
      }, null, 2));

      // Verify response structure
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      
      // VERIFY EACH EMPLOYEE IN LIST INCLUDES CREDENTIALS
      const employeeFromList = response.data.data.find(emp => emp._id === testEmployeeId);
      expect(employeeFromList).toBeDefined();
      expect(employeeFromList.username).toBeDefined();
      expect(employeeFromList.password).toBeDefined();
      expect(employeeFromList.username).toMatch(/^john\.doe$/i);
      expect(employeeFromList.password).toBe('Employee@123');
      
      console.log('✓ GET /api/employees returns list with credentials for all employees');
    } catch (error) {
      console.error('Get Employees List Error:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test 4: Create second employee to verify credentials are unique
  test('POST /api/employees should generate unique credentials for each employee', async () => {
    try {
      const response = await axios.post(`${BASE_URL}/employees`, {
        name: 'Jane Smith',
        email: 'jane.smith@test.com',
        mobile: '9876543211',
        role: 'Staff',
        department: 'Administration',
        dateOfJoining: new Date(),
        status: 'Active'
      }, {
        headers: {
          Authorization: `Bearer ${collegToken}`
        }
      });

      console.log('Second Employee Created:', JSON.stringify(response.data.data, null, 2));

      // Verify second employee has different credentials
      expect(response.data.data.username).toBeDefined();
      expect(response.data.data.username).toMatch(/^jane\.smith$/i);
      expect(response.data.data.username).not.toBe('john.doe');
      expect(response.data.data.password).toBe('Employee@123'); // Same password format
      
      console.log('✓ Each employee gets unique credentials');
    } catch (error) {
      console.error('Create Second Employee Error:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test 5: Verify credentials are NOT regenerated on update
  test('PUT /api/employees/{id} should NOT regenerate credentials on update', async () => {
    try {
      // First, get the original credentials
      const getResponse = await axios.get(`${BASE_URL}/employees/${testEmployeeId}`, {
        headers: {
          Authorization: `Bearer ${collegToken}`
        }
      });
      const originalUsername = getResponse.data.data.username;
      const originalPassword = getResponse.data.data.password;

      // Update the employee
      const updateResponse = await axios.put(`${BASE_URL}/employees/${testEmployeeId}`, {
        name: 'John Doe Updated',
        email: 'john.updated@test.com',
        mobile: '1111111111',
        role: 'Faculty',
        department: 'Engineering',
        status: 'Active'
      }, {
        headers: {
          Authorization: `Bearer ${collegToken}`
        }
      });

      console.log('Updated Employee:', JSON.stringify(updateResponse.data.data, null, 2));

      // Verify credentials are NOT changed
      expect(updateResponse.data.data.username).toBe(originalUsername);
      expect(updateResponse.data.data.password).toBe(originalPassword);
      
      console.log('✓ Credentials are preserved on employee update');
    } catch (error) {
      console.error('Update Employee Error:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test 6: Verify college isolation - credentials filtered by collegeId
  test('Credentials should respect college isolation (collegeProtect middleware)', async () => {
    try {
      // Create another college
      const testCollege2 = new College({
        collegeName: 'Test College 2 for Credentials',
        collegeCode: `TCE2_CRED_${Date.now()}`,
        collegeType: 'Private',
        adminName: 'Test Admin 2',
        adminEmail: `admin2_${Date.now()}@testcollege.com`,
        username: `tcecred2_${Date.now()}`,
        password: 'testpass456'
      });
      
      await testCollege2.save();
      const college2Id = testCollege2._id;
      const college2Token = jwt.sign({ id: college2Id }, process.env.JWT_SECRET || 'secret123');

      // Try to get employee from college 1 using college 2 token
      try {
        await axios.get(`${BASE_URL}/employees/${testEmployeeId}`, {
          headers: {
            Authorization: `Bearer ${college2Token}`
          }
        });
        
        // If we get here, college isolation is broken
        throw new Error('College isolation violated - College 2 can access College 1 employee');
      } catch (error) {
        // Expected: should get 404 or 401
        expect(error.response?.status).toMatch(/40[14]/);
        console.log('✓ College isolation properly enforced - unauthorized access blocked');
      }

      // Cleanup
      await College.findByIdAndDelete(college2Id);
    } catch (error) {
      console.error('College Isolation Test Error:', error.message);
      throw error;
    }
  });

  // Test 7: Verify all required fields are returned along with credentials
  test('GET /api/employees/{id} response should include all fields including credentials', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/employees/${testEmployeeId}`, {
        headers: {
          Authorization: `Bearer ${collegToken}`
        }
      });

      const employee = response.data.data;

      // Verify all fields are present
      const requiredFields = [
        'name', 'email', 'mobile', 'role', 'department', 
        'status', 'username', 'password', 'empId', 'collegeId'
      ];

      requiredFields.forEach(field => {
        expect(employee[field]).toBeDefined();
      });

      // Verify credentials specifically
      expect(employee.username).toMatch(/john\.doe/i);
      expect(employee.password).toBe('Employee@123');

      console.log('✓ All fields including credentials are returned');
    } catch (error) {
      console.error('Field Verification Error:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test 8: Verify list endpoint returns credentials with pagination
  test('GET /api/employees with pagination should include credentials in response', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/employees?page=1&limit=10`, {
        headers: {
          Authorization: `Bearer ${collegToken}`
        }
      });

      console.log('Paginated Response:', {
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        employeeCount: response.data.data.length
      });

      expect(response.status).toBe(200);
      expect(response.data.data.length).toBeGreaterThan(0);
      
      // Verify all employees in list have credentials
      response.data.data.forEach(employee => {
        expect(employee.username).toBeDefined();
        expect(employee.password).toBeDefined();
      });

      console.log('✓ All employees in paginated list include credentials');
    } catch (error) {
      console.error('Pagination Test Error:', error.response?.data || error.message);
      throw error;
    }
  });

});
