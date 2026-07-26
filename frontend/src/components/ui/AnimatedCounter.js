import React, { useEffect, useRef, useState } from 'react';

export default function AnimatedCounter({ value = 0, duration = 800, formatter }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const from = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    from.current = display;
    const start = performance.now();
    startRef.current = start;

    const step = (ts) => {
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from.current + (value - from.current) * eased);
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (formatter) return <span>{formatter(display)}</span>;
  return <span>{display.toLocaleString()}</span>;
}
