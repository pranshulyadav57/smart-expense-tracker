import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, TimeScale } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, TimeScale);

const buildCategoryData = (breakdown = []) => {
  const labels = breakdown.map((b) => b.category);
  const data = breakdown.map((b) => b.amount);
  return {
    labels,
    datasets: [{ data, backgroundColor: ['#60A5FA', '#F472B6', '#F59E0B', '#34D399', '#A78BFA'], borderWidth: 0 }]
  };
};

const buildTrendData = (expenses = []) => {
  // Build last 7 days trend
  const today = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const map = days.reduce((acc, day) => ({ ...acc, [day]: 0 }), {});
  expenses.forEach((e) => {
    const day = (e.date || e.created_at || '').toString().split('T')[0];
    if (day && map[day] !== undefined) map[day] += Number(e.amount || 0);
  });

  return {
    labels: days,
    datasets: [
      {
        label: 'Spend',
        data: days.map((d) => map[d] || 0),
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37,99,235,0.08)',
        tension: 0.3,
      }
    ]
  };
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { 
      display: true,
      position: 'bottom'
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value) {
          return '₹' + value;
        }
      }
    }
  }
};

export default function ExpenseCharts({ summary = {}, breakdown = [], expenses = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Line Chart - Larger on large screens */}
      <div className="lg:col-span-2 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <h3 className="font-semibold text-lg mb-4 text-slate-800 dark:text-slate-100">Last 7 Days Spend</h3>
        <div style={{ position: 'relative', width: '100%', height: '300px' }}>
          <Line 
            data={buildTrendData(expenses)} 
            options={chartOptions}
          />
        </div>
      </div>

      {/* Doughnut Chart - Sidebar on large screens */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <h3 className="font-semibold text-lg mb-4 text-slate-800 dark:text-slate-100">Category Breakdown</h3>
        {breakdown && breakdown.length > 0 ? (
          <div style={{ position: 'relative', width: '100%', height: '280px' }}>
            <Doughnut 
              data={buildCategoryData(breakdown)}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 10,
                      font: { size: 12 }
                    }
                  }
                }
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-slate-500 dark:text-slate-400">
            <p>No category data yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
