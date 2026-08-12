import React, { useEffect, useState } from 'react';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import { useApi } from '../../hooks/useApi';
import API from '../../services/api';

export default function BudgetPanel({ summary, onBudgetUpdated }) {
  const { loading, error, execute } = useApi();
  const [budget, setBudget] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // load current budget
    let cancelled = false;
    (async () => {
      try {
        const res = await execute(() => API.get('/student/budget'));
        if (!cancelled) {
          const current = res.data?.data?.monthly_limit ?? res.data?.data?.monthly_limit ?? 0;
          setBudget(String(current || 0));
        }
      } catch (err) {
        // silent
      }
      finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => { cancelled = true };
  }, [execute]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await execute(() => API.post('/student/budget', { monthly_limit: parseFloat(budget) }));
      onBudgetUpdated && onBudgetUpdated();
    } catch (err) {
      // handled by useApi
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow mt-4">
      <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Monthly Budget</h3>
      {initialLoading ? (
        <div>
          <div className="mb-2"><SkeletonLoader className="h-10 w-48 rounded-md" /></div>
          <SkeletonLoader className="h-8 w-28 rounded-md" />
        </div>
      ) : (
        <>
          <form onSubmit={handleSave} className="flex gap-3 items-center">
            <input className="form-input w-48" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Monthly limit" />
            <button className="px-3 py-1 bg-blue-600 text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Save Budget'}</button>
          </form>
          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
          {summary?.budget !== undefined && (
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">Current month spent ₹{summary.monthSpent?.toFixed(2)} of ₹{summary.budget?.toFixed(2)}</div>
          )}
        </>
      )}
    </div>
  );
}
