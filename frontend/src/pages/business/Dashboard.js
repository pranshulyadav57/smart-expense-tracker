import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import useDebounce from "../../hooks/useDebounce";
import API from "../../services/api";
import { useApi } from "../../hooks/useApi";
import AIInsightsPanel from "../../components/AIInsightsPanel";
import Sidebar from "../../components/ui/Sidebar";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  BarController,
  LineController,
  DoughnutController
} from "chart.js";
import toast from "react-hot-toast";

// Extracted Components
import SummaryCards from "./SummaryCards";
import CustomerList from "./CustomerList";
import CustomerLedger from "./CustomerLedger";
// DashboardCharts removed — unused import to satisfy ESLint
import BusinessKPI from "./BusinessKPI";
import PendingPaymentsPanel from "./PendingPaymentsPanel";
import BusinessCharts from "./BusinessCharts";
import AddCustomerModal from "./AddCustomerModal";
import AddTransactionModal from "./AddTransactionModal";
import ReminderPanel from "./ReminderPanel";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  BarController,
  LineController,
  DoughnutController
);

export default function Dashboard() {
  const navigate = useNavigate();
  const auth = useAuth();

  const handleLogout = () => {
    auth.logout();
    navigate('/login', { replace: true });
  };

  // =========================
  // STATES
  // =========================
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, inactive
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedReminderCustomer, setSelectedReminderCustomer] = useState(null);

  // API Hooks
  const { loading: pageLoading, error: pageError, execute: fetchPageData } = useApi();
  const { execute: performAction } = useApi();

  // =========================
  // PAGINATION STATE
  // =========================
  const [customerPage, setCustomerPage] = useState(1);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  
  // =========================
  // LOADING & ERROR STATES
  // =========================
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [insightsApiLoading, setInsightsApiLoading] = useState(false);
  const [insightsApiError, setInsightsApiError] = useState(null);

  // =========================
  // DATA LOADING
  // =========================
  const unwrapResponse = (response) => response?.data?.data ?? response?.data ?? response;

  const loadCustomers = useCallback(async (page, signal) => {
    const response = await fetchPageData(() => API.get('/business/customers', {
        params: {
          page,
          limit: 12,
          search: debouncedSearchTerm,
          status: filterStatus,
        },
        signal, // Pass AbortSignal to axios
      })).catch(err => {
      if (err.name === 'CanceledError') return null;
      toast.error("Failed to load customers");
    });

    const data = unwrapResponse(response);

    if (data) {
      const { customers: newCustomers, pagination } = data;
      setCustomers(prev => page === 1 ? newCustomers : [...prev, ...newCustomers]);
      setHasMoreCustomers(pagination?.hasNext ?? false);
      setCustomerPage(page);
    }
  }, [debouncedSearchTerm, filterStatus, fetchPageData]);

  const loadDashboardStats = useCallback(async () => {
    try {
      const response = await API.get('/business/dashboard/summary');
      const stats = unwrapResponse(response);
      if (stats) setDashboardStats(stats);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      toast.error("Unable to load dashboard summary");
    }
  }, []);

  const loadBusinessInsights = useCallback(async () => {
    setInsightsApiLoading(true);
    setInsightsApiError(null);
    try {
      const response = await API.get('/ai/business');
      const insights = unwrapResponse(response);
      if (insights) {
        setAiInsights(Array.isArray(insights) ? insights : insights?.insights || []);
      }
    } catch (err) {
      console.error('Failed to load insights:', err);
      setInsightsApiError('Failed to load AI insights');
      // Silently fail for insights since they're not critical
    } finally {
      setInsightsApiLoading(false);
    }
  }, []);

  const loadCustomerTransactions = async (customerId, page = 1) => {
    setTransactionLoading(true);
    try {
      const response = await API.get(`/business/transactions/${customerId}`, {
        params: { page, limit: 20 }
      });

      const data = unwrapResponse(response);

      if (data) {
        const { transactions: newTransactions, pagination } = data;
        setTransactions(prev => page === 1 ? newTransactions : [...prev, ...newTransactions]);
        setHasMoreTransactions(pagination?.hasNext ?? false);
        setTransactionPage(page);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      toast.error("Failed to load transactions");
    } finally {
      setTransactionLoading(false);
    }
  };

  // =========================
  // CUSTOMER OPERATIONS
  // =========================
  const addCustomer = async (newCustomer) => {
    const result = await performAction(() => API.post('/business/customers', newCustomer), {
      toastMessages: {
        loading: 'Adding customer...',
        success: 'Customer added successfully!',
        error: 'Failed to add customer.'
      }
    });
    if (result) {
      setShowCustomerModal(false);
      setSearchTerm('');
      // This will trigger the useEffect to reload customers
    }
  };

  const editCustomer = async (id, data) => {
    const result = await performAction(() => API.put(`/business/customers/${id}`, data), {
      toastMessages: { loading: 'Saving customer...', success: 'Customer updated', error: 'Update failed' }
    });
    if (result) {
      setShowCustomerModal(false);
      setEditingCustomer(null);
      loadCustomers(1);
      loadDashboardStats();
      if (selectedCustomer?.id === id) {
        // reload transactions/balance view
        selectCustomer({ ...selectedCustomer, ...data });
      }
    }
  };

  const deleteCustomer = async (customer) => {
    const ok = window.confirm(`Delete customer ${customer.name}? This cannot be undone.`);
    if (!ok) return;
    const result = await performAction(() => API.delete(`/business/customers/${customer.id}`), {
      toastMessages: { loading: 'Deleting...', success: 'Customer deleted', error: 'Delete failed' }
    });
    if (result) {
      // if deleted customer is selected, clear selection
      if (selectedCustomer?.id === customer.id) setSelectedCustomer(null);
      loadCustomers(1);
      loadDashboardStats();
    }
  };

  const selectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setTransactions([]); // Reset on new customer selection
    loadCustomerTransactions(customer.id, 1);
  };

  // =========================
  // TRANSACTION OPERATIONS
  // =========================
  const addTransaction = async (transactionData) => {
    if (!selectedCustomer?.id) return;

    const payload = {
      ...transactionData,
      amount: parseFloat(transactionData.amount) || 0,
    };

    const result = await performAction(() => API.post('/business/transactions', payload), {
      toastMessages: {
        loading: 'Adding transaction...',
        success: 'Transaction added!',
        error: 'Failed to add transaction.'
      }
    });

    if (result) {
      setShowTransactionModal(false);
      loadCustomerTransactions(selectedCustomer.id, 1);
      loadCustomers(1);
      loadDashboardStats();
    }
  };

  const editTransaction = async (id, data) => {
    const result = await performAction(() => API.put(`/business/transactions/${id}`, data), {
      toastMessages: { loading: 'Saving...', success: 'Transaction updated', error: 'Update failed' }
    });
    if (result) {
      setShowTransactionModal(false);
      setEditingTransaction(null);
      loadCustomerTransactions(selectedCustomer.id, 1);
      loadDashboardStats();
      loadCustomers(1);
    }
  };

  const deleteTransaction = async (transaction) => {
    const ok = window.confirm('Delete this transaction?');
    if (!ok) return;
    const result = await performAction(() => API.delete(`/business/transactions/${transaction.id}`), {
      toastMessages: { loading: 'Deleting...', success: 'Transaction deleted', error: 'Delete failed' }
    });
    if (result) {
      loadCustomerTransactions(selectedCustomer.id, 1);
      loadDashboardStats();
      loadCustomers(1);
    }
  };

  // =========================
  // REMINDER & SHARING
  // =========================
  const sendPaymentReminder = async () => {
    if (!selectedReminderCustomer) return;
    const result = await performAction(() => API.post('/business/reminders/send', {
        customer_id: selectedReminderCustomer.id,
        message: `Dear ${selectedReminderCustomer.name}, you have a pending balance of ₹${selectedReminderCustomer.current_balance}. Please clear your payment.`
      }), {
        toastMessages: {
          loading: 'Sending reminder...',
          success: 'Reminder sent!',
          error: 'Failed to send reminder.'
        }
      });
    if (result) {
      setShowReminderModal(false);
      setSelectedReminderCustomer(null);
    }
  };

  const shareOnWhatsApp = (customer) => {
    const message = `Customer: ${customer.name}\nBalance: ₹${customer.current_balance}\nStatus: ${customer.current_balance > 0 ? 'Outstanding' : 'Settled'}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // =========================
  // EXPORT FUNCTIONS
  // =========================
  const exportCustomerStatement = async (customer) => {
    const loadingToast = toast.loading('Generating statement...');
    try {
      const response = await API.get(`/business/reports/customer-statement`, {
        params: {
          customer_id: customer.id,
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
          end_date: new Date().toISOString().split('T')[0],
          format: 'pdf'
        },
        responseType: 'blob'
      });

      // derive filename from content-disposition if present
      const disposition = response.headers['content-disposition'] || '';
      let filename = `customer-statement-${customer.id}.pdf`;
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success('Statement downloaded');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to generate statement.');
      console.error('Export statement failed', err);
    }
  };

  // =========================
  // INITIALIZATION
  // =========================
  useEffect(() => {
    const controller = new AbortController();
    // Reset customers and load page 1 whenever search or filter changes
    setCustomers([]);
    loadCustomers(1, controller.signal);

    // Also refresh overall stats
    loadDashboardStats();
    loadBusinessInsights();

    return () => controller.abort(); // Cancel request on cleanup
  }, [debouncedSearchTerm, filterStatus, loadCustomers, loadDashboardStats, loadBusinessInsights]);

  const handleLoadMoreCustomers = () => {
    if (hasMoreCustomers && !pageLoading) {
      loadCustomers(customerPage + 1);
    }
  };

  const handleLoadMoreTransactions = () => {
  if (hasMoreTransactions && !transactionLoading && selectedCustomer) {
    loadCustomerTransactions(selectedCustomer.id, transactionPage + 1);
  }
};

  // =========================
  // RENDER HELPERS
  // =========================
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
      year: 'numeric'
    });
  };

  const safeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  if (pageLoading && customerPage === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-200">Loading your ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex-shrink-0">
              <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                📚 HisaabKitaab
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Professional Business Management</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button
                className="px-4 py-2 font-semibold text-sm text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-all duration-300 ease-in-out flex items-center gap-2"
                onClick={() => setShowCustomerModal(true)}
              >
                ➕ Add Customer
              </button>
              <button
                className="px-4 py-2 font-semibold text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-300 ease-in-out flex items-center gap-2"
                onClick={() => navigate('/business/reports')}
              >
                📊 Reports
              </button>
              <button
                className="px-4 py-2 font-semibold text-sm text-red-600 bg-red-100 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-300 ease-in-out flex items-center gap-2"
                onClick={handleLogout}
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <Sidebar role="business" />
        <main>
        <AnimatePresence>
          {pageError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md"
              role="alert"
            >
              <p className="font-bold">⚠️ Error</p>
              <p>{pageError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="my-6 flex flex-col md:flex-row gap-4 items-center"
        >
          <div className="relative flex-grow w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search customers by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full md:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
          >
            <option value="all">All Customers</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </motion.div>

        {/* Dashboard Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <SummaryCards
            stats={dashboardStats}
            formatCurrency={formatCurrency}
            safeNumber={safeNumber}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="my-8"
        >
          <AIInsightsPanel
            title="Business AI Insights"
            subtitle="AI-powered trends and collection recommendations"
            insights={aiInsights}
            loading={insightsApiLoading}
            error={insightsApiError}
          />
        </motion.div>

        {/* Main Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
        >
          {/* Top KPIs */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <BusinessKPI title="Revenue" value={dashboardStats?.revenue_total || 0} delta={dashboardStats?.revenue_delta} subtitle="30d" />
              <BusinessKPI title="Pending" value={dashboardStats?.pending_total || 0} delta={dashboardStats?.pending_delta} subtitle="Due" color={'var(--danger)'} />
              <BusinessKPI title="Customers" value={dashboardStats?.customers_count || 0} delta={dashboardStats?.customers_delta} subtitle="Active" color={'var(--accent)'} />
            </div>

            {/* Customer Cards */}
            <CustomerList
              customers={customers}
              searchTerm={searchTerm}
              filterStatus={filterStatus}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={selectCustomer}
              onShowReminderModal={(customer) => {
                setSelectedReminderCustomer(customer);
                setShowReminderModal(true);
              }}
              onShare={shareOnWhatsApp}
              onExport={exportCustomerStatement}
              onShowAddCustomerModal={() => { setEditingCustomer(null); setShowCustomerModal(true); }}
              onEdit={(c) => { setEditingCustomer(c); setShowCustomerModal(true); }}
              onDelete={deleteCustomer}
              formatCurrency={formatCurrency}
              hasMore={hasMoreCustomers}
              loadingMore={pageLoading && customerPage > 1}
              onLoadMore={handleLoadMoreCustomers}
            />

            </div>

            {/* Right Column Panels */}
          <div className="sticky top-24 space-y-4">
            <PendingPaymentsPanel customers={customers.filter(c => c.current_balance > 0).slice(0,5)} onRemind={(c) => { setSelectedReminderCustomer(c); setShowReminderModal(true); }} />

            <CustomerLedger
              customer={selectedCustomer}
              transactions={transactions}
              onShowTransactionModal={() => { setEditingTransaction(null); setShowTransactionModal(true); }}
              onEditTransaction={(t) => { setEditingTransaction(t); setShowTransactionModal(true); }}
              onDeleteTransaction={deleteTransaction}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              hasMoreTransactions={hasMoreTransactions}
              transactionLoading={transactionLoading && transactionPage > 1}
              onLoadMoreTransactions={handleLoadMoreTransactions}
            />
          </div>
        </motion.div>

        {/* Charts Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="my-8"
        >
          <BusinessCharts revenue={dashboardStats?.revenue_trends || []} topCustomers={dashboardStats?.top_customers || []} />
        </motion.div>
        </main>
      </div>

      {/* Modals */}
      <AddCustomerModal
        show={showCustomerModal}
        onClose={() => { setShowCustomerModal(false); setEditingCustomer(null); }}
        onAdd={addCustomer}
        initial={editingCustomer}
        onSave={editCustomer}
      />

      <AddTransactionModal
        show={showTransactionModal}
        onClose={() => { setShowTransactionModal(false); setEditingTransaction(null); }}
        onAdd={addTransaction}
        initial={editingTransaction}
        onSave={editTransaction}
        customer={selectedCustomer}
      />

      <ReminderPanel
        show={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        onSend={sendPaymentReminder}
        customer={selectedReminderCustomer}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}