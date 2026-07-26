const axios = require('axios');

async function test() {
  try {
    console.log('Testing business login response format...\n');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      identifier: 'testbiz_bot_12345',
      password: 'bizpass1234'
    });
    
    console.log('Full Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n\nData structure:');
    console.log('response.data.success:', response.data.success);
    console.log('response.data.data keys:', Object.keys(response.data.data || {}));
    console.log('response.data.data.user keys:', Object.keys(response.data.data?.user || {}));
    console.log('response.data.data.user.role:', response.data.data?.user?.role);
    console.log('response.data.data.token exists:', !!response.data.data?.token);
    console.log('response.data.data.refreshToken exists:', !!response.data.data?.refreshToken);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

test();
