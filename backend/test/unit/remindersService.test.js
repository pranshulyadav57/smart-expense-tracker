const dbHelpers = require('../../utils/dbHelpers');
const reportsService = require('../../services/reportsService');

jest.mock('../../utils/dbHelpers');

describe('reportsService.createReminder', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('creates reminder record when customer has balance and returns message', async () => {
    dbHelpers.safeQuery.mockResolvedValueOnce([{ id: 1, balance: 100 }]); // fetch customer balance
    dbHelpers.safeQuery.mockResolvedValueOnce([{ insertId: 10 }]); // insert reminder

    const result = await reportsService.createReminder(1, '1', null);

    expect(result).toHaveProperty('message');
    expect(dbHelpers.safeQuery).toHaveBeenCalled();
  });

  test('throws when customer has no balance', async () => {
    dbHelpers.safeQuery.mockResolvedValueOnce([{ id: 1, balance: 0 }]);

    await expect(reportsService.createReminder(1, '1', 'Hi')).rejects.toThrow();
  });
});
