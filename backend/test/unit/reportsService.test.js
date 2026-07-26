jest.mock('../../utils/dbHelpers', () => ({ safeQuery: jest.fn(), getPaginated: jest.fn() }));
const dbHelpers = require('../../utils/dbHelpers');

// Require reportsService lazily inside tests after mocks are set up to avoid
// any timing issues with module initialization and mocked helpers.

describe('reportsService.createReminder', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('creates a reminder when customer has pending balance and no message provided', async () => {
    // Mock safeQuery for customer select
    dbHelpers.safeQuery = jest.fn()
      // first call: select customer
      .mockResolvedValueOnce([{ id: 42, name: 'Test Cust', phone: '9999999999', current_balance: 150 }])
      // second call: insert reminder -> return object with insertId
      .mockResolvedValueOnce({ insertId: 123 });

    // Require reportsService after mocking dbHelpers
    const reportsService = require('../../services/reportsService');

    const result = await reportsService.createReminder(1, 42, null, 'payment_due');

    expect(result).toHaveProperty('reminder_id');
    expect(result.reminder_id).toBe(123);
    expect(result.customer_name).toBe('Test Cust');
    expect(result.phone).toBe('9999999999');
    expect(result.current_balance).toBe(150);
    expect(result).toHaveProperty('message');
    expect(typeof result.message).toBe('string');
  });

  test('throws when customer has no pending balance', async () => {
    dbHelpers.safeQuery = jest.fn()
      .mockResolvedValueOnce([{ id: 43, name: 'Cleared Cust', phone: '8888888888', current_balance: 0 }]);

    const reportsService = require('../../services/reportsService');

    await expect(reportsService.createReminder(1, 43, null, 'payment_due')).rejects.toThrow();
  });
});
