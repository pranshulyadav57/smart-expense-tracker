import { useState, useEffect } from 'react';

/**
 * A custom React hook that debounces a value.
 * It is commonly used to delay an action (like an API call) until the user has
 * stopped typing for a predetermined amount of time.
 *
 * @template T
 * @param {T} value The value to be debounced (e.g., a search query string).
 * @param {number} delay The debounce delay in milliseconds.
 * @returns {T} The debounced value, which will only update after the `delay` has passed
 * without the original `value` changing.
 */
export default function useDebounce(value, delay) {
  // State to store the debounced value.
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(
    () => {
      // Set up a timer to update the debounced value after the specified delay.
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // Return a cleanup function that will be called before the effect runs again
      // if `value` or `delay` changes. This prevents the old timer from firing.
      return () => clearTimeout(handler);
    },
    [value, delay] // Only re-run the effect if value or delay changes.
  );

  return debouncedValue;
}