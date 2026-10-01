import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import DisplayAfterSelect from './DisplayAfterSelect';

const meta: Meta<typeof DisplayAfterSelect> = {
  component: DisplayAfterSelect,
  args: {
    columnName: 'lastname',
    columns: ['id', 'firstname', 'lastname', 'email', 'created_at'],
    displayAfter: null,
    movedByKey: false,
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

/** the key columns lead the grid, so the column does not land where it was asked */
export const MovedByKey: Story = {
  args: { columnName: 'id', displayAfter: 'email', movedByKey: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label =
      'The primary key columns are shown first: this column does not come right after the one chosen';

    // in view without a hover, and explained on one
    const icon = canvas.getByRole('img', { name: label });
    await expect(icon).toBeVisible();

    await userEvent.hover(icon);

    // the tooltip fades in
    await waitFor(() =>
      expect(
        within(document.body).getByRole('tooltip', { name: label })
      ).toBeVisible()
    );
  },
};
