import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import API from "../../services/api";
import Sidebar from "../../components/ui/Sidebar";

export default function BusinessReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [backupHistory, setBackupHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("transactions");
  const [apiError, setApiError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch transaction report
  const loadTransactionReport = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const response = await API.get('/business/reports/transactions', {
        params: {
          start_date: dateRange.startDate,
          end_date: dateRange.endDate
        }
      });
      const responseData = response?.data?.data || {};
      // Handle both direct array and object with transactions property
      const transactions = Array.isArray(responseData) ? responseData : (responseData?.transactions || []);
      setTransactions(Array.isArray(transactions) ? transactions : []);
    } catch (err) {
      console.error('Failed to load transaction report:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to load transaction report';
      setApiError(errorMsg);
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        toast.error('Request timeout. Please check your internet connection.');
      } else if (!err?.response) {
        toast.error('Cannot connect to server. Please check your internet connection.');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Fetch backup history
  const loadBackupHistory = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const response = await API.get('/business/backup/history');
      const data = response?.data?.data || [];
      setBackupHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load backup history:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to load backup history';
      setApiError(errorMsg);
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        toast.error('Request timeout. Please check your internet connection.');
      } else if (!err?.response) {
        toast.error('Cannot connect to server. Please check your internet connection.');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate full transaction report PDF
  const generateTransactionReportPDF = async () => {
    const loadingToast = toast.loading('Generating transaction report...');
    setApiError(null);
    try {
      const response = await API.get('/business/reports/transaction-report', {
        params: {
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          format: 'pdf'
        },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaction-report-${dateRange.startDate}-${dateRange.endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success('Transaction report downloaded');
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to generate transaction report';
      setApiError(errorMsg);
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        toast.error('Request timeout. Please check your internet connection.');
      } else if (!err?.response) {
        toast.error('Cannot connect to server. Please check your internet connection.');
      } else {
        toast.error(errorMsg);
      }
      console.error('Generate report failed:', err);
    }
  };

  // Create backup
  const createBackup = async () => {
    const loadingToast = toast.loading('Creating backup...');
    setApiError(null);
    try {
      await API.post('/business/backup/create');
      toast.dismiss(loadingToast);
      toast.success('Backup created successfully');
      loadBackupHistory();
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to create backup';
      setApiError(errorMsg);
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        toast.error('Request timeout. Please check your internet connection.');
      } else if (!err?.response) {
        toast.error('Cannot connect to server. Please check your internet connection.');
      } else {
        toast.error(errorMsg);
      }
      console.error('Create backup failed:', err);
    }
  };

  // Load data on tab change
  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactionReport();
    } else if (activeTab === 'backup') {
      loadBackupHistory();
    }
  }, [activeTab, dateRange, loadTransactionReport, loadBackupHistory]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex-shrink-0">
              <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                📊 Reports
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">View and export business reports</p>
            </div>
            <button
              className="px-4 py-2 font-semibold text-sm text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-300 ease-in-out"
              onClick={() => navigate('/business')}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <Sidebar role="business" />

        <main>
          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6 border-b border-gray-200 dark:border-gray-700"
          >
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                  activeTab === 'transactions'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800'
                }`}
              >
                📈 Transaction Reports
              </button>
              <button
                onClick={() => setActiveTab('backup')}
                className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                  activeTab === 'backup'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800'
                }`}
              >
                💾 Backups
              </button>
            </div>
          </motion.div>

          {/* Transaction Reports Tab */}
          {activeTab === 'transactions' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Error Message */}
              {apiError && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md"
                  role="alert"
                >
                  <p className="font-bold">⚠️ Connection Error</p>
                  <p className="text-sm mt-1">{apiError}</p>
                  <p className="text-xs mt-2 text-red-600">
                    Make sure the backend server is running on http://localhost:5000
                  </p>
                </motion.div>
              )}

              {/* Date Range Filter */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                  Filter by Date Range
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={generateTransactionReportPDF}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-300"
                      disabled={loading}
                    >
                      📥 Download PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                            Loading...
                          </td>
                        </tr>
                      ) : transactions.length > 0 ? (
                        transactions.map((transaction, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                          >
                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                              {formatDate(transaction.created_at || transaction.date)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                              {transaction.customer_name || transaction.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {formatCurrency(transaction.amount || 0)}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  transaction.type === 'credit' || transaction.transaction_type === 'credit'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {transaction.type || transaction.transaction_type || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {transaction.note || transaction.notes || transaction.description || '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                            No transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Backup Tab */}
          {activeTab === 'backup' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Error Message */}
              {apiError && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md"
                  role="alert"
                >
                  <p className="font-bold">⚠️ Connection Error</p>
                  <p className="text-sm mt-1">{apiError}</p>
                  <p className="text-xs mt-2 text-red-600">
                    Make sure the backend server is running on http://localhost:5000
                  </p>
                </motion.div>
              )}

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                      💾 Backup Management
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Create and manage backups of your business data
                    </p>
                  </div>
                  <button
                    onClick={createBackup}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-300 flex items-center gap-2"
                    disabled={loading}
                  >
                    ✨ Create Backup Now
                  </button>
                </div>

                {/* Backup History */}
                <div className="mt-8">
                  <h3 className="text-md font-semibold mb-4 text-gray-800 dark:text-white">
                    Backup History
                  </h3>
                  <div className="space-y-3">
                    {loading ? (
                      <div className="text-center py-4 text-gray-500">Loading...</div>
                    ) : backupHistory.length > 0 ? (
                      backupHistory.map((backup, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white">
                              Backup {backupHistory.length - idx}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(backup.created_at || backup.backup_date)}
                            </p>
                            {backup.size && (
                              <p className="text-xs text-gray-400 mt-1">
                                Size: {(backup.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                            ✓ Complete
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No backups yet. Create one to get started!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
