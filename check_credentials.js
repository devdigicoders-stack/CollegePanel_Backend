/**
 * Verification Script: Check Employee Credentials
 * 
 * This script verifies that all employees have credentials
 * 
 * Usage: node check_credentials.js
 */

const mongoose = require('mongoose');
const Employee = require('./models/Employee');
require('dotenv').config();

const checkCredentials = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all employees
    const allEmployees = await Employee.find({}).select('name empId username password collegeId');
    
    console.log(`📊 Total Employees: ${allEmployees.length}\n`);
    console.log('='.repeat(80));
    console.log('EMPLOYEE CREDENTIALS STATUS');
    console.log('='.repeat(80));

    allEmployees.forEach((emp, index) => {
      console.log(`\n${index + 1}. ${emp.name} (${emp.empId})`);
      console.log(`   Username: ${emp.username || '❌ MISSING'}`);
      console.log(`   Password: ${emp.password || '❌ MISSING'}`);
    });

    // Count employees with credentials
    const withCredentials = allEmployees.filter(emp => emp.username && emp.password);
    const withoutCredentials = allEmployees.filter(emp => !emp.username || !emp.password);

    console.log('\n' + '='.repeat(80));
    console.log('📋 SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Employees WITH credentials: ${withCredentials.length}`);
    console.log(`❌ Employees WITHOUT credentials: ${withoutCredentials.length}`);
    console.log('='.repeat(80) + '\n');

    await mongoose.disconnect();
    console.log('✅ Verification completed');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
};

// Run check
checkCredentials();
