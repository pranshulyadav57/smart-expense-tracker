import React, { useState, useEffect } from 'react';

export default function ExpenseControls({ filters = {}, onChange }) {
  const [local, setLocal] = useState({ ...filters });

  useEffect(() => setLocal({ ...filters }), [filters]);

  const apply = () => {
    const next = { ...local, page: Number(local.page) || 1, limit: Number(local.limit) || 10 };
    onChange && onChange(next);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input name="search" placeholder="Search notes or category" value={local.search || ''} onChange={(e) => setLocal({ ...local, search: e.target.value })} className="form-input" />
        <input name="category" placeholder="Category (optional)" value={local.category || ''} onChange={(e) => setLocal({ ...local, category: e.target.value })} className="form-input" />
        <select name="sortBy" value={local.sortBy} onChange={(e) => setLocal({ ...local, sortBy: e.target.value })} className="form-input">
          <option value="created_at">Newest</option>
          <option value="amount">Amount</option>
          <option value="category">Category</option>
        </select>
        <select name="sortOrder" value={local.sortOrder} onChange={(e) => setLocal({ ...local, sortOrder: e.target.value })} className="form-input">
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>

      <div className="mt-3 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Per page</label>
          <input type="number" min={1} max={100} value={local.limit} onChange={(e) => setLocal({ ...local, limit: e.target.value })} className="w-20 form-input" />
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-gray-100 rounded" onClick={() => { setLocal((s) => ({ ...s, page: Math.max(1, (Number(s.page || 1) - 1)) })); }}>
            Prev
          </button>
          <input type="number" min={1} value={local.page || 1} onChange={(e) => setLocal({ ...local, page: e.target.value })} className="w-20 form-input" />
          <button className="px-3 py-1 bg-gray-100 rounded" onClick={() => { setLocal((s) => ({ ...s, page: (Number(s.page || 1) + 1) })); }}>
            Next
          </button>
        </div>

        <div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={apply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
