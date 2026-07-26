import React, { useState } from 'react';

export default function AddExpenseForm({ onAdd, loading = false }) {
  const [form, setForm] = useState({ category: '', amount: '', note: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    
    if (!form.category.trim()) newErrors.category = 'Category is required';
    if (!form.amount || parseFloat(form.amount) <= 0) newErrors.amount = 'Valid amount is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    if (onAdd) onAdd(form);
    setForm({ category: '', amount: '', note: '' });
    setErrors({});
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4 text-slate-800">Add New Expense</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 mb-1">Category *</label>
            <select 
              name="category" 
              value={form.category} 
              onChange={handleChange}
              className={`form-input ${errors.category ? 'border-red-500 focus:ring-red-600' : ''}`}
            >
              <option value="">Select category</option>
              <option value="Food">Food</option>
              <option value="Transport">Transport</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Utilities">Utilities</option>
              <option value="Education">Education</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Shopping">Shopping</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && <span className="text-xs text-red-500 mt-1">{errors.category}</span>}
          </div>

          {/* Amount */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 mb-1">Amount *</label>
            <input 
              type="number" 
              name="amount" 
              placeholder="0.00" 
              value={form.amount} 
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`form-input ${errors.amount ? 'border-red-500 focus:ring-red-600' : ''}`}
            />
            {errors.amount && <span className="text-xs text-red-500 mt-1">{errors.amount}</span>}
          </div>

          {/* Note */}
          <div className="flex flex-col md:col-span-2 lg:col-span-1">
            <label className="text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
            <input 
              type="text"
              name="note" 
              placeholder="Add a note..." 
              value={form.note} 
              onChange={handleChange}
              className="form-input"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-end">
            <button 
              type="submit" 
              className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}