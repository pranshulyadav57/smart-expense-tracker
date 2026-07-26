import React from 'react';

export default function CustomerLedger({
  customer,
  transactions = [],
  onShowTransactionModal = () => {},
  onEditTransaction = () => {},
  onDeleteTransaction = () => {},
  formatDate = (d) => d,
  formatCurrency = (v) => v,
  hasMoreTransactions = false,
  transactionLoading = false,
  onLoadMoreTransactions = () => {}
}) {
  if (!customer) return <div className="bg-white p-4 rounded">Select a customer to see their ledger.</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 w-full">
      <div className="mb-4">
        <div className="text-sm text-gray-500">Selected</div>
        <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{customer.name}</div>
        <div className="text-sm text-gray-500">Balance: <span className={`font-medium ${parseFloat(customer.current_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(customer.current_balance || 0)}</span></div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-semibold text-gray-700 dark:text-gray-100">Transactions</h4>
        <button className="px-3 py-1 bg-purple-600 text-white rounded" onClick={() => onShowTransactionModal()}>➕ Add</button>
      </div>

      {transactions.length === 0 ? (
        <div className="py-6 text-center text-gray-500">No transactions yet.</div>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-auto">
          {transactions.map(t => (
            <li key={t.id} className="p-3 rounded border border-gray-100 dark:border-gray-700 flex justify-between items-start">
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-100">{t.type === 'credit' ? 'Credit' : 'Debit'} • {formatCurrency(t.amount)}</div>
                <div className="text-xs text-gray-500">{t.note || '-'}</div>
                <div className="text-xs text-gray-400 mt-1">{formatDate(t.created_at)}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`text-sm font-semibold ${t.type === 'credit' ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(t.running_balance || 0)}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onEditTransaction(t)} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">Edit</button>
                  <button onClick={() => onDeleteTransaction(t)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMoreTransactions && (
        <div className="mt-4 text-center">
          <button disabled={transactionLoading} onClick={onLoadMoreTransactions} className="px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50">{transactionLoading ? 'Loading...' : 'Load more'}</button>
        </div>
      )}
    </div>
  );
}