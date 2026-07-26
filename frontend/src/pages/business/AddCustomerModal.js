import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function AddCustomerModal({ show, onClose, onAdd, initial = null, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setName(initial?.name || '');
      setPhone(initial?.phone || '');
      setNote(initial?.note || '');
      setLoading(false);
    }
  }, [show, initial?.name, initial?.phone, initial?.note]);

  if (!show) return null;

  const validate = () => {
    if (!name || !name.trim()) {
      toast.error('Customer name is required');
      return false;
    }
    if (phone && !/^\+?[0-9\s-]{6,20}$/.test(phone)) {
      toast.error('Invalid phone number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { name: name.trim(), phone: phone.trim() || null, note: note.trim() || null };
      if (initial && typeof onSave === 'function') {
        await onSave(initial.id, payload);
        toast.success('Customer updated');
      } else {
        await onAdd(payload);
        toast.success('Customer added');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add Customer</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 dark:text-gray-300">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 p-2 border rounded bg-white dark:bg-gray-700"
              placeholder="Customer name"
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm text-gray-600 dark:text-gray-300">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full mt-1 p-2 border rounded bg-white dark:bg-gray-700"
              placeholder="e.g. +91 98765 43210"
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm text-gray-600 dark:text-gray-300">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full mt-1 p-2 border rounded bg-white dark:bg-gray-700"
              placeholder="Optional note about the customer"
              rows={3}
            />
          </div>

          <div className="flex justify-end items-center gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-100 text-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-purple-600 text-white">{loading ? 'Saving...' : 'Save Customer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}