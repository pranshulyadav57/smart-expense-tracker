import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import GlassCard from '../../components/ui/GlassCard';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import CurrencySelector from '../../components/ui/CurrencySelector';
import { formatCurrency, getPreferredCurrency } from '../../utils/formatCurrency';
import { useApi } from '../../hooks/useApi';
import API from '../../services/api';
import '../../styles/designTokens.css';

const sampleLine = [
  { month: 'Jan', spent: 3200 }, { month: 'Feb', spent: 2800 }, { month: 'Mar', spent: 3000 }, { month: 'Apr', spent: 2600 }, { month: 'May', spent: 3400 }
];

const samplePie = [
  { name: 'Food', value: 420 }, { name: 'Transport', value: 220 }, { name: 'Entertainment', value: 160 }, { name: 'Bills', value: 300 }
];

export default function StudentOverview() {
  const { loading, error, execute } = useApi();
  const [dashboard, setDashboard] = useState(null);
  const [currency, setCurrency] = useState(getPreferredCurrency());

  useEffect(() => {
    const load = async () => {
      const res = await execute(() => API.get('/student/dashboard'));
      setDashboard(res?.data?.data || null);
    };
    load();
  }, [execute]);

  const totals = useMemo(() => ({
    expenses: dashboard?.expenses_total ?? 5420,
    savings: dashboard?.savings ?? 840,
    budget: dashboard?.budget ?? 6000,
  }), [dashboard]);

  const lineData = dashboard?.monthly_trends ?? sampleLine;
  const pieData = dashboard?.category_breakdown ?? samplePie;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Personal Overview</h1>
          <p className="text-sm text-[var(--text-secondary)]">Snapshot of your spending and budgets</p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencySelector onChange={setCurrency} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Total Expenses</div>
              {loading ? (
                <SkeletonLoader className="h-8 w-32 shimmer" />
              ) : (
                <div className="text-2xl font-semibold text-[var(--text-primary)]">
                  <AnimatedCounter value={totals.expenses} formatter={(v)=>formatCurrency(v, currency)} />
                </div>
              )}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Monthly</div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="text-sm text-[var(--text-secondary)]">Budget Progress</div>
          <div className="mt-2">
            {loading ? (
              <SkeletonLoader className="h-8 w-full shimmer rounded-md" />
            ) : (
              <>
                <div className="w-full bg-[rgba(255,255,255,0.03)] rounded-full h-3 overflow-hidden">
                  <div style={{ width: `₹{Math.min(100, (totals.expenses / totals.budget) * 100)}%` }} className="h-3 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all" />
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-2">{formatCurrency(totals.expenses, currency)} of {formatCurrency(totals.budget, currency)}</div>
              </>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="text-sm text-[var(--text-secondary)]">Savings</div>
          {loading ? (
            <SkeletonLoader className="h-8 w-28 shimmer" />
          ) : (
            <div className="text-2xl font-semibold text-[var(--success)] mt-2">{formatCurrency(totals.savings, currency)}</div>
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-[var(--text-secondary)]">Expense Trends</div>
            <div className="text-xs text-[var(--text-secondary)]">Last 6 months</div>
          </div>
          <div style={{ height: 220 }}>
            {loading ? (
              <SkeletonLoader className="h-full shimmer rounded-md" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1976D2" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="#1976D2" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <Tooltip formatter={(v)=>formatCurrency(v, currency)} />
                  <Area type="monotone" dataKey="spent" stroke="#1976D2" fillOpacity={1} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="text-sm text-[var(--text-secondary)] mb-2">Spending by Category</div>
          <div style={{ height: 220 }}>
            {loading ? (
              <SkeletonLoader className="h-full shimmer rounded-md" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip formatter={(v)=>formatCurrency(v, currency)} />
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} fill="#8884d8">
                    {pieData.map((entry, idx) => (
                      <Cell key={`c-${idx}`} fill={["#1976D2","#00BCD4","#6C63FF","#10B981"][idx % 4]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </div>

      {error && <div role="alert" className="text-sm text-red-400">{String(error)}</div>}
    </div>
  );
}
