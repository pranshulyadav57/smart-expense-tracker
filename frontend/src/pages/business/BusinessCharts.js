import React from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, PieChart, Pie, Cell } from 'recharts';
import GlassCard from '../../components/ui/GlassCard';
import '../../styles/designTokens.css';

export function RevenueArea({ data = [] }) {
  return (
    <GlassCard>
      <div className="text-sm text-[var(--text-secondary)]">Revenue</div>
      <div style={{ height: 200 }} className="mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="r1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6C63FF" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#6C63FF" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <Tooltip formatter={(v) => `₹${v}`} />
            <Area dataKey="value" stroke="#6C63FF" fill="url(#r1)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

export function TopCustomersPie({ data = [] }) {
  return (
    <GlassCard>
      <div className="text-sm text-[var(--text-secondary)]">Top Customers</div>
      <div style={{ height: 180 }} className="mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={60}>
              {data.map((d, i) => (
                <Cell key={i} fill={["#1976D2","#00BCD4","#6C63FF","#10B981"][i % 4]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

export default function BusinessCharts({ revenue = [], topCustomers = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <RevenueArea data={revenue} />
      </div>
      <div>
        <TopCustomersPie data={topCustomers} />
      </div>
    </div>
  );
}
