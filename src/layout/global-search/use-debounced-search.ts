import * as React from 'react';

/**
 * Shared hook for debounced search input.
 * Mirrors store value in local state and writes back on a delay.
 */
export function useDebouncedSearch(
  storeValue: string,
  setStoreValue: (val: string) => void,
  delay = 200,
) {
  const [localVal, setLocalVal] = React.useState(storeValue);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setLocalVal(storeValue);
  }, [storeValue]);

  const handleChange = (val: string) => {
    setLocalVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setStoreValue(val), delay);
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { localVal, handleChange };
}
