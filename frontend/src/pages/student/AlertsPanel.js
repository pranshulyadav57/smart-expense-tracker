import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiCheck } from 'react-icons/fi';
import { useApi } from '../../hooks/useApi';
import API from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import '../../styles/designTokens.css';

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.35 } },
};

export default function AlertsPanel({ onRefresh }) {
  const { loading, error, execute } = useApi();
  const [localAlerts, setLocalAlerts] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await execute(() => API.get('/student/alerts'));
      // keep a local copy for optimistic UI changes
      const alerts = res?.data?.data?.alerts || [];
      setLocalAlerts(alerts);
    } catch (e) {
      // execute already sets error via hook; ensure localAlerts is a stable array
      setLocalAlerts([]);
    }
  }, [execute]);

  useEffect(() => { load(); }, [load]);

  const unreadCount = useMemo(() => (localAlerts || []).filter(a => !a.is_read).length, [localAlerts]);

  const markRead = async (id) => {
    // optimistic update
    setLocalAlerts(prev => (prev || []).map(a => a.id === id ? { ...a, is_read: true } : a));
    try {
      await API.post(`/student/alerts/${id}/read`);
      onRefresh && onRefresh();
    } catch (err) {
      // rollback on error
      await load();
    }
  };

  const markAllRead = async () => {
    const ids = (localAlerts || []).filter(a => !a.is_read).map(a => a.id);
    if (ids.length === 0) return;
    setLocalAlerts(prev => (prev || []).map(a => ({ ...a, is_read: true })));
    try {
      await API.post('/student/alerts/mark-all-read', { ids });
      onRefresh && onRefresh();
    } catch (err) {
      await load();
    }
  };

  return (
    <GlassCard className="w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[rgba(25,118,210,0.14)] to-[rgba(108,99,255,0.08)] text-[var(--text-primary)]">
            <FiBell className="w-5 h-5 text-[var(--primary)]" aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Alerts & Reminders</h3>
            <p className="text-sm text-[var(--text-secondary)]">Important notifications and automated reminders (e.g. payment reminders)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-[var(--text-secondary)]">Unread</div>
          <div className="text-xl font-medium text-[var(--primary)]">
            <AnimatedCounter value={unreadCount} duration={700} />
          </div>
          <button
            aria-label="Mark all alerts as read"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:scale-[1.02] transition-transform text-sm"
            onClick={markAllRead}
          >
            <FiCheck /> Mark all
          </button>
        </div>
      </div>

      <div className="mt-4">
        {loading && (
          <div className="space-y-3">
            <SkeletonLoader className="h-12 rounded-md shimmer" />
            <SkeletonLoader className="h-12 rounded-md shimmer" />
            <SkeletonLoader className="h-12 rounded-md shimmer" />
          </div>
        )}

        {error && <div role="alert" className="text-sm text-red-400">{String(error)}</div>}

        {!loading && (!localAlerts || localAlerts.length === 0) && (
          <div className="py-6 text-center text-sm text-[var(--text-secondary)]">You're all caught up — no alerts.</div>
        )}

        <AnimatePresence>
          {!loading && localAlerts && localAlerts.length > 0 && (
            <motion.ul variants={listVariants} initial="hidden" animate="show" className="space-y-3 mt-2">
              {localAlerts.map(alert => (
                <motion.li key={alert.id} variants={itemVariants} exit="exit">
                  <div
                    className={`flex items-start justify-between p-3 rounded-lg transition-shadow hover:shadow-lg ${alert.is_read ? 'bg-[rgba(255,255,255,0.02)]' : 'bg-[rgba(255,188,75,0.06)]'}`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className={`p-2 rounded-md ${alert.is_read ? 'bg-[rgba(255,255,255,0.02)]' : 'bg-[rgba(255,188,75,0.12)]'}`}>
                        <FiBell className="w-5 h-5 text-[var(--accent)]" aria-hidden />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{alert.type}</div>
                        <div className="text-sm text-[var(--text-secondary)] mt-1">{alert.message}</div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">{new Date(alert.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {!alert.is_read ? (
                        <button
                          onClick={() => markRead(alert.id)}
                          aria-label={`Mark alert ${alert.id} as read`}
                          className="px-3 py-1 rounded-md bg-[var(--primary)] text-white text-sm hover:scale-[1.03] transition-transform"
                        >
                          Mark read
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)]">Read</span>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
