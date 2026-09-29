/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { DEFAULT_THEME } from '../../configuration/themes';
import { UpdateStatus, UpdateStep } from '../../main-process/updateStatus';
import UpdateDot from './UpdateDot';

// tells React this environment wraps its updates in `act`
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLElement;
let unmount: () => void;

beforeEach(() => {
  // @ts-expect-error there is no main process here to restart
  window.update = { restart: vi.fn() };
});

afterEach(() => {
  act(() => unmount());
  container.remove();
});

function render(updateStatus: UpdateStatus): void {
  container = document.createElement('div');
  document.body.append(container);

  const root = createRoot(container);

  act(() =>
    root.render(
      <ThemeProvider theme={DEFAULT_THEME}>
        <UpdateDot updateStatus={updateStatus} />
      </ThemeProvider>
    )
  );
  unmount = () => root.unmount();
}

const DOWNLOAD = {
  available: true,
  step: UpdateStep.Download,
  version: '1.3.0',
  releaseUrl: 'https://github.com/jdeniau/tiana-tables/releases/latest',
} as const;

test('a downloaded update restarts the app on a click', () => {
  render({ available: true, step: UpdateStep.Restart });

  const button = container.querySelector('button');

  expect(button?.getAttribute('aria-label')).toBe(
    'An update is downloaded — click to restart and install it.'
  );

  act(() => button?.click());

  expect(window.update.restart).toHaveBeenCalledOnce();
});

test('a version to download opens its release page outside the app', () => {
  render({ ...DOWNLOAD, installSource: 'appimage' });

  const link = container.querySelector('a');

  expect(link?.getAttribute('href')).toBe(
    'https://github.com/jdeniau/tiana-tables/releases/latest'
  );
  // a new window is what the main process hands to the system browser
  expect(link?.getAttribute('target')).toBe('_blank');
  expect(link?.getAttribute('aria-label')).toBe(
    'Version 1.3.0 is available — download the new AppImage from GitHub.'
  );
});

test('a store-managed install shows nothing', () => {
  render({ ...DOWNLOAD, installSource: 'flatpak' });

  expect(container.innerHTML).toBe('');
});
