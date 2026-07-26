import React from 'react';

export default function CustomerList({
  customers = [],
  searchTerm = '',
  filterStatus = 'all',
  selectedCustomer = null,
  onSelectCustomer = () => {},
  onShowReminderModal = () => {},
  onShare = () => {},
  onExport = () => {},
  onShowAddCustomerModal = () => {},
  onEdit = () => {},
  onDelete = () => {},
  formatCurrency = (v) => v,
  hasMore = false,
  loadingMore = false,
  onLoadMore = () => {}
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Customers</h2>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
            onClick={onShowAddCustomerModal}
          >
            + New
          </button>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="py-10 text-center text-gray-500">No customers found.</div>
      ) : (
        <ul className="space-y-3">
          {customers.map((c) => (
            <li
              key={c.id}
              className={`flex items-center justify-between p-3 rounded border ${selectedCustomer?.id === c.id ? 'border-purple-500 bg-purple-50' : 'border-gray-100 dark:border-gray-700'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-700">{(c.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-100">{c.name}</div>
                  <div className="text-sm text-gray-500">{c.phone || '-'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                  <div className="text-sm text-gray-500">Balance</div>
                  <div className={`font-semibold ${parseFloat(c.current_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(c.current_balance || 0)}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                    onClick={() => onSelectCustomer(c)}
                  >
                    View
                  </button>
                  <button
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    onClick={() => onEdit(c)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 text-sm"
                    onClick={() => onShowReminderModal(c)}
                  >
                    Reminder
                  </button>
                  <button
                    className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
                    onClick={() => onShare(c)}
                  >
                    Share
                  </button>
                  <button
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 text-sm"
                    onClick={() => onExport(c)}
                  >
                    Export
                  </button>
                  <button
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                    onClick={() => onDelete(c)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            disabled={loadingMore}
            onClick={onLoadMore}
            className="px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}