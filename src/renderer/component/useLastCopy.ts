import { useEffect, useRef, useState } from 'react';
import type { RowsCopied } from './useRowsCopy';

/** how long the region header says what was copied */
const SHOWN_MS = 2600;

/** The last copy of a grid's selection, or of anything else, for a region to say for a moment, and what to call once it copied. */
export function useLastCopy<Copied = RowsCopied>(): [
  Copied | null,
  (copied: Copied) => void,
] {
  const [copied, setCopied] = useState<Copied | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const onCopied = (next: Copied) => {
    clearTimeout(timeout.current);
    setCopied(next);
    timeout.current = setTimeout(() => setCopied(null), SHOWN_MS);
  };

  return [copied, onCopied];
}
