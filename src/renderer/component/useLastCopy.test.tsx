/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { RowFormat } from './CellContextMenu/rowFormats';
import { useLastCopy } from './useLastCopy';
import type { RowsCopied } from './useRowsCopy';

// tells React this environment wraps its updates in `act`
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test('holds the last copy for 2.6 seconds, counted from the latest', () => {
  vi.useFakeTimers();
  let state: [RowsCopied | null, (copied: RowsCopied) => void] = [
    null,
    () => {},
  ];

  function Probe(): null {
    state = useLastCopy();

    return null;
  }

  const root = createRoot(document.createElement('div'));
  act(() => root.render(<Probe />));

  act(() => state[1]({ rowCount: 3, format: RowFormat.Tsv }));
  act(() => vi.advanceTimersByTime(2000));
  act(() => state[1]({ rowCount: 1, format: RowFormat.Csv }));
  act(() => vi.advanceTimersByTime(2000));

  expect(state[0]).toEqual({ rowCount: 1, format: RowFormat.Csv });

  act(() => vi.advanceTimersByTime(600));

  expect(state[0]).toBeNull();

  act(() => root.unmount());
  vi.useRealTimers();
});
