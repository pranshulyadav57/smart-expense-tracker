import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCpu } from 'react-icons/fi';
import GlassCard from './ui/GlassCard';
import SkeletonLoader from './ui/SkeletonLoader';
import '../styles/designTokens.css';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export default function AIInsightsPanel({
  title = 'AI Insights',
  subtitle = 'Actionable recommendations powered by smart analytics',
  insights = [],
  loading = false,
  error = ''
}) {
  return (
    <section aria-labelledby="ai-insights-heading">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
        <div>
          <h2 id="ai-insights-heading" className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xl">{subtitle}</p>
        </div>
        <div className="text-sm text-[var(--text-secondary)]">{loading ? 'Analyzing data...' : error ? 'Review alerts' : 'Ready to optimize'}</div>
      </div>

      <div>
        {loading && (
          <div role="status" aria-live="polite">
            <SkeletonLoader className="h-32 rounded-md shimmer" />
          </div>
        )}

        {error && !loading && (
          <div role="alert" className="p-3 rounded-md bg-[rgba(255,240,240,0.06)] border border-[var(--border)] text-[var(--danger)]">{error}</div>
        )}

        {!loading && !error && (
          <motion.div initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {insights && insights.length > 0 ? (
                insights.map((it, idx) => (
                  <motion.div key={idx} variants={cardVariants} className="">
                    <GlassCard className="float-subtle p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white shadow-sm">
                          <FiCpu className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-[var(--text-primary)]">{it.title || `Insight ${idx + 1}`}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{it.score ? `Confidence ${Math.round(it.score*100)}%` : ''}</div>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mt-2">{it.message || String(it)}</p>
                          {it.action && (
                            <div className="mt-3">
                              <button className="px-3 py-1.5 rounded-md bg-[var(--primary)] text-white text-sm hover:scale-[1.02] transition-transform">{it.action.label}</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))
              ) : (
                <motion.div variants={cardVariants} className="lg:col-span-3">
                  <GlassCard className="p-6 text-center">
                    <div className="text-sm text-[var(--text-secondary)]">No insights available yet. Add more transactions or wait for analysis to complete.</div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}
