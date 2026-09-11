import type { Meta, StoryObj } from '@storybook/react';
import DisplayAfterSelect from './DisplayAfterSelect';

const meta: Meta<typeof DisplayAfterSelect> = {
  component: DisplayAfterSelect,
  args: {
    columnName: 'lastname',
    columns: ['id', 'firstname', 'lastname', 'email', 'created_at'],
    displayAfter: null,
    onChange: (columnName, displayAfter) => {
      console.log(columnName, displayAfter);
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 16, width: 220 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DisplayAfterSelect>;

/** the column has not been moved: it sits where the database puts it */
export const Default: Story = {};

/** the column was moved after another one */
export const Moved: Story = {
  args: { displayAfter: 'email' },
};
