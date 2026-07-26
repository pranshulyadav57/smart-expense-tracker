// Integration tests for customer avatar endpoints (skipped until supertest is available)
// This file is intentionally named *.test.skip.js to avoid Jest picking it up.

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

// Supertest-based integration tests can be enabled once `supertest` is installed.
