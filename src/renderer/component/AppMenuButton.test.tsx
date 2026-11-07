/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AppMenuItem, AppMenuItemKind } from '../../preload/titleBarChannel';
import AppMenuButton from './AppMenuButton';

// tells React this environment wraps its updates in `act`
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const MENU: Array<AppMenuItem> = [
  {
    kind: AppMenuItemKind.Action,
    path: [0],
    label: 'Settings',
    accelerator: 'CmdOrCtrl+,',
    enabled: true,
  },
  { kind: AppMenuItemKind.Separator },
  {
    kind: AppMenuItemKind.Action,
    path: [2],
    label: 'SQL panel',
    accelerator: 'CmdOrCtrl+T',
    enabled: false,
  },
  {
    kind: AppMenuItemKind.Submenu,
    path: [3],
    label: 'View',
    enabled: true,
    items: [],
  },
];

const titleBar = {
  getMenu: vi.fn(async () => MENU),
  clickMenuItem: vi.fn(async () => undefined),
};

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.clearAllMocks();
  window.isMac = false;
  // @ts-expect-error there is no main process here: only the menu channels
  window.titleBar = titleBar;

  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<AppMenuButton />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

function mouseDown(element: Element | null | undefined): MouseEvent {
  const event = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
  });
  element?.dispatchEvent(event);

  return event;
}

async function openMenu(): Promise<void> {
  await act(async () => {
    container.querySelector('button')?.click();
  });
}

function menuItem(label: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (item) => item.textContent?.includes(label)
  );
}

test('pressing the button leaves the focus where it was, for the menu to act on', () => {
  expect(mouseDown(container.querySelector('button')).defaultPrevented).toBe(
    true
  );
});

test('opens on the items of the application menu, read when it opens', async () => {
  expect(titleBar.getMenu).not.toHaveBeenCalled();

  await openMenu();

  expect(titleBar.getMenu).toHaveBeenCalledOnce();
  expect(menuItem('Settings')?.textContent).toBe('SettingsCtrl+,');
  expect(menuItem('SQL panel')?.getAttribute('aria-disabled')).toBe('true');
  expect(menuItem('View')).toBeDefined();
});

test('pressing an item leaves the focus where it was too', async () => {
  await openMenu();

  expect(mouseDown(menuItem('Settings')).defaultPrevented).toBe(true);
});

test('clicking an item clicks the application menu item at its path', async () => {
  await openMenu();

  await act(async () => {
    menuItem('Settings')?.click();
  });

  expect(titleBar.clickMenuItem).toHaveBeenCalledWith([0]);
});

test('clicking a disabled item does nothing', async () => {
  await openMenu();

  await act(async () => {
    menuItem('SQL panel')?.click();
  });

  expect(titleBar.clickMenuItem).not.toHaveBeenCalled();
});

test('no button on macOS, where the menu stays in the system bar', () => {
  window.isMac = true;
  act(() => root.render(<AppMenuButton key="mac" />));

  expect(container.querySelector('button')).toBeNull();
});
