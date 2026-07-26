import React from 'react';
import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`backdrop-blur-md border border-solid border-[var(--border)] bg-[var(--glass)] rounded-[var(--radius)] shadow-2xl p-4 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
