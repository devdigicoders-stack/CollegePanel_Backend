/**
 * Migration Script: Add Credentials to Existing Employees
 * 
 * This script generates username and password for all existing employees
 * who don't have credentials yet.
 * 
 * Usage: node migrate_employee_credentials.js
 */

const mongoose = require('mongoose');
const Employee = require('./models/Employee');
require('dotenv').config();

// Helper function to generate unique random password
const generateUniquePassword = (name, empId) => {
  // Create a base from first name (capitalized)
  const firstName = name.split(' ')[0];
  const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  
  // Generate random 4-digit number
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  
  // Special characters for randomness
  const specialChars = ['@', '#', '$', '!'];
  const randomSpecialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Format: FirstName@RandomNumber or FirstName#RandomNumber
  return `${capitalizedFirstName}${randomSpecialChar}${randomNum}`;
};

const migrateEmployeeCredentials = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all employees (we'll regenerate passwords for all to make them unique)
    const allEmployees = await Employee.find({});

    console.log(`📊 Found ${allEmployees.length} employees. Generating unique credentials...\n`);

    if (allEmployees.length === 0) {
      console.log('ℹ️ No employees found in database!');
      await mongoose.disconnect();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const employee of allEmployees) {
      try {
        // Generate username from name (firstname.lastname in lowercase)
        const nameParts = employee.name.toLowerCase().trim().split(/\s+/);
        const username = nameParts.join('.');

        // Generate unique password
        const password = generateUniquePassword(employee.name, employee.empId);

        // Save without triggering the pre-save hook for isNew
        await Employee.updateOne(
          { _id: employee._id },
          {
            $set: {
              username: username,
              password: password
            }
          }
        );

        console.log(`✅ [${successCount + 1}] Updated: ${employee.name}`);
        console.log(`   EmpID: ${employee.empId}`);
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}\n`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error updating ${employee.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully updated: ${successCount} employees`);
    console.log(`❌ Failed: ${errorCount} employees`);
    console.log(`📊 Total processed: ${allEmployees.length} employees`);
    console.log('='.repeat(50) + '\n');

    await mongoose.disconnect();
    console.log('✅ Migration completed and database connection closed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
migrateEmployeeCredentials();
