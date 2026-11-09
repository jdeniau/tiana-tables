import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';
import { afterEach, describe, expect, test, vi } from 'vitest';

const platform = vi.hoisted(() => ({ isMac: false }));

vi.mock('electron', () => ({
  // the template itself, which is what the labels are read from
  Menu: { buildFromTemplate: (template: unknown) => template },
  app: { name: 'Tiana Tables' },
  ipcMain: { on: vi.fn() },
  shell: {},
}));

vi.mock('./helpers', () => ({
  isMacPlatform: () => platform.isMac,
  isDevApp: () => false,
}));

vi.mock('../sql', () => ({ default: {} }));

type Item = MenuItemConstructorOptions;

/** `isMac` is read when the module loads */
async function buildMenu(
  isMac: boolean,
  language: string
): Promise<Array<Item>> {
  platform.isMac = isMac;
  vi.resetModules();
  const { changeLanguage } = await import('../i18n');
  await changeLanguage(language);
  const { createMenu } = await import('./menu');

  return createMenu({} as BrowserWindow) as unknown as Array<Item>;
}

const allItems = (items: Array<Item>): Array<Item> =>
  items.flatMap((item) => [
    item,
    ...(Array.isArray(item.submenu) ? allItems(item.submenu) : []),
  ]);

const labels = (items: Array<Item>): Array<string | undefined> =>
  items.filter(({ type }) => type !== 'separator').map(({ label }) => label);

const submenu = (items: Array<Item>, label: string): Array<Item> =>
  items.find((item) => item.label === label)?.submenu as Array<Item>;

afterEach(async () => {
  const { changeLanguage } = await import('../i18n');
  await changeLanguage('en');
});

describe.each([
  ['macOS', true],
  ['Linux and Windows', false],
])('on %s', (_, isMac) => {
  // a role keeps Electron's English label unless it is given one
  test('every item has a label of its own', async () => {
    const items = allItems(await buildMenu(isMac, 'fr'));
    // macOS labels the application menu with the app's name, whatever it is given
    const unlabelled = items.filter(
      ({ type, role, label }) =>
        type !== 'separator' && role !== 'appMenu' && !label
    );

    expect(unlabelled).toEqual([]);
  });
});

test('the menus are in the language of the app', async () => {
  const menu = await buildMenu(false, 'fr');

  expect(labels(menu)).toEqual([
    'Fichier',
    'Édition',
    'Naviguer',
    'Affichage',
    'Fenêtre',
    'Aide',
  ]);
  expect(labels(submenu(menu, 'Fichier'))).toEqual([
    'Réglages…',
    'Quitter Tiana Tables',
  ]);
  expect(labels(submenu(menu, 'Édition'))).toEqual([
    'Annuler',
    'Rétablir',
    'Couper',
    'Copier',
    'Coller',
    'Tout sélectionner',
  ]);
});

test('the window zoom is in the macOS menu only', async () => {
  const windowRoles = async (isMac: boolean) =>
    submenu(await buildMenu(isMac, 'en'), 'Window').map(({ role }) => role);

  expect(await windowRoles(false)).toEqual(['minimize', 'close']);
  expect(await windowRoles(true)).toContain('zoom');
});

test("macOS's application menu names the app", async () => {
  const [appMenu] = await buildMenu(true, 'fr');

  expect(labels(appMenu?.submenu as Array<Item>)).toEqual([
    'À propos de Tiana Tables',
    'Réglages…',
    'Services',
    'Masquer Tiana Tables',
    'Masquer les autres',
    'Tout afficher',
    'Quitter Tiana Tables',
  ]);
});
