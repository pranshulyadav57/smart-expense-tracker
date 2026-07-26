import React from 'react';
import GlassCard from '../../components/ui/GlassCard';
import '../../styles/designTokens.css';

export default function PendingPaymentsPanel({ customers = [], onRemind }) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-[var(--text-secondary)]">Pending Payments</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Customers with outstanding balances</div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {customers.length === 0 && <div className="text-sm text-[var(--text-secondary)]">No pending payments.</div>}
        {customers.map(c => (
          <div key={c.id} className="flex items-center justify-between p-2 rounded-md hover:shadow-sm transition">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">{c.name}</div>
              <div className="text-xs text-[var(--text-secondary)]">{c.phone || ''}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-[var(--danger)]">₹{c.current_balance}</div>
              <button onClick={() => onRemind && onRemind(c)} className="px-2 py-1 bg-[var(--primary)] text-white rounded text-sm">Remind</button>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
