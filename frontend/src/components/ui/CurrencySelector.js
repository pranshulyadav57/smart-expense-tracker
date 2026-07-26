import React, { useEffect, useState } from 'react';
import { CURRENCIES, getPreferredCurrency, setPreferredCurrency } from '../../utils/formatCurrency';

export default function CurrencySelector({ onChange }) {
  const [curr, setCurr] = useState(getPreferredCurrency());

  useEffect(() => { onChange && onChange(curr); }, [curr, onChange]);

  const handle = (e) => {
    const val = e.target.value;
    setCurr(val);
    setPreferredCurrency(val);
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      <span className="sr-only">Select currency</span>
      <select aria-label="Currency selector" value={curr} onChange={handle} className="bg-[var(--surface)] rounded-md px-2 py-1">
        {Object.keys(CURRENCIES).map(k => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
    </label>
  );
}
