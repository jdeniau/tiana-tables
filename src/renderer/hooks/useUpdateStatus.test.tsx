/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { UpdateStatus, UpdateStep } from '../../main-process/updateStatus';
import useUpdateStatus from './useUpdateStatus';

// tells React this environment wraps its updates in `act`
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  return JSON.stringify(useUpdateStatus());
}

test('follows what the main process sends after the first answer', async () => {
  let send: (status: UpdateStatus) => void = () => {};
  const unsubscribe = vi.fn();

  // @ts-expect-error there is no main process here to answer
  window.update = {
    check: () => Promise.resolve({ available: false }),
    onStatusChange: (callback: (status: UpdateStatus) => void) => {
      send = callback;

      return unsubscribe;
    },
  };

  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => root.render(<Probe />));
  expect(container.textContent).toBe('{"available":false}');

  act(() => send({ available: true, step: UpdateStep.Restart }));
  expect(container.textContent).toBe('{"available":true,"step":"restart"}');

  act(() => root.unmount());
  expect(unsubscribe).toHaveBeenCalledOnce();
});
