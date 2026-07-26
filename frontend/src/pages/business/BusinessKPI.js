import React from 'react';
import GlassCard from '../../components/ui/GlassCard';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import '../../styles/designTokens.css';

export default function BusinessKPI({ title, value, delta, subtitle, color = 'var(--primary)' }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-[var(--text-secondary)]">{title}</div>
          <div className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
            <AnimatedCounter value={value || 0} formatter={(v) => typeof v === 'number' ? v.toLocaleString() : v} />
          </div>
          {subtitle && <div className="text-xs text-[var(--text-secondary)] mt-1">{subtitle}</div>}
        </div>
        <div className="text-sm font-medium" style={{ color }}>{delta ? `${delta > 0 ? '+' : ''}${delta}%` : ''}</div>
      </div>
    </GlassCard>
  );
}
