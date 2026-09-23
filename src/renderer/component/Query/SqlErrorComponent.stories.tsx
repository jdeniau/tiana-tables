import type { Meta, StoryObj } from '@storybook/react';
import SqlErrorComponent from './SqlErrorComponent';

const meta: Meta<typeof SqlErrorComponent> = {
  component: SqlErrorComponent,
};

export default meta;

type Story = StoryObj<typeof SqlErrorComponent>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const SqlError: Story = {
  args: {
    error: {
      name: 'Error',
      message: "Table 'shop.nope' doesn't exist",
      kind: 'sql',
      code: 'ER_NO_SUCH_TABLE',
      errno: 1146,
      sqlState: '42S02',
    },
  },
};
