// Integration tests for customer avatar endpoints
// Mocks auth, role and validation middleware, plus service layer.

jest.mock('../../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { id: 1, role: 'business', username: 'test' };
    next();
  };
});

jest.mock('../../middleware/roleMiddleware', () => ({ requireBusinessRole: (req, res, next) => next() }));
jest.mock('../../middleware/validationMiddleware', () => ({ validateIdParam: (req, res, next) => next(), validateCustomer: (req, res, next) => next() }));

jest.mock('../../services/customerService', () => ({
  updateCustomerAvatar: jest.fn().mockResolvedValue({ id: 123, avatar: '/public/uploads/avatars/avatar-1-test.png' }),
  deleteCustomerAvatar: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const customerService = require('../../services/customerService');
const express = require('express');
const upload = require('../../middleware/uploadMiddleware');
const customerController = require('../../controllers/customerController');

let app;

beforeAll(() => {
  // Create minimal app mounting only the avatar endpoints to avoid loading full server routes
  app = express();
  const auth = require('../../middleware/authMiddleware');

  app.post('/api/business/customers/:id/avatar', auth, upload.single('avatar'), customerController.uploadAvatar);
  app.delete('/api/business/customers/:id/avatar', auth, customerController.deleteAvatar);
});

describe('Avatar endpoints', () => {
  test('POST /api/business/customers/:id/avatar uploads and calls service', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'small-image.png');
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, Buffer.from([0x89,0x50,0x4e,0x47]));
    }

    const res = await request(app)
      .post('/api/business/customers/123/avatar')
      .attach('avatar', filePath);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('avatar');

    expect(customerService.updateCustomerAvatar).toHaveBeenCalledWith(1, '123', expect.stringContaining('/public/uploads/avatars/'));
  });

  test('DELETE /api/business/customers/:id/avatar deletes avatar via service', async () => {
    const res = await request(app)
      .delete('/api/business/customers/123/avatar');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(customerService.deleteCustomerAvatar).toHaveBeenCalledWith(1, '123');
  });
});
