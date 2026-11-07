import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { styled } from 'styled-components';
import { AppMenuItem, AppMenuItemKind } from '../../preload/titleBarChannel';
import AppMenuButton from './AppMenuButton';

const { Action, Separator, Submenu } = AppMenuItemKind;

/** the application menu as the main process describes it, on Linux */
const MENU: Array<AppMenuItem> = [
  {
    kind: Submenu,
    path: [0],
    label: 'File',
    enabled: true,
    items: [
      {
        kind: Action,
        path: [0, 0],
        label: 'Réglages…',
        accelerator: 'CmdOrCtrl+,',
        enabled: true,
      },
      { kind: Separator },
      {
        kind: Action,
        path: [0, 2],
        label: 'Quit',
        accelerator: 'CommandOrControl+Q',
        enabled: true,
      },
    ],
  },
  {
    kind: Submenu,
    path: [1],
    label: 'Naviguer',
    enabled: true,
    items: [
      {
        kind: Action,
        path: [1, 0],
        label: 'Précédent',
        accelerator: 'Alt+Left',
        enabled: true,
      },
      {
        kind: Action,
        path: [1, 1],
        label: 'Nouvelle connexion',
        accelerator: 'CmdOrCtrl+N',
        enabled: true,
      },
      {
        kind: Action,
        path: [1, 2],
        label: 'Panneau SQL',
        accelerator: 'CmdOrCtrl+T',
        enabled: false,
      },
    ],
  },
  {
    kind: Submenu,
    path: [2],
    label: 'View',
    enabled: true,
    items: [
      {
        kind: Action,
        path: [2, 0],
        label: 'Zoom In',
        accelerator: 'CommandOrControl+Plus',
        enabled: true,
      },
      { kind: Separator },
      {
        kind: Action,
        path: [2, 2],
        label: "Afficher la barre d'adresse",
        accelerator: null,
        enabled: true,
        checked: true,
      },
    ],
  },
];

const clickMenuItem = fn(async () => undefined);

const meta: Meta<typeof AppMenuButton> = {
  component: AppMenuButton,
  decorators: [
    (Story) => {
      const { titleBar } = window;

      clickMenuItem.mockClear();
      // Storybook has no main process: the menu is the one above
      window.titleBar = {
        ...titleBar,
        getMenu: async () => MENU,
        clickMenuItem,
      };

      return (
        <Frame>
          <Story />
        </Frame>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof AppMenuButton>;

/** Hovering a submenu opens it; its item clicks the application menu's own. */
export const Open: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Menu' }));

    const body = within(document.body);

    await userEvent.hover(await body.findByText('Naviguer'));
    await userEvent.click(await body.findByText('Nouvelle connexion'));

    await waitFor(() => expect(clickMenuItem).toHaveBeenCalledWith([1, 1]));
  },
};

const Frame = styled.div`
  height: 240px;
`;
