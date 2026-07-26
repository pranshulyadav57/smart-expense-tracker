const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

async function run() {
  try {
    console.log('Logging in as business test user...');
    let bizIdentifier = 'testbiz_bot_12345';
    let bizPassword = 'bizpass1234';

    let loginResp;
    try {
      loginResp = await axios.post(`${API_BASE}/auth/login`, {
        identifier: bizIdentifier,
        password: bizPassword
      }, { timeout: 10000 });
    } catch (e) {
      // if login failed, try to register the business user
      console.log('Business login failed, attempting to register business user...');
      try {
        await axios.post(`${API_BASE}/auth/register`, {
          username: bizIdentifier,
          email: `${bizIdentifier}@example.com`,
          password: bizPassword,
          role: 'business',
          business_name: 'Test Business Inc',
          phone: '9998887777'
        }, { timeout: 10000 });

        // try login again
        loginResp = await axios.post(`${API_BASE}/auth/login`, {
          identifier: bizIdentifier,
          password: bizPassword
        }, { timeout: 10000 });
      } catch (regErr) {
        throw new Error('Failed to register/login business user: ' + (regErr.response?.data || regErr.message));
      }
    }

    const token = loginResp.data?.data?.token || loginResp.data?.token;
    if (!token) throw new Error('No token in login response');

    const headers = { Authorization: `Bearer ${token}` };

    console.log('Creating a test customer...');
    const addResp = await axios.post(`${API_BASE}/business/customers`, {
      name: 'API Test Customer',
      phone: '9999999999',
      note: 'Created by automated test'
    }, { headers, timeout: 10000 });

    console.log('Add customer response:', addResp.data);

    // Use non-paginated endpoints to avoid known pagination helper edge-case
    console.log('Fetching customer stats...');
    const statsResp = await axios.get(`${API_BASE}/business/customers/stats`, { headers, timeout: 10000 });
    console.log('Customer stats:', statsResp.data);

    console.log('Fetching dashboard summary...');
    const dashResp = await axios.get(`${API_BASE}/business/dashboard/summary`, { headers, timeout: 10000 });
    console.log('Dashboard summary:', dashResp.data);

    // Use the customer id returned from add response to fetch transactions
    const firstCustomerId = addResp.data?.data?.id || addResp.data?.id;
    if (firstCustomerId) {
      console.log('Fetching ledger for created customer', firstCustomerId);
      const ledgerResp = await axios.get(`${API_BASE}/business/customers/${firstCustomerId}/ledger`, { headers, timeout: 10000 });
      console.log('Ledger:', ledgerResp.data);
    } else {
      console.log('No customer id available from add response to fetch ledger.');
    }

    console.log('Test completed successfully.');
  } catch (err) {
    console.error('Test failed:', err.response?.data || err.message);
    process.exitCode = 2;
  }
}

run();
