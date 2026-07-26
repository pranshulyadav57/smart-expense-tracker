import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

const studentItems = [
  { to: '/student', label: 'Dashboard', icon: <FiHome /> },
];

const businessItems = [
  { to: '/business', label: 'Dashboard', icon: <FiHome /> },
];

export default function Sidebar({ role }) {
  const [collapsed, setCollapsed] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  // If no explicit role prop is provided, infer from current pathname
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const effectiveRole = role || (pathname.startsWith('/business') ? 'business' : 'student');

  const handleLogout = () => {
    auth.logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`fixed md:relative left-0 top-16 md:top-0 bg-[var(--glass)] border-r border-[var(--border)] p-3 ${collapsed ? 'w-16' : 'w-56'} h-screen md:h-auto flex flex-col hidden md:flex transition-all duration-300 overflow-y-auto z-40`}>
      {/* Header - Logo and Collapse Button */}
      <div className={`flex ${collapsed ? 'justify-center' : 'items-center justify-between'} mb-6`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[var(--primary)]/20 flex items-center justify-center text-sm font-bold">S</div>
            <div className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">Smart Expense</div>
          </div>
        )}
        {collapsed && <div className="w-8 h-8 rounded-md bg-[var(--primary)]/20 flex items-center justify-center text-sm font-bold">S</div>}
        <button 
          aria-label="Toggle sidebar" 
          onClick={() => setCollapsed(c => !c)} 
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex flex-col space-y-1 flex-1">
        {(effectiveRole === 'business' ? businessItems : studentItems).map(i => (
          <NavLink
            key={i.to}
            to={i.to}
            className={({ isActive }) => `flex items-center gap-3 p-2 rounded-md hover:bg-[var(--surface)] transition-colors whitespace-nowrap ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-[var(--surface)] ring-1 ring-[var(--border)] text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}
            title={collapsed ? i.label : ''}
          >
            <span className="w-5 h-5 flex-shrink-0">{i.icon}</span>
            {!collapsed && <span className="text-sm flex-1">{i.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="mt-auto pt-6 border-t border-[var(--border)]">
        <button 
          onClick={handleLogout} 
          className={`w-full flex items-center gap-3 p-2 rounded-md text-sm bg-transparent hover:bg-[var(--surface)] transition-colors text-[var(--danger)] ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : ''}
        >
          <FiLogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
