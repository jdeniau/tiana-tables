import { useEffect, useState } from 'react';

/** `value` once it has stayed the same for `waitMs`, the first one at once */
export function useDebouncedValue<T>(value: T, waitMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setSettled(value), waitMs);

    return () => clearTimeout(timeout);
  }, [value, waitMs]);

  return settled;
}
