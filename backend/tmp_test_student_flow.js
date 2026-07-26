const axios = require('axios');

const API_BASE = process.env.TEST_API_BASE || 'http://127.0.0.1:5001/api';
const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

(async () => {
  try {
    console.log('Starting test against', API_BASE);

    // 1) Register a new student
    const unique = Date.now();
    const email = `teststudent_${unique}@example.com`;
    const username = `teststudent_${unique}`;
    const password = 'testpass123';

    console.log('Registering student:', email);
    const register = await api.post('/auth/register', {
      username,
      email,
      password,
      role: 'student',
      monthly_budget: 100
    });
    console.log('Register response status:', register.status);

    const token = register.data?.data?.token;
    if (!token) {
      console.error('No token returned from register');
      console.error(register.data);
      return;
    }

    console.log('Using token for authenticated requests');
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2) Call summary
    try {
      const summary = await api.get('/student/summary', { headers: authHeaders });
      console.log('/student/summary ->', JSON.stringify(summary.data));
    } catch (e) {
      console.error('/student/summary error:', e.response?.data || e.message);
    }

    // 3) Call expenses
    try {
      const expenses = await api.get('/student/expenses', { headers: authHeaders });
      console.log('/student/expenses ->', JSON.stringify(expenses.data));
    } catch (e) {
      console.error('/student/expenses error:', e.response?.data || e.message);
    }

    // 4) Call insights
    try {
      const insights = await api.get('/student/insights', { headers: authHeaders });
      console.log('/student/insights ->', JSON.stringify(insights.data));
    } catch (e) {
      console.error('/student/insights error:', e.response?.data || e.message);
    }

  } catch (err) {
    console.error('Test script error:', err.response?.data || err.message || err);
  }
})();
