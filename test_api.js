const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testApi() {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:5000/api/superadmin/login', {
      email: 'super@gmail.com',
      password: 'super123'
    });
    const token = loginRes.data.token;
    console.log('Logged in, got token');

    // 2. Update Profile
    const formData = new FormData();
    formData.append('name', 'Super Admin');
    
    const dummyPath = path.join(__dirname, 'dummy.png');
    if (!fs.existsSync(dummyPath)) {
      // Create a 1x1 transparent PNG
      const pngHex = "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082";
      fs.writeFileSync(dummyPath, Buffer.from(pngHex, 'hex'));
    }
    
    formData.append('profileImage', fs.createReadStream(dummyPath));

    const updateRes = await axios.put('http://localhost:5000/api/superadmin/profile', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    console.log('Update success:', updateRes.data);
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Request Error:', error.message);
    }
  }
}

testApi();
