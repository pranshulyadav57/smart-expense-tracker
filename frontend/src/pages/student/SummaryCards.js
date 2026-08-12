import React from 'react';
import { formatCurrency, getPreferredCurrency } from '../../utils/formatCurrency';

export default function SummaryCards({ summary = {} }) {
  const { todaySpent = 0, monthSpent = 0, budget = 0, remaining = 0, percentUsed = 0 } = summary || {};
  const currency = getPreferredCurrency();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="text-sm text-slate-500 dark:text-slate-400">Today's Spend</div>
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(Number(todaySpent || 0), currency)}</div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="text-sm text-slate-500 dark:text-slate-400">This Month</div>
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(Number(monthSpent || 0), currency)}</div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="text-sm text-slate-500 dark:text-slate-400">Budget</div>
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(Number(budget || 0), currency)}</div>
        <div className="text-xs text-slate-400 dark:text-slate-500">{Math.round(percentUsed || 0)}% used — {formatCurrency(Number(remaining || 0), currency)} left</div>
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className={`h-3 ${percentUsed >= 100 ? 'bg-red-500' : percentUsed >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, Math.round(percentUsed || 0))}%` }} />
          </div>
          {percentUsed >= 100 ? (
            <div className="text-xs text-red-600 mt-2">Budget exceeded — consider reducing expenses.</div>
          ) : percentUsed >= 80 ? (
            <div className="text-xs text-yellow-700 mt-2">Approaching budget limit — monitor spending.</div>
          ) : (
            <div className="text-xs text-slate-500 mt-2">On track — good job managing your budget.</div>
          )}
        </div>
      </div>
    </div>
  );
}