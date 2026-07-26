import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import API from "../../services/api";
import Sidebar from "../../components/ui/Sidebar";
import { useApi } from "../../hooks/useApi";
import AIInsightsPanel from "../../components/AIInsightsPanel";

// New modular components
import SummaryCards from "./SummaryCards";
import AddExpenseForm from "./AddExpenseForm";
import ExpenseList from "./ExpenseList";
import DashboardSkeleton from "./DashboardSkeleton";
import ExpenseControls from "./ExpenseControls";
import ExpenseCharts from "./ExpenseCharts";
import BudgetPanel from "./BudgetPanel";
import AlertsPanel from "./AlertsPanel";


export default function StudentDashboard() {
  const navigate = useNavigate();
  const auth = useAuth();

  // Core State
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [pageInfo, setPageInfo] = useState({ currentPage: 1, totalPages: 1, totalExpenses: 0 });
  const [filters, setFilters] = useState({ category: '', search: '', page: 1, limit: 10, sortBy: 'created_at', sortOrder: 'desc' });
  
  // API Hooks
  const { loading: pageLoading, error: pageError, execute: fetchPageData } = useApi();
  const { loading: actionLoading, execute: performAction } = useApi();
  const { loading: insightsLoading, error: insightsError, execute: fetchInsights } = useApi();
  const [expensesLoading, setExpensesLoading] = useState(false);

  // =========================
  // DATA FETCHING
  // =========================
  const loadInitialData = useCallback(async () => {
    // Load summary under the page executor (shows page loading state)
    try {
      const summaryRes = await fetchPageData(() => API.get("/student/summary"));
      setSummary(summaryRes.data?.data || { todaySpent: 0, monthSpent: 0 });
    } catch (err) {
      console.error('Failed to load /student/summary', err?.response?.data || err.message || err);
    }

    // Load expenses independently so a failure doesn't block the whole page
    setExpensesLoading(true);
    try {
      const params = { page: filters.page, limit: filters.limit };
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;
      const expensesRes = await API.get("/student/expenses", { params });
      const data = expensesRes.data?.data || {};
      setExpenses(data.expenses || []);
      setPageInfo((p) => ({ ...p, currentPage: data.pagination?.currentPage || 1, totalPages: data.pagination?.totalPages || 1, totalExpenses: data.pagination?.totalExpenses || 0 }));
      // if API also returns breakdown, use it
      if (data.breakdown) setBreakdown(data.breakdown);
    } catch (err) {
      console.error('Failed to load /student/expenses', err?.response?.data || err.message || err);
      setExpenses([]);
    } finally {
      setExpensesLoading(false);
    }

    // Load insights independently and silently fail if unavailable
    try {
      const insightsRes = await fetchInsights(() => API.get('/student/insights'));
      const rawInsights = insightsRes.data?.data;
      setAiInsights(Array.isArray(rawInsights) ? rawInsights : rawInsights?.insights || []);
    } catch (err) {
      console.error('Failed to load /student/insights', err?.response?.data || err.message || err);
      setAiInsights([]);
    }
  }, [fetchPageData, fetchInsights, filters.page, filters.limit, filters.category, filters.search, filters.sortBy, filters.sortOrder]);

  const reloadSummaryAndExpenses = useCallback(async () => {
    // Use an executor from the useApi hook for consistency
    performAction(() =>
      Promise.all([
        API.get("/student/summary"),
        API.get("/student/expenses", { params: { page: filters.page, limit: filters.limit, category: filters.category, sortBy: filters.sortBy, sortOrder: filters.sortOrder, search: filters.search } }),
      ])
    ).then(([summaryRes, expensesRes]) => {
      setSummary(summaryRes.data?.data);
      const data = expensesRes.data?.data || {};
      setExpenses(data.expenses || []);
      setPageInfo((p) => ({ ...p, currentPage: data.pagination?.currentPage || 1, totalPages: data.pagination?.totalPages || 1, totalExpenses: data.pagination?.totalExpenses || 0 }));
    });
  }, [performAction, filters.page, filters.limit, filters.category, filters.search, filters.sortBy, filters.sortOrder]);

  // =========================
  // CRUD OPERATIONS
  // =========================
  const handleAddExpense = async (form) => {
    await performAction(
      () => API.post("/student/expenses", { ...form, amount: parseFloat(form.amount) || 0 }),
      {
        toastMessages: {
          loading: 'Adding expense...',
          success: 'Expense added!',
          error: 'Failed to add expense.',
        }
      }
    );
    await reloadSummaryAndExpenses();
  };

  const handleFiltersChange = async (nextFilters) => {
    setFilters(nextFilters);
    // fetch with new filters
    try {
      const params = { page: nextFilters.page, limit: nextFilters.limit };
      if (nextFilters.category) params.category = nextFilters.category;
      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.sortBy) params.sortBy = nextFilters.sortBy;
      if (nextFilters.sortOrder) params.sortOrder = nextFilters.sortOrder;
      const expensesRes = await API.get('/student/expenses', { params });
      const data = expensesRes.data?.data || {};
      setExpenses(data.expenses || []);
      setPageInfo((p) => ({ ...p, currentPage: data.pagination?.currentPage || 1, totalPages: data.pagination?.totalPages || 1, totalExpenses: data.pagination?.totalExpenses || 0 }));
      if (data.breakdown) setBreakdown(data.breakdown);
    } catch (err) {
      console.error('Failed to fetch filtered expenses', err?.response?.data || err.message || err);
    }
  };

  const handleDelete = async (id) => {
    await performAction(
      () => API.delete(`/student/expenses/${id}`),
      {
        toastMessages: {
          loading: 'Deleting expense...',
          success: 'Expense deleted!',
          error: 'Failed to delete expense.',
        }
      }
    );
    // After a successful deletion, refetch all related data to ensure consistency.
    await reloadSummaryAndExpenses();
  };

  const handleUpdate = async (id, editForm) => {
    await performAction(
      () => API.put(`/student/expenses/${id}`, { ...editForm, amount: parseFloat(editForm.amount) || 0 }),
      {
        toastMessages: {
          loading: 'Updating expense...',
          success: 'Expense updated!',
          error: 'Failed to update expense.',
        }
      }
    );
    await reloadSummaryAndExpenses();
  };

  // =========================
  // INITIALIZATION & LOGOUT
  // =========================
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleLogout = () => {
    auth.logout();
    navigate('/login', { replace: true });
  };

  if (pageLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 w-full">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
              <h1 className="text-3xl font-bold text-slate-800">🎓 Personal Expense </h1>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button onClick={loadInitialData} disabled={pageLoading} className="flex-1 md:flex-none bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60">
                  {pageLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button onClick={handleLogout} className="flex-1 md:flex-none bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors">
                  Logout
                </button>
              </div>
            </header>

            {pageError && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-6">{pageError}</p>}

            {summary && <SummaryCards summary={summary} />}

            <div className="my-6">
              <ExpenseCharts summary={summary} breakdown={breakdown} expenses={expenses} />
            </div>

            <div className="my-6">
              <BudgetPanel summary={summary} onBudgetUpdated={reloadSummaryAndExpenses} />
            </div>
            <div className="my-6">
              <AlertsPanel onRefresh={reloadSummaryAndExpenses} />
            </div>

            <div className="my-6">
              <ExpenseControls filters={filters} onChange={handleFiltersChange} pageInfo={pageInfo} />
            </div>

            <div className="my-8">
              <AIInsightsPanel
                title="Student AI Insights"
                subtitle="Personalized suggestions based on your recent spending"
                insights={aiInsights}
                loading={insightsLoading}
                error={insightsError}
              />
            </div>

            <div className="my-8">
              <AddExpenseForm onAdd={handleAddExpense} loading={actionLoading} />
            </div>

            <ExpenseList expenses={expenses} onUpdate={handleUpdate} onDelete={handleDelete} loading={expensesLoading} />
          </div>
        </main>

      </div>
    </div>
  );
}