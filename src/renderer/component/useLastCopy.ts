import { useEffect, useRef, useState } from 'react';
import type { RowsCopied } from './useRowsCopy';

/** how long the region header says what was copied */
const SHOWN_MS = 2600;

/** The last copy of a grid's selection, for the region header to say for a moment, and what a grid calls once it copied. */
export function useLastCopy(): [
  RowsCopied | null,
  (copied: RowsCopied) => void,
] {
  const [copied, setCopied] = useState<RowsCopied | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const onCopied = (next: RowsCopied) => {
    clearTimeout(timeout.current);
    setCopied(next);
    timeout.current = setTimeout(() => setCopied(null), SHOWN_MS);
  };

  return [copied, onCopied];
}
