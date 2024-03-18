import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { KeyboardShortcut } from './KeyboardShortcut';
// eslint-disable-next-line import/no-unresolved

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
    cmdOrCtrl: true,
  },
};

export const MacVersion: Story = {
  args: {
    pressedKey: 'k',
    cmdOrCtrl: true,
  },
  decorators: [
    (Story) => {
      window.isMac = true;

      useEffect(() => {
        // cleanup as `window` values are kept between stories
        return () => {
          window.isMac = false;
        };
      }, []);

      return <Story />;
    },
  ],
};
