import React from 'react';
import SkeletonLoader from '../../components/ui/SkeletonLoader';

export default function ExpenseList({ expenses = [], onUpdate, onDelete, loading = false }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader className="h-16 rounded-md" />
        <SkeletonLoader className="h-16 rounded-md" />
        <SkeletonLoader className="h-16 rounded-md" />
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    return <div className="p-4 bg-white rounded-lg shadow">No expenses yet.</div>;
  }

  return (
    <div className="space-y-4">
      {expenses.map((e) => (
        <div key={e.id} className="p-4 bg-white rounded-lg shadow flex items-center justify-between">
          <div>
            <div className="font-semibold">{e.category}</div>
            <div className="text-sm text-slate-500">{e.note || '—'}</div>
          </div>

          <div className="text-right">
            <div className="text-lg font-semibold">${parseFloat(e.amount || 0).toFixed(2)}</div>
            <div className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString()}</div>
            <div className="mt-2 flex gap-2 justify-end">
              {onUpdate && (
                <button className="px-2 py-1 text-sm bg-yellow-200 rounded" onClick={() => onUpdate(e.id, e)}>
                  Edit
                </button>
              )}
              {onDelete && (
                <button className="px-2 py-1 text-sm bg-red-200 rounded" onClick={() => onDelete(e.id)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}