const axios = require('axios');

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

async function testBusinessLoginFlow() {
  try {
    console.log('=== BUSINESS LOGIN FLOW TEST ===\n');
    
    // 1. Register a new business user
    const businessEmail = `testbiz_${Date.now()}@example.com`;
    const businessUsername = `testbiz_${Date.now()}`;
    
    console.log('1. Registering new business user...');
    const registerRes = await API.post('/auth/register', {
      username: businessUsername,
      email: businessEmail,
      password: 'testpass123',
      role: 'business',
      business_name: 'Test Business',
      phone: '1234567890'
    });
    
    console.log('   ✅ Registration successful');
    console.log('   Returned user role:', registerRes.data?.data?.user?.role);
    console.log('   Returned business_name:', registerRes.data?.data?.user?.business_name);
    
    const registeredToken = registerRes.data?.data?.token;
    
    // 2. Test the /auth/profile endpoint
    console.log('\n2. Testing /auth/profile endpoint with token...');
    const profileRes = await API.get('/auth/profile', {
      headers: {
        'Authorization': `Bearer ${registeredToken}`
      }
    });
    
    console.log('   ✅ Profile fetch successful');
    console.log('   User role from profile:', profileRes.data?.data?.user?.role);
    console.log('   Business name from profile:', profileRes.data?.data?.user?.business_name);
    
    // 3. Logout and test fresh login
    console.log('\n3. Testing fresh login with credentials...');
    const loginRes = await API.post('/auth/login', {
      identifier: businessEmail,
      password: 'testpass123'
    });
    
    console.log('   ✅ Login successful');
    console.log('   User role from login:', loginRes.data?.data?.user?.role);
    console.log('   Business name from login:', loginRes.data?.data?.user?.business_name);
    console.log('   Token present:', !!loginRes.data?.data?.token);
    console.log('   RefreshToken present:', !!loginRes.data?.data?.refreshToken);
    
    // 4. Test accessing business routes with the token
    console.log('\n4. Testing business routes access...');
    const statsRes = await API.get('/business/customers/stats', {
      headers: {
        'Authorization': `Bearer ${loginRes.data?.data?.token}`
      }
    });
    
    console.log('   ✅ Business route accessible');
    console.log('   Response:', JSON.stringify(statsRes.data, null, 2).substring(0, 200) + '...');
    
    console.log('\n✅ ALL TESTS PASSED - Business login flow is working correctly!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testBusinessLoginFlow();
