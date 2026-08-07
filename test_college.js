const axios = require('axios');

async function testCreateCollege() {
  try {
    // 1. Login as SuperAdmin
    const loginRes = await axios.post('http://localhost:5000/api/superadmin/login', {
      email: 'super@gmail.com',
      password: 'super123'
    });
    const token = loginRes.data.token;
    console.log('Logged in successfully');

    // 2. Create College
    const collegeData = {
      collegeName: 'Test College of Engineering',
      collegeCode: 'TCE101',
      collegeType: 'private',
      adminName: 'College Admin',
      adminEmail: 'admin@tce101.com',
      username: 'tceadmin',
      password: 'password123'
    };

    const res = await axios.post('http://localhost:5000/api/colleges', collegeData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('College creation response:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.data);
    } else {
      console.error('Request Error:', err.message);
    }
  }
}

testCreateCollege();
