import type { Meta, StoryObj } from '@storybook/react';
import { RawSqlEditor } from './RawSqlEditor';

const meta: Meta<typeof RawSqlEditor> = {
  component: RawSqlEditor,
};

export default meta;
type Story = StoryObj<typeof RawSqlEditor>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  args: {
    defaultValue: `SELECT *
FROM employe -- test comment
LIMIT 10;`,
  },
};

// export const Edit: Story = {
//   args: {
//     connection: {
//       name: 'test',
//       host: 'localhost',
//       port: 3307,
//       user: 'test-user',
//       password: '',
//     },
//   },
// };
