import React, { useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';

export default function DashboardCharts({ dashboardStats = {}, customers = [] }) {
  const monthly = dashboardStats?.monthly || {};

  const income = Number(monthly?.income || 0);
  const expense = Number(monthly?.expense || 0);

  const topCustomers = useMemo(() => {
    return (customers || []).slice().sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0)).slice(0, 5);
  }, [customers]);

  const barData = {
    labels: ['Income', 'Expense'],
    datasets: [
      {
        label: 'Amount (INR)',
        backgroundColor: ['#10B981', '#EF4444'],
        data: [income, expense]
      }
    ]
  };

  const doughnutData = {
    labels: topCustomers.map(c => c.name || 'Unknown'),
    datasets: [
      {
        data: topCustomers.map(c => Number(c.current_balance || 0)),
        backgroundColor: ['#6366F1', '#34D399', '#F59E0B', '#FB7185', '#60A5FA']
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { color: '#374151', padding: 16, boxWidth: 12 } },
      tooltip: { enabled: true, titleFont: { size: 14 }, bodyFont: { size: 12 } }
    },
    layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } },
    scales: {
      x: { ticks: { color: '#6b7280', font: { size: 12 } }, grid: { display: false } },
      y: { ticks: { color: '#6b7280', font: { size: 12 } }, grid: { color: 'rgba(15,23,42,0.06)' } }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: { display: true, position: 'top', labels: { color: '#374151', padding: 12 } },
      tooltip: { enabled: true, titleFont: { size: 14 }, bodyFont: { size: 12 } }
    },
    layout: { padding: { top: 6, bottom: 6 } }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow h-56">
        <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-100">Monthly Revenue vs Expense</h3>
        <div className="w-full h-44">
          <Bar data={barData} options={barOptions} height={220} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow h-56">
        <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-100">Top Customers (by outstanding)</h3>
        {topCustomers.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No outstanding customers</div>
        ) : (
          <div className="w-full h-44">
            <Doughnut data={doughnutData} options={doughnutOptions} height={220} />
          </div>
        )}
      </div>
    </div>
  );
}