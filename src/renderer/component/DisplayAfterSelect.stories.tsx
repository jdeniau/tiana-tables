import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import DisplayAfterSelect from './DisplayAfterSelect';

const meta: Meta<typeof DisplayAfterSelect> = {
  component: DisplayAfterSelect,
  args: {
    columnName: 'lastname',
    columns: ['id', 'firstname', 'lastname', 'email', 'created_at'],
    displayAfter: null,
    pinned: false,
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

/** a column of the primary key cannot be moved, even when an order was stored for it */
export const PrimaryKey: Story = {
  args: { columnName: 'id', displayAfter: 'email', pinned: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('combobox')).toBeDisabled();
    await expect(canvas.getByText('First (primary key)')).toBeVisible();
    await expect(canvas.queryByText('email')).toBeNull();
  },
};
