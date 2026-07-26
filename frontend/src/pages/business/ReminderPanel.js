import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReminderPanel({ show, onClose, onSend, customer, formatCurrency }) {
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState('balance'); // balance, custom

  const handleSend = async () => {
    setLoading(true);
    try {
      await onSend();
      setLoading(false);
      // onClose is called in the parent's onSend callback
    } catch (err) {
      setLoading(false);
      console.error('Failed to send reminder:', err);
    }
  };

  if (!show || !customer) return null;

  const defaultMessage = `Dear ${customer.name}, you have a pending balance of ${formatCurrency(customer.current_balance || 0)}. Please clear your payment at your earliest convenience.`;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">📤 Send Payment Reminder</h2>
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="text-white hover:text-gray-200 text-2xl leading-none disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Customer Information */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
                    Customer Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Name:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {customer.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {customer.phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <span className="text-gray-600 dark:text-gray-400">Pending Balance:</span>
                      <span className="font-bold text-lg text-red-600 dark:text-red-400">
                        {formatCurrency(customer.current_balance || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Type Selection */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                    Message Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMessageType('balance')}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                        messageType === 'balance'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                      disabled={loading}
                    >
                      Balance Reminder
                    </button>
                    <button
                      onClick={() => setMessageType('custom')}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                        messageType === 'custom'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                      disabled={loading}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {/* Message Preview */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                    Message Preview
                  </label>
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      💬 {defaultMessage}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Reminder will be sent via SMS and Email to the customer.
                  </p>
                </div>

                {/* Confirmation */}
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ This will send an immediate payment reminder to the customer. Make sure the details are correct.
                  </p>
                </div>
              </div>

              {/* Footer - Actions */}
              <div className="flex gap-3 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      ✓ Send Reminder
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}