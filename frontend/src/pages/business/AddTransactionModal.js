import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function AddTransactionModal({ show, onClose, onAdd, initial = null, onSave, customer }) {
  const [type, setType] = useState(initial?.type || 'credit');
  const [amount, setAmount] = useState(initial?.amount || '');
  const [paymentMethod, setPaymentMethod] = useState(initial?.payment_method || 'cash');
  const [note, setNote] = useState(initial?.note || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setType(initial?.type || 'credit');
      setAmount(initial?.amount || '');
      setPaymentMethod(initial?.payment_method || 'cash');
      setNote(initial?.note || '');
      setLoading(false);
    }
  }, [show, initial]);

  if (!show) return null;

  const validate = () => {
    const num = parseFloat(amount);
    if (!num || isNaN(num) || num <= 0) {
      toast.error('Enter a valid amount');
      return false;
    }
    if (!['credit', 'debit'].includes(type)) {
      toast.error('Invalid transaction type');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { type, amount: parseFloat(amount), payment_method: paymentMethod, note: note || null, customer_id: customer?.id };
      if (initial && typeof onSave === 'function') {
        await onSave(initial.id, payload);
        toast.success('Transaction updated');
      } else {
        await onAdd(payload);
        toast.success('Transaction added');
      }
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{initial ? 'Edit Transaction' : `Add Transaction for ${customer?.name || ''}`}</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 dark:text-gray-300">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full mt-1 p-2 border rounded bg-white dark:bg-gray-700">
              <option value="credit">Credit (Customer owes you)</option>
              <option value="debit">Debit (You owe customer)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-sm text-gray-600 dark:text-gray-300">Amount</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full mt-1 p-2 border rounded bg-white dark:bg-gray-700" />
          </div>

          <div className="mb-3">
            <label className="block text-sm text-gray-600 dark:text-gray-300">Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full mt-1 p-2 border rounded bg-white dark:bg-gray-700">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-sm text-gray-600 dark:text-gray-300">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full mt-1 p-2 border rounded bg-white dark:bg-gray-700" rows={3} />
          </div>

          <div className="flex justify-end items-center gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-100 text-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-purple-600 text-white">{loading ? 'Saving...' : initial ? 'Save Changes' : 'Add Transaction'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}