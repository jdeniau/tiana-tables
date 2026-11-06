import { type JSX, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { KeyboardShortcut, ShortcutModifier } from './KeyboardShortcut';

const meta: Meta<typeof KeyboardShortcut> = {
  component: KeyboardShortcut,
};

export default meta;
type Story = StoryObj<typeof KeyboardShortcut>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const SingleKey: Story = {
  args: {
    pressedKey: 'k',
  },
};

export const WithCmdOrCtrl: Story = {
  args: {
    pressedKey: 'k',
    modifier: ShortcutModifier.CmdOrCtrl,
  },
};

function OnMac(Story: () => JSX.Element): JSX.Element {
  window.isMac = true;

  useEffect(() => {
    // cleanup as `window` values are kept between stories
    return () => {
      window.isMac = false;
    };
  }, []);

  return <Story />;
}

export const WithCtrl: Story = {
  args: {
    pressedKey: 'g',
    modifier: ShortcutModifier.Ctrl,
  },
};

export const MacVersion: Story = {
  args: {
    pressedKey: 'k',
    modifier: ShortcutModifier.CmdOrCtrl,
  },
  decorators: [OnMac],
};

export const MacVersionWithCtrl: Story = {
  args: {
    pressedKey: 'g',
    modifier: ShortcutModifier.Ctrl,
  },
  decorators: [OnMac],
};
