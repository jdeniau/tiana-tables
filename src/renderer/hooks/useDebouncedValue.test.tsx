/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

// tells React this environment wraps its updates in `act`
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const WAIT_MS = 300;

function Probe({ value }: { value: string }) {
  return useDebouncedValue(value, WAIT_MS);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('answers the first value at once, then the last one after a pause', () => {
  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => root.render(<Probe value="3" />));
  expect(container.textContent).toBe('3');

  act(() => root.render(<Probe value="32" />));
  act(() => vi.advanceTimersByTime(WAIT_MS - 1));
  act(() => root.render(<Probe value="320" />));
  act(() => vi.advanceTimersByTime(WAIT_MS - 1));
  // each change restarts the wait: nothing settled yet
  expect(container.textContent).toBe('3');

  act(() => vi.advanceTimersByTime(1));
  expect(container.textContent).toBe('320');

  act(() => root.unmount());
});
