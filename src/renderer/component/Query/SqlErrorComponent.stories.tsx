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
      message: 'Unable to connect to the database "test"',
      errno: 42,
      code: 'ERR_SOME_ERROR',
      sql: 'SQL',
      sqlMessage: 'SQL Message',
      sqlState: 'SQL State',
      name: 'Error Name',
    },
  },
};
