/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import AppMenuButton from './AppMenuButton';

// tells React this environment wraps its updates in `act`
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test('opening the menu leaves the focus where it was, for the menu to act on', () => {
  window.isMac = false;
  // @ts-expect-error there is no main process here to open a menu
  window.titleBar = { openMenu: vi.fn() };

  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<AppMenuButton />));

  const mousedown = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
  });
  container.querySelector('button')?.dispatchEvent(mousedown);

  expect(mousedown.defaultPrevented).toBe(true);

  act(() => root.unmount());
  container.remove();
});
