export const CURRENCIES = {
  INR: { code: 'INR', locale: 'en-IN', symbol: '₹' },
  USD: { code: 'USD', locale: 'en-US', symbol: '$' },
};

const KEY = 'preferred_currency';

export function getPreferredCurrency() {
  try {
    return localStorage.getItem(KEY) || 'INR';
  } catch (e) {
    return 'INR';
  }
}

export function setPreferredCurrency(code) {
  try {
    localStorage.setItem(KEY, code);
  } catch (e) {
    // ignore
  }
}

export function formatCurrency(value = 0, currency = getPreferredCurrency()) {
  const cfg = CURRENCIES[currency] || CURRENCIES.INR;
  try {
    return new Intl.NumberFormat(cfg.locale, { style: 'currency', currency: cfg.code }).format(value);
  } catch (e) {
    // fallback
    return `₹{cfg.symbol}₹{Number(value || 0).toLocaleString()}`;
  }
}
