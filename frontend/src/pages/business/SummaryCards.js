import React from 'react';

export default function SummaryCards({ stats = {}, formatCurrency = (v) => v, safeNumber = (v) => Number(v || 0) }) {
  const totalCustomers = safeNumber(stats?.total_customers);
  const totalOutstanding = safeNumber(stats?.total_outstanding);
  const monthlyRevenue = safeNumber(stats?.monthly_revenue);
  const totalTransactions = safeNumber(stats?.total_transactions);

  const card = (title, value, subtitle) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
      {subtitle && <div className="mt-1 text-sm text-gray-500">{subtitle}</div>}
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {card('Total Customers', totalCustomers, '')}
      {card('Total Outstanding', formatCurrency(totalOutstanding), 'Pending balances from customers')}
      {card('Monthly Revenue', formatCurrency(monthlyRevenue), 'This month')}
      {card('Total Transactions', totalTransactions, '')}
    </div>
  );
}