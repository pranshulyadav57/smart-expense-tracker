const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

jest.setTimeout(20000);

let app;

beforeAll(async () => {
  app = express();
  app.use(bodyParser.json());

  // Mount auth and student routes (full flow)
  const authRoutes = require('../../routes/authRoutes');
  const studentRoutes = require('../../routes/studentRoutes');

  app.use('/api/auth', authRoutes);
  app.use('/api/student', studentRoutes);

  // Cleanup any leftover test users from previous runs to avoid unique/index collisions
  try {
    const db = require('../../config/db');
    // remove users and cascade should clean profiles via FK ON DELETE CASCADE
    await db.execute("DELETE FROM users WHERE username LIKE 'student_test_%'");
    await db.execute("DELETE FROM users WHERE email LIKE 'student_test_%@example.com'");
  } catch (e) {
    // best-effort cleanup; log and continue
    // eslint-disable-next-line no-console
    console.warn('Test cleanup warning:', e.message || e);
  }
});

describe('Student authenticated integration flow', () => {
  let token;
  let refreshToken;
  const timestamp = Date.now();
  const username = `student_test_${timestamp}`;
  const email = `student_test_${timestamp}@example.com`;
  const password = 'TestPass123';

  test('register -> login -> create expense -> fetch summary & expenses', async () => {
    // Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ username, email, password, role: 'student', monthly_budget: 1000 });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    token = regRes.body.data.token;
    refreshToken = regRes.body.data.refreshToken;

    // Create expense
    const createRes = await request(app)
      .post('/api/student/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 25.5, category: 'Food', note: 'Test lunch' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);

    // Fetch expenses
    const expensesRes = await request(app)
      .get('/api/student/expenses')
      .set('Authorization', `Bearer ${token}`);

    expect(expensesRes.status).toBe(200);
    expect(expensesRes.body.success).toBe(true);
    expect(Array.isArray(expensesRes.body.data.expenses)).toBe(true);

    // Fetch summary
    const summaryRes = await request(app)
      .get('/api/student/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.success).toBe(true);
    expect(summaryRes.body.data).toHaveProperty('monthSpent');
  });
});
